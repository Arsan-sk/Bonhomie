-- ============================================================================
-- COMPREHENSIVE FIX FOR ALL USERS - Database Error While Querying
-- ============================================================================
-- 
-- CONTEXT:
-- - Admin user works fine
-- - Users we manually fixed (23EC59, 23EC41, 23DS33) work fine
-- - Other users get "database error while querying"
--
-- WHAT WE DID FOR WORKING USERS:
-- 1. Ensured auth.users record exists with correct fields
-- 2. Ensured auth.identities record exists (CRITICAL for login)
-- 3. Set is_admin_created = TRUE on profile
-- 4. Set profile.auth_user_id = auth.users.id
--
-- THIS SCRIPT DOES THE SAME FOR ALL USERS
-- ============================================================================

-- ============================================================================
-- STEP 1: DIAGNOSIS - Find profiles with issues
-- ============================================================================

-- 1a. Profiles without auth.identities (even if they have auth.users)
SELECT 
    '1a. PROFILES WITHOUT IDENTITIES' as diagnosis,
    p.college_email,
    p.full_name,
    au.id as auth_user_id,
    '❌ Missing auth.identities - LOGIN WILL FAIL' as issue
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.auth_user_id OR au.id = p.id
LEFT JOIN auth.identities ai ON ai.user_id = au.id
WHERE au.id IS NOT NULL AND ai.id IS NULL
LIMIT 20;

-- 1b. Count of profiles missing identities
SELECT 
    '1b. COUNT MISSING IDENTITIES' as info,
    COUNT(*) as count
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.auth_user_id OR au.id = p.id
LEFT JOIN auth.identities ai ON ai.user_id = au.id
WHERE au.id IS NOT NULL AND ai.id IS NULL;

-- 1c. Profiles where is_admin_created should be TRUE but isn't
SELECT 
    '1c. PROFILES NEEDING is_admin_created=TRUE' as diagnosis,
    p.college_email,
    p.id as profile_id,
    p.auth_user_id,
    p.is_admin_created,
    'profile.id != auth_user_id but is_admin_created=FALSE' as issue
FROM profiles p
WHERE p.auth_user_id IS NOT NULL
  AND p.id != p.auth_user_id
  AND (p.is_admin_created = FALSE OR p.is_admin_created IS NULL)
LIMIT 20;

-- ============================================================================
-- STEP 2: FIX - Create missing auth.identities for ALL auth.users
-- This is the CRITICAL fix - login fails without identities
-- ============================================================================

DO $$
DECLARE
    missing_record RECORD;
    v_now timestamptz := now();
    v_count int := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FIX 1: Creating missing auth.identities';
    RAISE NOTICE '========================================';
    
    FOR missing_record IN 
        SELECT au.id, au.email
        FROM auth.users au
        LEFT JOIN auth.identities ai ON ai.user_id = au.id
        WHERE ai.id IS NULL
          AND au.email IS NOT NULL
    LOOP
        BEGIN
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
                missing_record.id,
                jsonb_build_object(
                    'sub', missing_record.id::text,
                    'email', missing_record.email,
                    'email_verified', true,
                    'phone_verified', false
                ),
                'email',
                missing_record.id::text,  -- CRITICAL: must equal user_id::text
                v_now,
                v_now,
                v_now
            );
            v_count := v_count + 1;
            RAISE NOTICE '✅ Created identity for: %', missing_record.email;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Error for %: %', missing_record.email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Created % missing identities', v_count;
END $$;

-- ============================================================================
-- STEP 3: FIX - Set is_admin_created = TRUE for profiles where IDs differ
-- This tells the app to use auth_user_id for lookups
-- ============================================================================

UPDATE profiles
SET is_admin_created = TRUE
WHERE auth_user_id IS NOT NULL
  AND id != auth_user_id
  AND (is_admin_created = FALSE OR is_admin_created IS NULL);

-- Show how many were updated
SELECT 
    '3. PROFILES UPDATED TO is_admin_created=TRUE' as info,
    COUNT(*) as count
FROM profiles
WHERE is_admin_created = TRUE
  AND auth_user_id IS NOT NULL
  AND id != auth_user_id;

-- ============================================================================
-- STEP 4: FIX - Ensure all auth.users have correct required fields
-- These must be set correctly for Supabase auth to work
-- ============================================================================

UPDATE auth.users
SET 
    instance_id = COALESCE(instance_id, '00000000-0000-0000-0000-000000000000'),
    aud = COALESCE(aud, 'authenticated'),
    role = COALESCE(role, 'authenticated'),
    is_sso_user = COALESCE(is_sso_user, FALSE),
    is_anonymous = COALESCE(is_anonymous, FALSE),
    email_confirmed_at = COALESCE(email_confirmed_at, created_at, now())
WHERE 
    instance_id IS NULL 
    OR instance_id != '00000000-0000-0000-0000-000000000000'
    OR aud IS NULL 
    OR aud != 'authenticated'
    OR role IS NULL 
    OR role != 'authenticated'
    OR is_sso_user IS NULL
    OR is_sso_user = TRUE
    OR is_anonymous IS NULL
    OR email_confirmed_at IS NULL;

-- ============================================================================
-- STEP 5: FIX - Ensure provider_id matches user_id in identities
-- This is CRITICAL - mismatched provider_id causes login failures
-- ============================================================================

UPDATE auth.identities
SET provider_id = user_id::text
WHERE provider = 'email'
  AND provider_id != user_id::text;

-- ============================================================================
-- STEP 6: VERIFICATION - Check everything is fixed
-- ============================================================================

SELECT 
    'FINAL STATUS' as report,
    (SELECT COUNT(*) FROM profiles) as total_profiles,
    (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%@aiktc.ac.in' OR email LIKE '%@gmail.com') as total_auth_users,
    (SELECT COUNT(*) FROM auth.users au LEFT JOIN auth.identities ai ON ai.user_id = au.id WHERE ai.id IS NULL) as users_without_identity,
    (SELECT COUNT(*) FROM profiles WHERE auth_user_id IS NOT NULL AND id != auth_user_id AND (is_admin_created = FALSE OR is_admin_created IS NULL)) as profiles_needing_flag_fix,
    (SELECT COUNT(*) FROM auth.identities WHERE provider = 'email' AND provider_id != user_id::text) as wrong_provider_id;

-- ============================================================================
-- STEP 7: Sample of fixed profiles
-- ============================================================================

SELECT 
    'SAMPLE PROFILES' as info,
    p.college_email,
    p.is_admin_created,
    au.id IS NOT NULL as has_auth_user,
    ai.id IS NOT NULL as has_identity,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    CASE WHEN ai.provider_id = au.id::text THEN '✅' ELSE '❌' END as provider_id_ok
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.auth_user_id OR (p.is_admin_created = FALSE AND au.id = p.id)
LEFT JOIN auth.identities ai ON ai.user_id = au.id
ORDER BY p.college_email
LIMIT 20;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FIX COMPLETED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Fixed the following issues:';
    RAISE NOTICE '1. Created missing auth.identities records';
    RAISE NOTICE '2. Set is_admin_created = TRUE where needed';
    RAISE NOTICE '3. Fixed auth.users required fields';
    RAISE NOTICE '4. Fixed provider_id mismatches';
    RAISE NOTICE '';
    RAISE NOTICE 'Check FINAL STATUS above:';
    RAISE NOTICE '  - users_without_identity should be 0';
    RAISE NOTICE '  - profiles_needing_flag_fix should be 0';
    RAISE NOTICE '  - wrong_provider_id should be 0';
    RAISE NOTICE '';
    RAISE NOTICE 'Users can now login with their college email';
    RAISE NOTICE 'Password is unchanged (or "password" for bulk-created)';
    RAISE NOTICE '========================================';
END $$;
