-- ============================================================================
-- FIX: Profile has is_admin_created=FALSE but profile.id != auth.users.id
-- Solution: Set is_admin_created=TRUE so it uses auth_user_id lookup
-- ============================================================================

-- 1. Show current state
SELECT 
    '1. CURRENT STATE' as info,
    p.id as profile_id,
    p.auth_user_id,
    p.is_admin_created,
    au.id as auth_user_id_in_auth,
    CASE WHEN p.id = au.id THEN '✅ MATCH' ELSE '❌ MISMATCH' END as id_match
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.auth_user_id
WHERE p.college_email = '23ec41@aiktc.ac.in';

-- ============================================================================
-- 2. FIX: Set is_admin_created = TRUE
-- This tells the system to use auth_user_id for lookup instead of profile.id
-- ============================================================================

UPDATE profiles
SET is_admin_created = TRUE
WHERE college_email = '23ec41@aiktc.ac.in';

-- 3. Verify
SELECT 
    '3. AFTER FIX' as info,
    p.id as profile_id,
    p.college_email,
    p.full_name,
    p.auth_user_id,
    p.is_admin_created,
    '✅ Now system will use auth_user_id for lookup' as status
FROM profiles p
WHERE p.college_email = '23ec41@aiktc.ac.in';

-- 4. Check auth user exists and has identity
SELECT 
    '4. AUTH CHECK' as info,
    au.id,
    au.email,
    au.encrypted_password IS NOT NULL as has_password,
    i.id IS NOT NULL as has_identity
FROM auth.users au
LEFT JOIN auth.identities i ON i.user_id = au.id
WHERE au.id = (SELECT auth_user_id FROM profiles WHERE college_email = '23ec41@aiktc.ac.in');
