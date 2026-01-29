-- ============================================
-- CHECK FOR DUPLICATE/REDUNDANT AUTH.USERS
-- ============================================
-- This checks if we created multiple auth.users for the same email
-- and identifies which ones to keep vs delete
-- ============================================

-- STEP 1: Check for duplicate EMAILS in auth.users
-- ============================================

SELECT 
    '1. DUPLICATE EMAILS IN AUTH.USERS' as check,
    email,
    COUNT(*) as count,
    STRING_AGG(id::text, ', ') as user_ids
FROM auth.users
WHERE email LIKE '%@aiktc.ac.in'
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- STEP 2: Check for duplicate identities for same user
-- ============================================

SELECT 
    '2. DUPLICATE IDENTITIES' as check,
    user_id,
    provider,
    COUNT(*) as count
FROM auth.identities
GROUP BY user_id, provider
HAVING COUNT(*) > 1;

-- STEP 3: Show all auth.users with their profile match status
-- ============================================
-- This shows which auth.users.id matches a profile.id vs which don't

SELECT 
    '3. AUTH.USERS vs PROFILES MATCH' as check,
    au.id as auth_user_id,
    au.email,
    p_by_id.id as profile_matched_by_id,
    p_by_email.id as profile_matched_by_email,
    p_by_auth_user_id.id as profile_matched_by_auth_user_id,
    CASE 
        WHEN p_by_id.id IS NOT NULL THEN '✅ MATCHES profile.id - KEEP THIS'
        WHEN p_by_auth_user_id.id IS NOT NULL THEN '⚠️ MATCHES profile.auth_user_id'
        WHEN p_by_email.id IS NOT NULL THEN '❌ Only matches by email - MIGHT BE REDUNDANT'
        ELSE '❌ NO PROFILE MATCH - ORPHAN'
    END as status
FROM auth.users au
LEFT JOIN profiles p_by_id ON p_by_id.id = au.id
LEFT JOIN profiles p_by_email ON LOWER(p_by_email.college_email) = LOWER(au.email)
LEFT JOIN profiles p_by_auth_user_id ON p_by_auth_user_id.auth_user_id = au.id
WHERE au.email LIKE '%@aiktc.ac.in'
ORDER BY au.email, status;

-- STEP 4: Count summary
-- ============================================

SELECT 
    '4. SUMMARY COUNTS' as check,
    COUNT(*) as total_auth_users,
    COUNT(*) FILTER (WHERE p_by_id.id IS NOT NULL) as matches_profile_id,
    COUNT(*) FILTER (WHERE p_by_id.id IS NULL AND p_by_auth_user_id.id IS NOT NULL) as matches_auth_user_id_only,
    COUNT(*) FILTER (WHERE p_by_id.id IS NULL AND p_by_auth_user_id.id IS NULL AND p_by_email.id IS NOT NULL) as matches_email_only,
    COUNT(*) FILTER (WHERE p_by_id.id IS NULL AND p_by_auth_user_id.id IS NULL AND p_by_email.id IS NULL) as no_profile_match
FROM auth.users au
LEFT JOIN profiles p_by_id ON p_by_id.id = au.id
LEFT JOIN profiles p_by_email ON LOWER(p_by_email.college_email) = LOWER(au.email)
LEFT JOIN profiles p_by_auth_user_id ON p_by_auth_user_id.auth_user_id = au.id
WHERE au.email LIKE '%@aiktc.ac.in';

-- STEP 5: Find REDUNDANT auth.users (same email, different IDs)
-- ============================================
-- These are the ones we created that DON'T match profile.id

SELECT 
    '5. REDUNDANT AUTH.USERS TO DELETE' as check,
    au.id as redundant_auth_user_id,
    au.email,
    au.created_at,
    p.id as correct_profile_id,
    'Should DELETE this auth.users and keep profile.id as auth' as action
FROM auth.users au
JOIN profiles p ON LOWER(p.college_email) = LOWER(au.email)
WHERE au.id != p.id  -- Auth user ID doesn't match profile ID
  AND au.email LIKE '%@aiktc.ac.in'
  -- Make sure there's another auth.users that DOES match the profile
  AND EXISTS (
      SELECT 1 FROM auth.users au2 
      WHERE au2.id = p.id  -- This auth.users matches profile.id
  )
ORDER BY au.email;

-- STEP 6: Find profiles that need auth.users created (profile.id not in auth.users)
-- ============================================

SELECT 
    '6. PROFILES WITHOUT MATCHING AUTH.USERS' as check,
    p.id as profile_id,
    p.college_email,
    p.roll_number,
    p.auth_user_id,
    au_by_email.id as auth_user_by_email,
    CASE 
        WHEN au_by_email.id IS NOT NULL AND au_by_email.id != p.id 
        THEN 'Has auth.users but ID mismatch - needs fix'
        WHEN au_by_email.id IS NULL 
        THEN 'No auth.users at all - needs creation'
        ELSE 'OK'
    END as status
FROM profiles p
LEFT JOIN auth.users au_by_id ON au_by_id.id = p.id
LEFT JOIN auth.users au_by_email ON LOWER(au_by_email.email) = LOWER(p.college_email)
WHERE p.college_email LIKE '%@aiktc.ac.in'
  AND au_by_id.id IS NULL  -- No auth.users matching profile.id
ORDER BY p.college_email;

-- STEP 7: Check total counts
-- ============================================

SELECT '7A. TOTAL PROFILES' as check, COUNT(*) as count FROM profiles WHERE college_email LIKE '%@aiktc.ac.in';
SELECT '7B. TOTAL AUTH.USERS' as check, COUNT(*) as count FROM auth.users WHERE email LIKE '%@aiktc.ac.in';
SELECT '7C. TOTAL IDENTITIES' as check, COUNT(*) as count FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@aiktc.ac.in');

-- STEP 8: Detailed view of any duplicates
-- ============================================

WITH duplicate_emails AS (
    SELECT email
    FROM auth.users
    WHERE email LIKE '%@aiktc.ac.in'
    GROUP BY email
    HAVING COUNT(*) > 1
)
SELECT 
    '8. DUPLICATE EMAIL DETAILS' as check,
    au.id,
    au.email,
    au.created_at,
    au.email_confirmed_at,
    p.id as profile_id,
    CASE WHEN au.id = p.id THEN '✅ ID MATCHES PROFILE - KEEP' ELSE '❌ ID MISMATCH - DELETE' END as action
FROM auth.users au
JOIN duplicate_emails de ON de.email = au.email
LEFT JOIN profiles p ON LOWER(p.college_email) = LOWER(au.email)
ORDER BY au.email, au.created_at;
