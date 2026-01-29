-- ============================================================================
-- REAL DIAGNOSTIC - Returns actual database values
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. AUTH.USERS - Check if users exist and their status
SELECT 
    'auth.users' as table_name,
    id,
    email,
    encrypted_password IS NOT NULL as has_password,
    email_confirmed_at,
    last_sign_in_at,
    created_at,
    aud,
    role
FROM auth.users
WHERE email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in');

-- 2. AUTH.IDENTITIES - CRITICAL for login
SELECT 
    'auth.identities' as table_name,
    i.id as identity_id,
    i.user_id,
    au.email,
    i.provider,
    i.provider_id,
    i.created_at
FROM auth.users au
LEFT JOIN auth.identities i ON i.user_id = au.id
WHERE au.email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in');

-- 3. PROFILES - Check profile records
SELECT 
    'profiles' as table_name,
    id as profile_id,
    college_email,
    roll_number,
    full_name,
    role,
    is_admin_created,
    auth_user_id,
    created_at
FROM profiles
WHERE college_email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in');

-- 4. COUNT CHECK - How many records exist
SELECT 
    'counts' as check_type,
    (SELECT COUNT(*) FROM auth.users WHERE email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in')) as auth_users_count,
    (SELECT COUNT(*) FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in'))) as identities_count,
    (SELECT COUNT(*) FROM profiles WHERE college_email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in')) as profiles_count;
