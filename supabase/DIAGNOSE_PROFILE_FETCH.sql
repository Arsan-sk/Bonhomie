-- ============================================================================
-- DIAGNOSE PROFILE FETCH ISSUE
-- Why profile shows default values for 23ec59@aiktc.ac.in and 23ds33@aiktc.ac.in
-- ============================================================================

-- 1. Show auth.users for these emails
SELECT 
    '1. AUTH.USERS' as table_name,
    id as auth_user_id,
    email,
    created_at
FROM auth.users
WHERE email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in');

-- 2. Show ALL profiles for these emails (check duplicates)
SELECT 
    '2. PROFILES' as table_name,
    id as profile_id,
    college_email,
    full_name,
    roll_number,
    auth_user_id,
    is_admin_created,
    created_at
FROM profiles
WHERE college_email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in')
ORDER BY college_email, created_at;

-- 3. Check if profile.id matches auth.users.id (required for direct lookup)
SELECT 
    '3. ID MATCH CHECK' as check_type,
    au.email,
    au.id as auth_user_id,
    p.id as profile_id,
    p.auth_user_id as profile_auth_user_id,
    CASE WHEN p.id = au.id THEN '✅ profile.id = auth.id' ELSE '❌ MISMATCH' END as id_match,
    CASE WHEN p.auth_user_id = au.id THEN '✅ auth_user_id linked' ELSE '❌ NOT LINKED' END as auth_link
FROM auth.users au
LEFT JOIN profiles p ON p.college_email = au.email
WHERE au.email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in');

-- 4. Count profiles per email
SELECT 
    '4. DUPLICATE COUNT' as check_type,
    college_email,
    COUNT(*) as profile_count
FROM profiles
WHERE college_email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in')
GROUP BY college_email;

-- ============================================================================
-- THE FIX: Update profiles to link auth_user_id correctly
-- ============================================================================

-- 5. Link profiles to their auth users
UPDATE profiles p
SET auth_user_id = au.id
FROM auth.users au
WHERE au.email = p.college_email
AND p.college_email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in')
AND (p.auth_user_id IS NULL OR p.auth_user_id != au.id);

-- 6. Verify the fix
SELECT 
    '6. AFTER FIX' as status,
    au.email,
    au.id as auth_user_id,
    p.id as profile_id,
    p.full_name,
    p.auth_user_id as profile_auth_user_id,
    CASE WHEN p.auth_user_id = au.id THEN '✅ LINKED' ELSE '❌ STILL BROKEN' END as link_status
FROM auth.users au
LEFT JOIN profiles p ON p.college_email = au.email
WHERE au.email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in');
