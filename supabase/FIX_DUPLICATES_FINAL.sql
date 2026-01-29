-- ============================================================================
-- FIX DUPLICATE PROFILES COMPLETELY
-- The "Cannot coerce" error means MULTIPLE profiles exist
-- ============================================================================

-- 1. Check duplicates by college_email
SELECT 
    '1. DUPLICATES BY EMAIL' as check_type,
    college_email,
    COUNT(*) as cnt
FROM profiles
WHERE college_email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in')
GROUP BY college_email;

-- 2. Check duplicates by auth_user_id
SELECT 
    '2. DUPLICATES BY AUTH_USER_ID' as check_type,
    auth_user_id,
    COUNT(*) as cnt
FROM profiles
WHERE auth_user_id IS NOT NULL
GROUP BY auth_user_id
HAVING COUNT(*) > 1;

-- 3. Show ALL profile records for these emails
SELECT 
    '3. ALL PROFILES' as info,
    id,
    college_email,
    full_name,
    auth_user_id,
    is_admin_created,
    created_at
FROM profiles
WHERE college_email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in')
   OR auth_user_id IN (
       SELECT id FROM auth.users WHERE email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in')
   )
ORDER BY college_email, created_at;

-- ============================================================================
-- 4. DELETE DUPLICATES - Keep only one profile per email
-- ============================================================================

-- For 23ec59@aiktc.ac.in - keep the one with auth_user_id linked
DELETE FROM profiles
WHERE college_email = '23ec59@aiktc.ac.in'
AND id != (
    SELECT id FROM profiles 
    WHERE college_email = '23ec59@aiktc.ac.in' 
    AND auth_user_id IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1
);

-- For 23ds33@aiktc.ac.in - keep the one with auth_user_id linked
DELETE FROM profiles
WHERE college_email = '23ds33@aiktc.ac.in'
AND id != (
    SELECT id FROM profiles 
    WHERE college_email = '23ds33@aiktc.ac.in' 
    AND auth_user_id IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1
);

-- ============================================================================
-- 5. VERIFY - Should show exactly 1 profile per email
-- ============================================================================

SELECT 
    '5. AFTER DELETE' as status,
    college_email,
    COUNT(*) as profile_count
FROM profiles
WHERE college_email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in')
GROUP BY college_email;

-- 6. Final check - profile details
SELECT 
    '6. FINAL PROFILE DATA' as status,
    p.id as profile_id,
    p.college_email,
    p.full_name,
    p.auth_user_id,
    au.id as matching_auth_id,
    au.email as auth_email
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.auth_user_id
WHERE p.college_email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in');
