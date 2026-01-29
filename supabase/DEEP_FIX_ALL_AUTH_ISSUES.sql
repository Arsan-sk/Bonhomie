-- ============================================================================
-- DEEP FIX: Check and fix ALL possible auth issues
-- Run this if users still get "Database error querying schema"
-- ============================================================================

-- ============================================================================
-- DIAGNOSTIC 1: Find auth.users WITHOUT auth.identities (causes login failure)
-- ============================================================================

SELECT 
    '1. AUTH USERS WITHOUT IDENTITIES' as issue,
    au.id,
    au.email,
    'Missing auth.identities record - LOGIN WILL FAIL' as problem
FROM auth.users au
LEFT JOIN auth.identities ai ON ai.user_id = au.id
WHERE ai.id IS NULL
  AND (au.email LIKE '%@aiktc.ac.in' OR au.email LIKE '%@gmail.com');

-- ============================================================================
-- DIAGNOSTIC 2: Find identities with mismatched provider_id
-- ============================================================================

SELECT 
    '2. IDENTITIES WITH WRONG provider_id' as issue,
    ai.id,
    ai.user_id,
    ai.provider_id,
    ai.user_id::text as should_be,
    'provider_id must equal user_id::text' as problem
FROM auth.identities ai
WHERE ai.provider_id != ai.user_id::text
  AND ai.provider = 'email';

-- ============================================================================
-- DIAGNOSTIC 3: Find profiles where is_admin_created is FALSE but IDs don't match
-- ============================================================================

SELECT 
    '3. PROFILES WITH ID MISMATCH' as issue,
    p.id as profile_id,
    p.auth_user_id,
    p.college_email,
    p.is_admin_created,
    'is_admin_created=FALSE but profile.id != auth_user_id - WILL CAUSE ERRORS' as problem
FROM profiles p
WHERE p.is_admin_created = FALSE
  AND p.auth_user_id IS NOT NULL
  AND p.id != p.auth_user_id;

-- ============================================================================
-- DIAGNOSTIC 4: Check for duplicate emails in auth.users
-- ============================================================================

SELECT 
    '4. DUPLICATE EMAILS IN AUTH.USERS' as issue,
    email,
    COUNT(*) as count
FROM auth.users
WHERE email LIKE '%@aiktc.ac.in' OR email LIKE '%@gmail.com'
GROUP BY email
HAVING COUNT(*) > 1;

-- ============================================================================
-- FIX 1: Create missing auth.identities for auth.users that don't have them
-- ============================================================================

DO $$
DECLARE
    missing_record RECORD;
    v_now timestamptz := now();
    v_count int := 0;
BEGIN
    RAISE NOTICE 'FIX 1: Creating missing auth.identities...';
    
    FOR missing_record IN 
        SELECT au.id, au.email
        FROM auth.users au
        LEFT JOIN auth.identities ai ON ai.user_id = au.id
        WHERE ai.id IS NULL
    LOOP
        BEGIN
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, provider_id,
                last_sign_in_at, created_at, updated_at
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
                missing_record.id::text,
                v_now, v_now, v_now
            );
            v_count := v_count + 1;
            RAISE NOTICE '✅ Created identity for: %', missing_record.email;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Error creating identity for %: %', missing_record.email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Created % missing identities', v_count;
END $$;

-- ============================================================================
-- FIX 2: Fix identities with wrong provider_id
-- ============================================================================

UPDATE auth.identities
SET provider_id = user_id::text
WHERE provider_id != user_id::text
  AND provider = 'email';

-- ============================================================================
-- FIX 3: Set is_admin_created = TRUE for all profiles with mismatched IDs
-- ============================================================================

UPDATE profiles
SET is_admin_created = TRUE
WHERE is_admin_created = FALSE
  AND auth_user_id IS NOT NULL
  AND id != auth_user_id;

-- Show how many were fixed
SELECT 
    'FIX 3 RESULT' as info,
    COUNT(*) as profiles_updated_to_admin_created
FROM profiles
WHERE is_admin_created = TRUE
  AND auth_user_id IS NOT NULL
  AND id != auth_user_id;

-- ============================================================================
-- FIX 4: Ensure all auth.users have correct required fields
-- ============================================================================

UPDATE auth.users
SET 
    instance_id = '00000000-0000-0000-0000-000000000000',
    aud = 'authenticated',
    role = 'authenticated',
    is_sso_user = FALSE,
    is_anonymous = FALSE
WHERE instance_id IS NULL 
   OR instance_id != '00000000-0000-0000-0000-000000000000'
   OR aud IS NULL 
   OR aud != 'authenticated'
   OR role IS NULL 
   OR role != 'authenticated'
   OR is_sso_user IS NULL
   OR is_sso_user = TRUE;

-- ============================================================================
-- FIX 5: Ensure email_confirmed_at is set (required for login)
-- ============================================================================

UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, created_at, now())
WHERE email_confirmed_at IS NULL;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

-- Check all auth issues are resolved
SELECT 
    'FINAL CHECK' as report,
    (SELECT COUNT(*) FROM auth.users au LEFT JOIN auth.identities ai ON ai.user_id = au.id WHERE ai.id IS NULL) as users_without_identity,
    (SELECT COUNT(*) FROM auth.identities WHERE provider_id != user_id::text AND provider = 'email') as wrong_provider_id,
    (SELECT COUNT(*) FROM profiles WHERE is_admin_created = FALSE AND auth_user_id IS NOT NULL AND id != auth_user_id) as id_mismatch_profiles,
    (SELECT COUNT(*) FROM auth.users WHERE email_confirmed_at IS NULL) as unconfirmed_emails,
    (SELECT COUNT(*) FROM auth.users WHERE instance_id != '00000000-0000-0000-0000-000000000000' OR aud != 'authenticated' OR role != 'authenticated') as wrong_auth_config;

-- Show sample of profiles with full auth status
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
