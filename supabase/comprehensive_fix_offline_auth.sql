-- ============================================
-- COMPREHENSIVE FIX - Offline Profile Auth Issues
-- Diagnoses and fixes all authentication problems
-- Date: January 29, 2026
-- ============================================

-- ⚠️ RUN THIS IN SUPABASE SQL EDITOR ONLY

-- ============================================
-- STEP 1: DIAGNOSE CURRENT STATE
-- ============================================

-- Check offline profiles
SELECT 
    'OFFLINE PROFILES STATUS' as section,
    COUNT(*) as total,
    COUNT(auth_user_id) as has_auth_link,
    COUNT(*) - COUNT(auth_user_id) as missing_auth_link
FROM profiles
WHERE is_admin_created = TRUE;

-- Check if auth users exist
SELECT 
    'AUTH USERS CHECK' as section,
    p.roll_number,
    p.full_name,
    p.college_email,
    p.auth_user_id,
    CASE 
        WHEN p.auth_user_id IS NOT NULL AND au.id IS NOT NULL THEN 'Auth user exists'
        WHEN p.auth_user_id IS NOT NULL AND au.id IS NULL THEN 'Auth user ID set but user missing'
        ELSE 'No auth user'
    END as auth_status,
    au.email as auth_email,
    au.email_confirmed_at
FROM profiles p
LEFT JOIN auth.users au ON au.id::text = p.auth_user_id::text
WHERE p.is_admin_created = TRUE
ORDER BY p.created_at DESC;

-- Check identities
SELECT 
    'IDENTITIES CHECK' as section,
    p.roll_number,
    p.auth_user_id,
    i.provider,
    i.provider_id,
    CASE 
        WHEN i.id IS NOT NULL THEN 'Identity exists'
        ELSE 'No identity'
    END as identity_status
FROM profiles p
LEFT JOIN auth.identities i ON i.user_id = p.auth_user_id
WHERE p.is_admin_created = TRUE
ORDER BY p.roll_number;

-- ============================================
-- STEP 2: CLEAN UP ANY BROKEN AUTH USERS
-- ============================================

-- Delete any orphaned auth users (users without profiles)
-- COMMENTED OUT FOR SAFETY - Uncomment if needed
-- DELETE FROM auth.identities
-- WHERE user_id IN (
--     SELECT au.id 
--     FROM auth.users au
--     LEFT JOIN profiles p ON p.auth_user_id = au.id
--     WHERE p.id IS NULL
--     AND au.email LIKE '%@aiktc.ac.in'
-- );

-- DELETE FROM auth.users
-- WHERE id IN (
--     SELECT au.id 
--     FROM auth.users au
--     LEFT JOIN profiles p ON p.auth_user_id = au.id
--     WHERE p.id IS NULL
--     AND au.email LIKE '%@aiktc.ac.in'
-- );

-- Reset auth_user_id for offline profiles to start fresh
UPDATE profiles
SET auth_user_id = NULL
WHERE is_admin_created = TRUE;

-- ============================================
-- STEP 3: CREATE FIXED FUNCTION WITH ALL REQUIRED FIELDS
-- ============================================

DROP FUNCTION IF EXISTS fix_offline_profiles_auth() CASCADE;

CREATE OR REPLACE FUNCTION fix_offline_profiles_auth()
RETURNS TABLE (
    profile_roll TEXT,
    profile_email TEXT,
    status TEXT,
    new_auth_id UUID,
    can_login BOOLEAN
) AS $$
DECLARE
    profile_rec RECORD;
    v_auth_user_id UUID;
    v_encrypted_pwd TEXT;
BEGIN
    -- Hash password using pgcrypto
    v_encrypted_pwd := crypt('Bonhomie@2026', gen_salt('bf'));
    
    -- Process each offline profile
    FOR profile_rec IN 
        SELECT id, roll_number, full_name, college_email, phone
        FROM profiles
        WHERE is_admin_created = TRUE
        ORDER BY roll_number
    LOOP
        BEGIN
            -- Check if email already has auth user
            SELECT id INTO v_auth_user_id
            FROM auth.users
            WHERE email = profile_rec.college_email
            LIMIT 1;
            
            IF v_auth_user_id IS NOT NULL THEN
                -- Link existing auth user
                UPDATE profiles
                SET auth_user_id = v_auth_user_id
                WHERE id = profile_rec.id;
                
                profile_roll := profile_rec.roll_number;
                profile_email := profile_rec.college_email;
                status := 'LINKED_EXISTING';
                new_auth_id := v_auth_user_id;
                can_login := TRUE;
                RETURN NEXT;
            ELSE
                -- Generate new UUID
                v_auth_user_id := gen_random_uuid();
                
                -- Create auth user with ALL required fields
                INSERT INTO auth.users (
                    instance_id,
                    id,
                    aud,
                    role,
                    email,
                    encrypted_password,
                    email_confirmed_at,
                    confirmation_sent_at,
                    recovery_sent_at,
                    email_change_sent_at,
                    last_sign_in_at,
                    raw_app_meta_data,
                    raw_user_meta_data,
                    is_super_admin,
                    created_at,
                    updated_at,
                    phone,
                    phone_confirmed_at,
                    phone_change,
                    phone_change_token,
                    phone_change_sent_at,
                    confirmed_at,
                    email_change,
                    email_change_token_current,
                    email_change_confirm_status,
                    banned_until,
                    reauthentication_token,
                    reauthentication_sent_at,
                    is_sso_user,
                    deleted_at
                ) VALUES (
                    '00000000-0000-0000-0000-000000000000',
                    v_auth_user_id,
                    'authenticated',
                    'authenticated',
                    profile_rec.college_email,
                    v_encrypted_pwd,
                    NOW(),
                    NOW(),
                    NULL,
                    NULL,
                    NULL,
                    jsonb_build_object(
                        'provider', 'email',
                        'providers', ARRAY['email']
                    ),
                    jsonb_build_object(
                        'full_name', profile_rec.full_name,
                        'roll_number', profile_rec.roll_number,
                        'email', profile_rec.college_email
                    ),
                    FALSE,
                    NOW(),
                    NOW(),
                    profile_rec.phone,
                    NULL,
                    '',
                    '',
                    NULL,
                    NOW(),
                    '',
                    '',
                    0,
                    NULL,
                    '',
                    NULL,
                    FALSE,
                    NULL
                );
                
                -- Create identity with ALL required fields
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
                    v_auth_user_id,
                    jsonb_build_object(
                        'sub', v_auth_user_id::text,
                        'email', profile_rec.college_email,
                        'email_verified', true,
                        'phone_verified', false,
                        'provider', 'email'
                    ),
                    'email',
                    v_auth_user_id::text,
                    NOW(),
                    NOW(),
                    NOW()
                );
                
                -- Link profile to auth user
                UPDATE profiles
                SET auth_user_id = v_auth_user_id,
                    updated_at = NOW()
                WHERE id = profile_rec.id;
                
                -- Log to audit
                INSERT INTO audit_logs (
                    action_type,
                    entity_type,
                    entity_id,
                    details
                ) VALUES (
                    'auth_user_created_retroactive',
                    'profile',
                    profile_rec.id,
                    jsonb_build_object(
                        'roll_number', profile_rec.roll_number,
                        'email', profile_rec.college_email,
                        'auth_user_id', v_auth_user_id,
                        'password', 'Bonhomie@2026',
                        'method', 'comprehensive_fix_script'
                    )
                );
                
                profile_roll := profile_rec.roll_number;
                profile_email := profile_rec.college_email;
                status := 'CREATED_NEW';
                new_auth_id := v_auth_user_id;
                can_login := TRUE;
                RETURN NEXT;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            profile_roll := profile_rec.roll_number;
            profile_email := profile_rec.college_email;
            status := 'ERROR: ' || SQLERRM;
            new_auth_id := NULL;
            can_login := FALSE;
            RETURN NEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: RUN THE FIX
-- ============================================

SELECT * FROM fix_offline_profiles_auth();

-- ============================================
-- STEP 5: VERIFY FIX WORKED
-- ============================================

-- Should show all profiles with auth users
SELECT 
    '=== VERIFICATION: PROFILES WITH AUTH ===' as section;

SELECT 
    p.roll_number,
    p.full_name,
    p.college_email,
    p.is_admin_created,
    p.auth_user_id,
    au.email as auth_email,
    au.encrypted_password IS NOT NULL as has_password,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    CASE 
        WHEN p.auth_user_id IS NOT NULL AND au.id IS NOT NULL THEN '✅ CAN LOGIN'
        ELSE '❌ CANNOT LOGIN'
    END as login_status
FROM profiles p
LEFT JOIN auth.users au ON au.id::text = p.auth_user_id::text
WHERE p.is_admin_created = TRUE
ORDER BY p.roll_number;

-- Count verification
SELECT 
    '=== COUNT VERIFICATION ===' as section;

SELECT 
    COUNT(*) as total_offline_profiles,
    COUNT(p.auth_user_id) as profiles_with_auth_link,
    COUNT(au.id) as auth_users_exist,
    COUNT(i.id) as identities_exist,
    CASE 
        WHEN COUNT(*) = COUNT(au.id) AND COUNT(*) = COUNT(i.id) THEN '✅ ALL FIXED'
        ELSE '❌ STILL ISSUES'
    END as overall_status
FROM profiles p
LEFT JOIN auth.users au ON au.id::text = p.auth_user_id::text
LEFT JOIN auth.identities i ON i.user_id = p.auth_user_id
WHERE p.is_admin_created = TRUE;

-- Get credentials list
SELECT 
    '=== LOGIN CREDENTIALS ===' as section;

SELECT 
    roll_number,
    full_name,
    college_email as email,
    'Bonhomie@2026' as password,
    '✅ Can login now' as status
FROM profiles
WHERE is_admin_created = TRUE
AND auth_user_id IS NOT NULL
ORDER BY roll_number;

-- ============================================
-- STEP 6: TEST LOGIN
-- ============================================

-- Instructions:
-- 1. Copy credentials from above query
-- 2. Go to your login page
-- 3. Try logging in with any of the emails and password: Bonhomie@2026
-- 4. Should work now!

-- ============================================
-- TROUBLESHOOTING QUERIES
-- ============================================

-- If login still fails, run these:

-- Check if password is properly hashed
SELECT 
    'PASSWORD CHECK' as section,
    au.email,
    LENGTH(au.encrypted_password) as password_length,
    au.encrypted_password LIKE '$2%' as is_bcrypt_hash
FROM auth.users au
WHERE au.email IN (
    SELECT college_email FROM profiles WHERE is_admin_created = TRUE
);

-- Check if identities have provider_id
SELECT 
    'IDENTITY CHECK' as section,
    i.provider,
    i.provider_id,
    i.provider_id IS NOT NULL as has_provider_id,
    au.email
FROM auth.identities i
JOIN auth.users au ON au.id = i.user_id
WHERE au.email IN (
    SELECT college_email FROM profiles WHERE is_admin_created = TRUE
);

-- Check auth.users structure
SELECT 
    'AUTH USER FIELDS' as section,
    email,
    role,
    aud,
    email_confirmed_at IS NOT NULL as email_confirmed,
    confirmed_at IS NOT NULL as confirmed,
    deleted_at IS NULL as not_deleted
FROM auth.users
WHERE email IN (
    SELECT college_email FROM profiles WHERE is_admin_created = TRUE
);

-- ============================================
-- CLEANUP (Run after verification)
-- ============================================

-- Drop the fix function (optional)
-- DROP FUNCTION IF EXISTS fix_offline_profiles_auth();

-- ============================================
-- SUCCESS MESSAGES
-- ============================================

SELECT '✅ SCRIPT COMPLETE!' as message;
SELECT '📧 All offline profiles should now be able to login' as status;
SELECT '🔑 Credentials: rollnumber@aiktc.ac.in / Bonhomie@2026' as instructions;
