-- ============================================================================
-- NUCLEAR FIX: Ensure ALL auth records are 100% correct
-- This will fix the 500 "Database error querying schema" for everyone
-- ============================================================================

-- ============================================================================
-- STEP 1: Fix identity_data to include ALL required fields
-- Missing email in identity_data can cause 500 errors
-- ============================================================================

UPDATE auth.identities ai
SET identity_data = jsonb_build_object(
    'sub', ai.user_id::text,
    'email', au.email,
    'email_verified', true,
    'phone_verified', false
)
FROM auth.users au
WHERE ai.user_id = au.id
  AND ai.provider = 'email'
  AND (
    ai.identity_data IS NULL
    OR NOT (ai.identity_data ? 'email')
    OR NOT (ai.identity_data ? 'email_verified')
    OR ai.identity_data->>'email' IS NULL
    OR ai.identity_data->>'email' = ''
  );

-- ============================================================================
-- STEP 2: Fix provider_id to match user_id
-- ============================================================================

UPDATE auth.identities
SET provider_id = user_id::text
WHERE provider = 'email'
  AND provider_id != user_id::text;

-- ============================================================================
-- STEP 3: Ensure raw_app_meta_data is correct for all users
-- ============================================================================

UPDATE auth.users
SET raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'::jsonb
WHERE raw_app_meta_data IS NULL
   OR NOT (raw_app_meta_data ? 'provider')
   OR NOT (raw_app_meta_data ? 'providers');

-- ============================================================================
-- STEP 4: Ensure raw_user_meta_data is not NULL
-- ============================================================================

UPDATE auth.users
SET raw_user_meta_data = '{}'::jsonb
WHERE raw_user_meta_data IS NULL;

-- ============================================================================
-- STEP 5: Fix all required auth.users fields
-- ============================================================================

UPDATE auth.users
SET 
    instance_id = '00000000-0000-0000-0000-000000000000',
    aud = 'authenticated',
    role = 'authenticated',
    is_sso_user = FALSE,
    is_anonymous = FALSE,
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change = COALESCE(email_change, ''),
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    email_change_confirm_status = COALESCE(email_change_confirm_status, 0),
    reauthentication_token = COALESCE(reauthentication_token, '')
WHERE instance_id != '00000000-0000-0000-0000-000000000000'
   OR aud != 'authenticated'
   OR role != 'authenticated'
   OR is_sso_user != FALSE
   OR is_anonymous != FALSE
   OR email_confirmed_at IS NULL
   OR is_sso_user IS NULL
   OR is_anonymous IS NULL;

-- ============================================================================
-- STEP 6: Delete duplicate identities (keep the most recent one)
-- ============================================================================

DELETE FROM auth.identities a
USING auth.identities b
WHERE a.user_id = b.user_id
  AND a.provider = b.provider
  AND a.created_at < b.created_at;

-- ============================================================================
-- STEP 7: Set is_admin_created = TRUE for all profiles with auth_user_id
-- ============================================================================

UPDATE profiles
SET is_admin_created = TRUE
WHERE auth_user_id IS NOT NULL
  AND id != auth_user_id;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check 1: Users without identities
SELECT 
    'CHECK 1: Users without identities' as test,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM auth.users au
LEFT JOIN auth.identities ai ON ai.user_id = au.id
WHERE ai.id IS NULL;

-- Check 2: Wrong provider_id
SELECT 
    'CHECK 2: Wrong provider_id' as test,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM auth.identities
WHERE provider = 'email' AND provider_id != user_id::text;

-- Check 3: Missing email in identity_data
SELECT 
    'CHECK 3: Missing email in identity_data' as test,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM auth.identities
WHERE provider = 'email'
  AND (identity_data IS NULL OR NOT (identity_data ? 'email'));

-- Check 4: Wrong auth.users config
SELECT 
    'CHECK 4: Wrong auth.users config' as test,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM auth.users
WHERE instance_id != '00000000-0000-0000-0000-000000000000'
   OR aud != 'authenticated'
   OR role != 'authenticated'
   OR is_sso_user != FALSE
   OR email_confirmed_at IS NULL;

-- Check 5: Missing raw_app_meta_data
SELECT 
    'CHECK 5: Missing raw_app_meta_data' as test,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM auth.users
WHERE raw_app_meta_data IS NULL
   OR NOT (raw_app_meta_data ? 'provider');

-- Check 6: Duplicate identities
SELECT 
    'CHECK 6: Duplicate identities' as test,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM (
    SELECT user_id, provider, COUNT(*) as cnt
    FROM auth.identities
    GROUP BY user_id, provider
    HAVING COUNT(*) > 1
) dups;

-- Final summary
SELECT 
    'FINAL SUMMARY' as report,
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM auth.identities) as total_identities,
    (SELECT COUNT(*) FROM profiles) as total_profiles;

-- Sample to verify everything is correct
SELECT 
    'SAMPLE VERIFICATION' as check,
    au.email,
    au.instance_id = '00000000-0000-0000-0000-000000000000' as instance_ok,
    au.aud = 'authenticated' as aud_ok,
    au.role = 'authenticated' as role_ok,
    au.is_sso_user = FALSE as sso_ok,
    au.email_confirmed_at IS NOT NULL as confirmed_ok,
    ai.provider_id = au.id::text as provider_id_ok,
    ai.identity_data ? 'email' as identity_has_email
FROM auth.users au
JOIN auth.identities ai ON ai.user_id = au.id
LIMIT 10;

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'NUCLEAR FIX COMPLETED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All checks above should show ✅ PASS';
    RAISE NOTICE 'All users should now be able to login';
    RAISE NOTICE '========================================';
END $$;
