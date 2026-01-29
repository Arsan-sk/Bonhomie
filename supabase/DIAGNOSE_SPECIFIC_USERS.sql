-- ============================================================================
-- DIAGNOSE SPECIFIC USERS - Login Issues Investigation
-- Date: January 29, 2026
-- Users: 23ec59@aiktc.ac.in, 23ds33@aiktc.ac.in
-- ============================================================================

-- ============================================================================
-- 1. CHECK AUTH.USERS TABLE
-- ============================================================================
SELECT 
    '🔍 1. AUTH.USERS TABLE' as section,
    au.id as auth_user_id,
    au.email,
    au.encrypted_password IS NOT NULL as has_password,
    LENGTH(au.encrypted_password) as password_hash_length,
    LEFT(au.encrypted_password, 20) as password_hash_preview,
    au.email_confirmed_at,
    au.created_at,
    au.updated_at,
    au.last_sign_in_at,
    au.aud,
    au.role as auth_role,
    au.raw_user_meta_data,
    au.raw_app_meta_data
FROM auth.users au
WHERE au.email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in')
ORDER BY au.email;

-- ============================================================================
-- 2. CHECK AUTH.IDENTITIES TABLE (CRITICAL FOR LOGIN!)
-- ============================================================================
SELECT 
    '🔍 2. AUTH.IDENTITIES TABLE' as section,
    au.email,
    i.id as identity_id,
    i.user_id,
    i.provider,
    i.provider_id,
    i.identity_data,
    i.created_at as identity_created,
    i.last_sign_in_at as identity_last_signin,
    CASE 
        WHEN i.id IS NULL THEN '❌ NO IDENTITY - CANNOT LOGIN!'
        WHEN i.provider != 'email' THEN '⚠️ Wrong provider'
        WHEN i.provider_id != au.id::text THEN '❌ PROVIDER_ID MISMATCH!'
        ELSE '✅ OK'
    END as identity_status
FROM auth.users au
LEFT JOIN auth.identities i ON i.user_id = au.id
WHERE au.email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in')
ORDER BY au.email;

-- ============================================================================
-- 3. CHECK PROFILES TABLE
-- ============================================================================
SELECT 
    '🔍 3. PROFILES TABLE' as section,
    p.id as profile_id,
    p.college_email,
    p.roll_number,
    p.full_name,
    p.role as profile_role,
    p.is_admin_created,
    p.auth_user_id,
    p.created_at,
    p.updated_at
FROM profiles p
WHERE p.college_email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in')
ORDER BY p.college_email;

-- ============================================================================
-- 4. CHECK IF PROFILE.ID MATCHES AUTH.USERS.ID (Critical for self-registered)
-- ============================================================================
SELECT 
    '🔍 4. PROFILE-AUTH ID COMPARISON' as section,
    p.college_email,
    p.id as profile_id,
    au.id as auth_user_id,
    p.auth_user_id as profile_auth_user_id_link,
    p.is_admin_created,
    CASE 
        WHEN p.id = au.id THEN '✅ profile.id = auth.users.id (Normal)'
        WHEN p.auth_user_id = au.id THEN '✅ profile.auth_user_id = auth.users.id (Offline linked)'
        WHEN p.is_admin_created = TRUE AND p.auth_user_id IS NULL THEN '⚠️ Offline profile NOT linked to auth'
        WHEN p.is_admin_created = FALSE AND p.id != au.id THEN '❌ ID MISMATCH - PROBLEM!'
        ELSE '⚠️ Unknown state'
    END as linkage_status
FROM profiles p
JOIN auth.users au ON au.email = p.college_email
WHERE p.college_email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in')
ORDER BY p.college_email;

-- ============================================================================
-- 5. CHECK FOR DUPLICATE PROFILES
-- ============================================================================
SELECT 
    '🔍 5. DUPLICATE CHECK' as section,
    college_email,
    COUNT(*) as profile_count,
    string_agg(id::text, ', ') as all_profile_ids,
    string_agg(is_admin_created::text, ', ') as admin_created_flags
FROM profiles
WHERE college_email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in')
GROUP BY college_email
HAVING COUNT(*) >= 1;

-- ============================================================================
-- 6. COMPREHENSIVE STATUS SUMMARY
-- ============================================================================
SELECT 
    '📊 6. SUMMARY STATUS' as section,
    au.email,
    CASE WHEN au.id IS NOT NULL THEN '✅' ELSE '❌' END as has_auth_user,
    CASE WHEN au.encrypted_password IS NOT NULL THEN '✅' ELSE '❌' END as has_password,
    CASE WHEN au.email_confirmed_at IS NOT NULL THEN '✅' ELSE '❌' END as email_confirmed,
    CASE WHEN i.id IS NOT NULL THEN '✅' ELSE '❌' END as has_identity,
    CASE WHEN i.provider = 'email' AND i.provider_id = au.id::text THEN '✅' ELSE '❌' END as identity_correct,
    CASE WHEN p.id IS NOT NULL THEN '✅' ELSE '❌' END as has_profile,
    CASE 
        WHEN au.id IS NULL THEN '❌ No auth.users record'
        WHEN au.encrypted_password IS NULL THEN '❌ No password set'
        WHEN au.email_confirmed_at IS NULL THEN '❌ Email not confirmed'
        WHEN i.id IS NULL THEN '❌ NO AUTH.IDENTITIES - THIS IS WHY LOGIN FAILS!'
        WHEN i.provider_id != au.id::text THEN '❌ Identity provider_id mismatch'
        WHEN p.id IS NULL THEN '⚠️ No profile (but can still login)'
        ELSE '✅ Should be able to login'
    END as diagnosis
FROM auth.users au
LEFT JOIN auth.identities i ON i.user_id = au.id
LEFT JOIN profiles p ON p.college_email = au.email
WHERE au.email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in')
ORDER BY au.email;

-- ============================================================================
-- 7. SHOW WHAT PASSWORD WAS SET (if we used a function)
-- Check if there are any records in audit_logs or if password was set by us
-- ============================================================================
SELECT 
    '🔍 7. PASSWORD INFO' as section,
    au.email,
    au.encrypted_password IS NOT NULL as has_encrypted_password,
    -- Password hash starts with '$2a$' for bcrypt
    CASE 
        WHEN au.encrypted_password LIKE '$2a$%' THEN 'bcrypt hash'
        WHEN au.encrypted_password LIKE '$argon2%' THEN 'argon2 hash'
        ELSE 'unknown format'
    END as password_format,
    au.raw_user_meta_data->>'password_hint' as password_hint_if_any,
    -- Check if password was set during offline profile creation
    CASE 
        WHEN p.is_admin_created = TRUE THEN 'Created offline - check ULTIMATE_FIX or create_offline_profile scripts'
        ELSE 'Self-registered - user set their own password'
    END as password_source
FROM auth.users au
LEFT JOIN profiles p ON p.college_email = au.email
WHERE au.email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in')
ORDER BY au.email;

-- ============================================================================
-- 8. CHECK WHAT SCRIPTS WERE USED TO CREATE THESE USERS
-- Look for patterns that suggest how the password was set
-- ============================================================================

-- Note: If these users were created by our scripts, the password was likely:
-- 1. ULTIMATE_FIX_RUN_THIS.sql - sets password to: password123
-- 2. create_offline_profile_with_auth.sql - uses pattern: {roll_number}@aiktc (e.g., 23ec59@aiktc)
-- 3. add_auth_to_existing_offline_profiles.sql - uses pattern: {roll_number}@pass (e.g., 23ec59@pass)
-- 4. EMERGENCY_RESET.sql - sets password to: password123

SELECT 
    '📝 8. LIKELY PASSWORDS BASED ON SCRIPTS' as info,
    '23ec59@aiktc.ac.in' as email,
    'If created by ULTIMATE_FIX: password123' as option1,
    'If created by create_offline_profile_with_auth: 23ec59@aiktc' as option2,
    'If created by add_auth_to_existing_offline_profiles: 23ec59@pass' as option3,
    'If self-registered: user chose their own password' as option4
UNION ALL
SELECT 
    '📝 8. LIKELY PASSWORDS BASED ON SCRIPTS' as info,
    '23ds33@aiktc.ac.in' as email,
    'If created by ULTIMATE_FIX: password123' as option1,
    'If created by create_offline_profile_with_auth: 23ds33@aiktc' as option2,
    'If created by add_auth_to_existing_offline_profiles: 23ds33@pass' as option3,
    'If self-registered: user chose their own password' as option4;

-- ============================================================================
-- 9. TRY TO FIX THESE SPECIFIC USERS NOW
-- ============================================================================
-- Uncomment below to fix these users:

/*
-- Fix user: 23ec59@aiktc.ac.in
SELECT * FROM fix_user_login('23ec59@aiktc.ac.in');

-- Fix user: 23ds33@aiktc.ac.in  
SELECT * FROM fix_user_login('23ds33@aiktc.ac.in');
*/

-- ============================================================================
-- 10. RESET PASSWORD FOR THESE USERS (if needed)
-- ============================================================================
-- To reset password to a known value, run this in Supabase Dashboard:
-- Authentication > Users > Find user > Reset password
-- 
-- OR use this SQL (will set password to 'password123'):
/*
UPDATE auth.users
SET 
    encrypted_password = crypt('password123', gen_salt('bf')),
    updated_at = NOW()
WHERE email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in');
*/

