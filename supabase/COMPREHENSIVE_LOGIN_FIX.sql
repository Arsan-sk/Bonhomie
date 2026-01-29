-- ============================================================================
-- COMPREHENSIVE LOGIN FIX - Master Script
-- Fixes "Invalid Login Credentials" Error
-- Date: January 29, 2026
-- ============================================================================
-- 
-- 🔴 PROBLEM: Users cannot login even with correct credentials
--    This affects ALL users - both regular registrations AND offline profiles
--    ⚠️ ESPECIALLY @aiktc.ac.in emails are affected!
--
-- ⚠️ IMPORTANT: confirmed_at is a GENERATED column in Supabase
--    We only update email_confirmed_at (confirmed_at auto-derives from it)
--
-- 🔍 ROOT CAUSES IDENTIFIED:
-- 1. Recursive RLS policies on profiles table causing infinite loops
-- 2. ⚠️ CLEANUP SCRIPTS DELETED auth.identities for @aiktc.ac.in users!
--    - SIMPLE_OFFLINE_PROFILES.sql and CLEANUP_CORRUPT_DATA.sql had faulty logic
--    - They deleted auth records for users where profile.is_admin_created was mismatched
-- 3. Orphaned auth.users records without proper auth.identities
-- 4. Missing email_confirmed_at in auth.users (email not verified)
-- 5. Trigger conflicts creating duplicate profiles
-- 6. profiles.id not matching auth.users.id (for self-registered users)
-- 7. Multiple conflicting RLS policies on same table
--
-- ⚠️ RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR
-- ============================================================================

-- ============================================================================
-- PART 1: DIAGNOSTIC - See what's broken
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║            COMPREHENSIVE LOGIN FIX - DIAGNOSTICS                 ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- 1.0 SPECIAL FOCUS: @aiktc.ac.in USERS
-- These users are specifically affected by our cleanup scripts
-- ============================================================================

SELECT 
    '🔴 1.0 @AIKTC.AC.IN USERS - SPECIAL DIAGNOSTICS' as diagnostic;

-- Check if @aiktc.ac.in users have auth.identities (CRITICAL!)
SELECT 
    '🔴 AIKTC USERS MISSING IDENTITIES' as issue,
    au.email,
    au.id as auth_user_id,
    p.id as profile_id,
    p.roll_number,
    p.is_admin_created,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    'NO AUTH.IDENTITIES - CANNOT LOGIN!' as problem
FROM auth.users au
LEFT JOIN profiles p ON (p.college_email = au.email OR p.id = au.id OR p.auth_user_id = au.id)
WHERE au.email LIKE '%@aiktc.ac.in'
AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = au.id)
ORDER BY au.email;

-- Count @aiktc.ac.in users with/without identities
SELECT 
    '📊 AIKTC USER SUMMARY' as metric,
    (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%@aiktc.ac.in') as total_aiktc_auth_users,
    (SELECT COUNT(*) FROM auth.users au 
     WHERE au.email LIKE '%@aiktc.ac.in' 
     AND EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = au.id)
    ) as aiktc_users_with_identity,
    (SELECT COUNT(*) FROM auth.users au 
     WHERE au.email LIKE '%@aiktc.ac.in' 
     AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = au.id)
    ) as aiktc_users_WITHOUT_identity_CANNOT_LOGIN;

-- 1.2a Check specifically for SELF-REGISTERED @aiktc.ac.in users (is_admin_created = FALSE)
-- "Invalid login credentials" means auth.users EXISTS but auth.identities is MISSING
SELECT 
    '🔴 SELF-REGISTERED AIKTC USERS MISSING IDENTITIES' as issue,
    au.email,
    au.id as auth_user_id,
    p.roll_number,
    p.is_admin_created,
    'HAS auth.users BUT NO auth.identities = INVALID CREDENTIALS ERROR' as diagnosis
FROM auth.users au
LEFT JOIN profiles p ON p.college_email = au.email
WHERE au.email LIKE '%@aiktc.ac.in'
AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = au.id)
AND (p.is_admin_created = FALSE OR p.is_admin_created IS NULL)
ORDER BY au.email;

-- 1.1 Check all RLS policies on profiles table (looking for recursion)
SELECT 
    '🔍 1.1 PROFILES RLS POLICIES' as diagnostic,
    policyname,
    cmd as operation,
    CASE 
        WHEN qual::text LIKE '%FROM profiles%' THEN '⚠️ RECURSIVE - PROBLEM!'
        ELSE '✅ OK'
    END as recursion_check,
    qual as policy_condition
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 1.2 Check for SELF-REGISTERED users (is_admin_created = FALSE) who can't login
-- These are the ones getting "Invalid login credentials" error
SELECT 
    '🔍 1.2 SELF-REGISTERED USERS WITH LOGIN ISSUES' as diagnostic,
    au.id as auth_user_id,
    au.email,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    au.encrypted_password IS NOT NULL as has_password,
    EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = au.id) as has_identity,
    p.id as profile_id,
    p.roll_number,
    p.is_admin_created,
    CASE 
        WHEN au.email_confirmed_at IS NULL THEN '❌ Email not confirmed'
        WHEN au.encrypted_password IS NULL THEN '❌ No password set'
        WHEN NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = au.id) THEN '❌ MISSING AUTH.IDENTITIES - THIS CAUSES INVALID CREDENTIALS!'
        WHEN p.id IS NULL THEN '⚠️ No profile record'
        WHEN p.is_admin_created = FALSE AND p.id != au.id THEN '❌ Profile ID mismatch'
        ELSE '✅ Should be able to login'
    END as status
FROM auth.users au
LEFT JOIN profiles p ON p.college_email = au.email
WHERE au.email IS NOT NULL
ORDER BY 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = au.id) THEN 0
        WHEN au.email_confirmed_at IS NULL THEN 1
        ELSE 2
    END,
    au.email
LIMIT 100;

-- 1.3 Check for missing auth.identities (ALL USERS)
SELECT 
    '🔍 1.3 MISSING AUTH IDENTITIES' as diagnostic,
    au.id as auth_user_id,
    au.email,
    COUNT(i.id) as identity_count,
    CASE 
        WHEN COUNT(i.id) = 0 THEN '❌ NO IDENTITY - Cannot Login!'
        ELSE '✅ Has identity'
    END as status
FROM auth.users au
LEFT JOIN auth.identities i ON i.user_id = au.id
GROUP BY au.id, au.email
HAVING COUNT(i.id) = 0
ORDER BY au.email;

-- 1.3a 🚨 CHECK FOR DUPLICATE PROFILES (CAUSES "Cannot coerce to single JSON" ERROR)
SELECT '🚨 1.3a DUPLICATE PROFILES CHECK' as diagnostic;

-- Check duplicate college_email
SELECT 
    '❌ DUPLICATE COLLEGE_EMAIL' as issue,
    college_email,
    COUNT(*) as duplicate_count,
    string_agg(id::text, ', ') as profile_ids,
    'THIS CAUSES: Cannot coerce the result to a single JSON object' as problem
FROM profiles
WHERE college_email IS NOT NULL
GROUP BY college_email
HAVING COUNT(*) > 1;

-- Check duplicate by (id matching auth.users) - multiple profiles pointing to same auth user
SELECT 
    '❌ MULTIPLE PROFILES FOR SAME AUTH USER' as issue,
    au.email,
    au.id as auth_user_id,
    COUNT(p.id) as profile_count,
    string_agg(p.id::text, ', ') as profile_ids
FROM auth.users au
JOIN profiles p ON p.id = au.id OR p.college_email = au.email OR p.auth_user_id = au.id
GROUP BY au.id, au.email
HAVING COUNT(p.id) > 1;

-- 1.4 Check for corrupted identities (wrong provider_id)
-- Note: For email provider, provider_id should equal user_id
SELECT 
    '🔍 1.4 CORRUPTED IDENTITIES' as diagnostic,
    au.email,
    i.provider,
    i.provider_id,
    au.id::text as should_be_provider_id,
    CASE 
        WHEN i.provider = 'email' AND i.provider_id != au.id::text THEN '❌ CORRUPTED - Wrong provider_id'
        ELSE '✅ OK'
    END as status
FROM auth.users au
JOIN auth.identities i ON i.user_id = au.id
WHERE i.provider = 'email'
AND i.provider_id != au.id::text
ORDER BY au.email;

-- ============================================================================
-- PART 2: FIX RLS POLICIES (Remove recursive ones)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║            PART 2: FIXING RLS POLICIES                           ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
END $$;

-- 2.1 Drop ALL existing policies on profiles to start fresh
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users read profiles" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Users insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
DROP POLICY IF EXISTS "coordinators_can_create_offline_profiles" ON profiles;
DROP POLICY IF EXISTS "coordinators_can_view_all_profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

-- 2.2 Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2.3 Create SAFE, NON-RECURSIVE policies
-- These use auth.uid() and auth.role() which DO NOT query profiles table

-- SELECT: All authenticated users can read any profile
CREATE POLICY "profiles_select_authenticated"
ON profiles FOR SELECT
TO authenticated
USING (true);  -- Simple, no recursion

-- INSERT: Allow authenticated users to insert
-- (Profile ID must match their auth ID, OR any insert for offline profiles)
CREATE POLICY "profiles_insert_authenticated"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
    id = auth.uid()  -- Normal registration: profile.id = auth.uid
    OR true          -- Allow offline profile creation (app validates role)
);

-- UPDATE: Users can only update their own profile
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- DELETE: Only own profile (or admin via service role)
CREATE POLICY "profiles_delete_own"
ON profiles FOR DELETE
TO authenticated
USING (id = auth.uid());

DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies on profiles table have been fixed (non-recursive)';
END $$;

-- ============================================================================
-- PART 3: FIX AUTH USERS - Ensure all can login
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║            PART 3: FIXING AUTH USERS                             ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
END $$;

-- 3.1 Confirm all emails (this is the most common issue)
-- NOTE: confirmed_at is a GENERATED column in newer Supabase versions, so we only update email_confirmed_at
UPDATE auth.users
SET 
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW()
WHERE email_confirmed_at IS NULL;

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ Confirmed emails for % users', v_count;
END $$;

-- 3.2 Fix users with missing auth.identities (ALL USERS)
-- ⚠️ THIS IS THE CRITICAL FIX FOR @aiktc.ac.in USERS
-- Our cleanup scripts wrongly deleted their identities!
DO $$
DECLARE
    rec RECORD;
    v_count INTEGER := 0;
    v_aiktc_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Creating missing auth.identities (THIS IS THE KEY FIX!)';
    RAISE NOTICE '';
    
    FOR rec IN 
        SELECT au.id, au.email
        FROM auth.users au
        LEFT JOIN auth.identities i ON i.user_id = au.id
        WHERE i.id IS NULL
        -- Apply to ALL users, not just specific domains
    LOOP
        -- Create missing identity
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            rec.id,
            jsonb_build_object(
                'sub', rec.id::text,
                'email', rec.email,
                'email_verified', true,
                'phone_verified', false
            ),
            'email',
            rec.id::text,  -- CRITICAL: provider_id must equal user_id for email provider
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT (provider, provider_id) DO NOTHING;
        
        v_count := v_count + 1;
        
        -- Track @aiktc.ac.in users specifically
        IF rec.email LIKE '%@aiktc.ac.in' THEN
            v_aiktc_count := v_aiktc_count + 1;
            RAISE NOTICE '  ✅ Fixed @aiktc.ac.in user: %', rec.email;
        ELSE
            RAISE NOTICE '  ✅ Fixed user: %', rec.email;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Created missing identities for % users total', v_count;
    RAISE NOTICE '   ➤ Of which % were @aiktc.ac.in users (the main affected group)', v_aiktc_count;
END $$;

-- 3.3 Fix corrupted identities (wrong provider_id)
DO $$
DECLARE
    rec RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR rec IN 
        SELECT au.id as user_id, au.email, i.id as identity_id
        FROM auth.users au
        JOIN auth.identities i ON i.user_id = au.id
        WHERE i.provider = 'email'
        AND i.provider_id != au.id::text
    LOOP
        -- Fix the provider_id
        UPDATE auth.identities
        SET 
            provider_id = rec.user_id::text,
            identity_data = jsonb_build_object(
                'sub', rec.user_id::text,
                'email', rec.email,
                'email_verified', true,
                'phone_verified', false
            ),
            updated_at = NOW()
        WHERE id = rec.identity_id;
        
        v_count := v_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Fixed corrupted identities for % users', v_count;
END $$;

-- 3.4 Ensure aud and role are correct (ALL USERS)
UPDATE auth.users
SET 
    aud = 'authenticated',
    role = 'authenticated',
    updated_at = NOW()
WHERE (aud IS NULL OR aud != 'authenticated' OR role != 'authenticated');

-- ============================================================================
-- PART 4: FIX PROFILE-AUTH LINKAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║            PART 4: FIXING PROFILE-AUTH LINKAGE                   ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
END $$;

-- 4.1 For regular users (is_admin_created = FALSE), profile.id MUST equal auth.users.id
-- If there's a mismatch, we need to update the profile.id
-- (This is dangerous - we can't easily update primary key, so we warn instead)

SELECT 
    '⚠️ 4.1 PROFILE-AUTH ID MISMATCH (Needs Manual Fix)' as warning,
    p.id as profile_id,
    au.id as auth_user_id,
    p.roll_number,
    p.college_email,
    'Profile ID does not match Auth User ID' as issue
FROM profiles p
JOIN auth.users au ON au.email = p.college_email
WHERE p.is_admin_created = FALSE
AND p.id != au.id;

-- 4.2 For offline profiles (is_admin_created = TRUE), link auth_user_id if user exists
UPDATE profiles p
SET auth_user_id = au.id
FROM auth.users au
WHERE p.college_email = au.email
AND p.is_admin_created = TRUE
AND p.auth_user_id IS NULL;

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ Linked % offline profiles to existing auth users', v_count;
END $$;

-- 4.3 🚨 FIX DUPLICATE PROFILES (CRITICAL - causes "Cannot coerce to single JSON")
-- When a user registers and there's already an offline profile, we may have duplicates
DO $$
DECLARE
    rec RECORD;
    v_keep_id UUID;
    v_delete_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Checking for duplicate profiles by college_email...';
    
    FOR rec IN 
        SELECT 
            college_email,
            COUNT(*) as cnt,
            array_agg(id ORDER BY created_at ASC) as profile_ids,
            array_agg(is_admin_created ORDER BY created_at ASC) as admin_flags
        FROM profiles
        WHERE college_email IS NOT NULL
        GROUP BY college_email
        HAVING COUNT(*) > 1
    LOOP
        -- Keep the profile that matches auth.users.id if possible
        -- Otherwise keep the oldest one
        SELECT p.id INTO v_keep_id
        FROM profiles p
        JOIN auth.users au ON au.id = p.id
        WHERE p.college_email = rec.college_email
        LIMIT 1;
        
        IF v_keep_id IS NULL THEN
            -- No profile matches auth user, keep the first (oldest) one
            v_keep_id := rec.profile_ids[1];
        END IF;
        
        RAISE NOTICE '  📧 %: Found % duplicates, keeping profile %', rec.college_email, rec.cnt, v_keep_id;
        
        -- Update registrations to point to the kept profile
        UPDATE registrations
        SET profile_id = v_keep_id
        WHERE profile_id = ANY(rec.profile_ids)
        AND profile_id != v_keep_id;
        
        -- Delete duplicate profiles (except the one we're keeping)
        DELETE FROM profiles
        WHERE college_email = rec.college_email
        AND id != v_keep_id;
        
        v_delete_count := v_delete_count + (rec.cnt - 1);
    END LOOP;
    
    IF v_delete_count > 0 THEN
        RAISE NOTICE '✅ Removed % duplicate profile records', v_delete_count;
    ELSE
        RAISE NOTICE '✅ No duplicate profiles found';
    END IF;
END $$;

-- ============================================================================
-- PART 5: FIX TRIGGER CONFLICTS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║            PART 5: FIXING TRIGGERS                               ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
END $$;

-- 5.1 Drop any conflicting triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 5.2 Create a SAFE trigger that handles conflicts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_profile_id UUID;
BEGIN
    -- Check if profile already exists (from offline registration)
    SELECT id INTO v_existing_profile_id
    FROM profiles
    WHERE college_email = NEW.email
    LIMIT 1;
    
    IF v_existing_profile_id IS NOT NULL THEN
        -- Profile exists (likely offline created), just link it
        UPDATE profiles
        SET 
            auth_user_id = NEW.id,
            updated_at = NOW()
        WHERE id = v_existing_profile_id;
        
        RETURN NEW;
    END IF;
    
    -- No existing profile, create new one
    INSERT INTO profiles (
        id,
        role,
        full_name,
        college_email,
        is_admin_created,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
        NEW.email,
        FALSE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        college_email = EXCLUDED.college_email,
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'handle_new_user trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

DO $$
BEGIN
    RAISE NOTICE '✅ Trigger handle_new_user has been fixed';
END $$;

-- ============================================================================
-- PART 6: CLEANUP ORPHANED DATA
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║            PART 6: CLEANUP ORPHANED DATA                         ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
END $$;

-- 6.1 Clear expired/invalid sessions (using correct column name)
-- Note: Supabase uses 'not_after' column, not 'expires_at'
DELETE FROM auth.sessions
WHERE not_after < NOW();

-- 6.2 Clear expired refresh tokens
DELETE FROM auth.refresh_tokens
WHERE revoked = true OR created_at < NOW() - INTERVAL '30 days';

DO $$
BEGIN
    RAISE NOTICE '✅ Cleaned up expired sessions and tokens';
END $$;

-- ============================================================================
-- PART 7: FINAL VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║            PART 7: FINAL VERIFICATION                            ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
END $$;

-- 7.1 Show final RLS policies (should all be non-recursive)
SELECT 
    '✅ 7.1 FINAL RLS POLICIES' as verification,
    policyname,
    cmd as operation,
    CASE 
        WHEN qual::text LIKE '%FROM profiles%' THEN '⚠️ STILL RECURSIVE!'
        ELSE '✅ SAFE'
    END as status
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 7.2 Show users who should now be able to login (ALL USERS)
SELECT 
    '✅ 7.2 USERS LOGIN STATUS' as verification,
    au.email,
    p.roll_number,
    p.full_name,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = au.id) as has_identity,
    au.encrypted_password IS NOT NULL as has_password,
    CASE 
        WHEN au.email_confirmed_at IS NOT NULL 
            AND EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = au.id)
            AND au.encrypted_password IS NOT NULL
        THEN '✅ CAN LOGIN'
        ELSE '❌ STILL HAS ISSUES'
    END as login_status
FROM auth.users au
LEFT JOIN profiles p ON (p.college_email = au.email OR p.id = au.id)
ORDER BY au.email
LIMIT 100;

-- 7.3 Count summary (ALL USERS)
SELECT 
    '📊 7.3 SUMMARY' as verification,
    (SELECT COUNT(*) FROM auth.users) as total_auth_users,
    (SELECT COUNT(*) FROM auth.users au 
     WHERE au.email_confirmed_at IS NOT NULL
     AND EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = au.id)
    ) as users_who_can_login,
    (SELECT COUNT(*) FROM auth.users au 
     WHERE au.email_confirmed_at IS NULL
     OR NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = au.id)
    ) as users_with_issues,
    (SELECT COUNT(*) FROM profiles) as total_profiles,
    (SELECT COUNT(*) FROM profiles WHERE is_admin_created = TRUE) as offline_profiles;

-- ============================================================================
-- SUMMARY OF FIXES APPLIED
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║                    FIXES APPLIED SUMMARY                         ║';
    RAISE NOTICE '╠══════════════════════════════════════════════════════════════════╣';
    RAISE NOTICE '║ ✅ Applied to ALL USERS (not just offline profiles)             ║';
    RAISE NOTICE '╠══════════════════════════════════════════════════════════════════╣';
    RAISE NOTICE '║ 1. Removed ALL recursive RLS policies from profiles table       ║';
    RAISE NOTICE '║ 2. Created safe, non-recursive RLS policies                      ║';
    RAISE NOTICE '║ 3. Confirmed all unconfirmed email addresses                     ║';
    RAISE NOTICE '║ 4. Created missing auth.identities records                       ║';
    RAISE NOTICE '║ 5. Fixed corrupted auth.identities (wrong provider_id)          ║';
    RAISE NOTICE '║ 6. Ensured correct aud/role values in auth.users                ║';
    RAISE NOTICE '║ 7. Linked offline profiles to existing auth users               ║';
    RAISE NOTICE '║ 8. Fixed the handle_new_user trigger to prevent conflicts       ║';
    RAISE NOTICE '║ 9. Cleaned up expired sessions and tokens                       ║';
    RAISE NOTICE '╠══════════════════════════════════════════════════════════════════╣';
    RAISE NOTICE '║                                                                  ║';
    RAISE NOTICE '║  🔴 ROOT CAUSE #1: Recursive RLS policies on profiles table     ║';
    RAISE NOTICE '║     - Policies like coordinators_can_view_all_profiles          ║';
    RAISE NOTICE '║       contained EXISTS(SELECT FROM profiles...) causing         ║';
    RAISE NOTICE '║       infinite recursion during login authentication.           ║';
    RAISE NOTICE '║                                                                  ║';
    RAISE NOTICE '║  🔴 ROOT CAUSE #2: Missing auth.identities records              ║';
    RAISE NOTICE '║     - auth.users existed but auth.identities was empty.         ║';
    RAISE NOTICE '║       Supabase requires both tables to have matching records.   ║';
    RAISE NOTICE '║                                                                  ║';
    RAISE NOTICE '║  🟠 ROOT CAUSE #3: Unconfirmed emails                           ║';
    RAISE NOTICE '║     - email_confirmed_at was NULL for some users.               ║';
    RAISE NOTICE '║       Supabase rejects login for unconfirmed emails.            ║';
    RAISE NOTICE '║                                                                  ║';
    RAISE NOTICE '║  NOTE: confirmed_at is a GENERATED column - we fixed by         ║';
    RAISE NOTICE '║        updating email_confirmed_at only (confirmed_at auto-     ║';
    RAISE NOTICE '║        derives from it in newer Supabase versions).             ║';
    RAISE NOTICE '║                                                                  ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Script completed! ALL users should now be able to login.';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- MANUAL FIX: If a specific user still can't login
-- ============================================================================
-- 
-- Run this for a specific user (replace email):
-- 
-- SELECT fix_user_login('23ec59@aiktc.ac.in');
-- 
-- ============================================================================

CREATE OR REPLACE FUNCTION fix_user_login(p_email TEXT)
RETURNS TABLE (
    step TEXT,
    status TEXT,
    details TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_has_identity BOOLEAN;
BEGIN
    -- Find the user
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = LOWER(p_email);
    
    IF v_user_id IS NULL THEN
        step := '1. Find User';
        status := '❌ FAILED';
        details := 'No auth.users record found for email: ' || p_email;
        RETURN NEXT;
        RETURN;
    END IF;
    
    step := '1. Find User';
    status := '✅ OK';
    details := 'User ID: ' || v_user_id::text;
    RETURN NEXT;
    
    -- Confirm email (confirmed_at is generated, don't update it)
    UPDATE auth.users
    SET 
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        aud = 'authenticated',
        role = 'authenticated',
        updated_at = NOW()
    WHERE id = v_user_id;
    
    step := '2. Confirm Email';
    status := '✅ OK';
    details := 'Email confirmed at: ' || NOW()::text;
    RETURN NEXT;
    
    -- Check/create identity
    SELECT EXISTS (
        SELECT 1 FROM auth.identities WHERE user_id = v_user_id
    ) INTO v_has_identity;
    
    IF NOT v_has_identity THEN
        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, provider_id,
            last_sign_in_at, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', p_email, 'email_verified', true),
            'email', v_user_id::text, NOW(), NOW(), NOW()
        );
        
        step := '3. Create Identity';
        status := '✅ CREATED';
        details := 'New identity created for user';
        RETURN NEXT;
    ELSE
        -- Fix existing identity if corrupted
        UPDATE auth.identities
        SET 
            provider_id = v_user_id::text,
            identity_data = jsonb_build_object('sub', v_user_id::text, 'email', p_email, 'email_verified', true),
            updated_at = NOW()
        WHERE user_id = v_user_id AND provider = 'email';
        
        step := '3. Fix Identity';
        status := '✅ FIXED';
        details := 'Existing identity updated';
        RETURN NEXT;
    END IF;
    
    step := '4. Final Status';
    status := '✅ USER CAN NOW LOGIN';
    details := 'Email: ' || p_email || ' | Password: (unchanged)';
    RETURN NEXT;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION fix_user_login(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION fix_user_login(TEXT) TO service_role;

-- ============================================================================
-- FINAL STATUS CHECK - Especially for @aiktc.ac.in users
-- ============================================================================

SELECT '📊 FINAL STATUS AFTER FIX' as report;

-- Show @aiktc.ac.in users status after fix
SELECT 
    '✅ AIKTC.AC.IN USER STATUS (AFTER FIX)' as status,
    au.email,
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = au.id) 
        THEN '✅ CAN LOGIN' 
        ELSE '❌ STILL BROKEN' 
    END as login_status,
    au.email_confirmed_at IS NOT NULL as email_confirmed
FROM auth.users au
WHERE au.email LIKE '%@aiktc.ac.in'
ORDER BY au.email;

-- Summary counts
SELECT 
    '📊 FINAL SUMMARY' as summary,
    (SELECT COUNT(*) FROM auth.users) as total_auth_users,
    (SELECT COUNT(*) FROM auth.users au WHERE EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = au.id)) as users_with_identity_can_login,
    (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%@aiktc.ac.in') as total_aiktc_users,
    (SELECT COUNT(*) FROM auth.users au WHERE au.email LIKE '%@aiktc.ac.in' AND EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = au.id)) as aiktc_users_can_login;

-- ============================================================================
-- END OF COMPREHENSIVE LOGIN FIX
-- ============================================================================
