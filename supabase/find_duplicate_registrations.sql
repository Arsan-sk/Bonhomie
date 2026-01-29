-- FIND DUPLICATE ACCOUNTS (Same roll number, different emails)
-- This identifies users who registered twice due to password issues

-- Query 1: Find users with auth.users but no profile (missing profiles)
WITH missing_profiles AS (
    SELECT 
        au.id as auth_id,
        au.email as new_email,
        au.created_at as new_account_created,
        LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) as roll_number,
        au.raw_user_meta_data->>'full_name' as wants_name
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE p.id IS NULL
        AND NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '') IS NOT NULL
)
SELECT 
    '=== DUPLICATE REGISTRATIONS DETECTED ===' as section,
    mp.new_email as duplicate_new_email,
    mp.new_account_created,
    mp.roll_number,
    mp.wants_name,
    p_existing.college_email as original_email,
    p_existing.full_name as original_name,
    p_existing.created_at as original_account_created,
    '⚠️ User registered twice - has 2 emails for same roll number' as issue
FROM missing_profiles mp
INNER JOIN profiles p_existing ON LOWER(p_existing.roll_number) = mp.roll_number
ORDER BY mp.new_account_created DESC;

-- Query 2: Specifically check skzaid00000@gmail.com
SELECT 
    '=== SKZAID DUPLICATE CHECK ===' as section,
    au.email as new_duplicate_email,
    au.created_at as new_account_date,
    au.raw_user_meta_data->>'roll_number' as wants_roll,
    p.college_email as original_email,
    p.full_name as original_name,
    p.roll_number as original_roll,
    p.created_at as original_account_date,
    CASE 
        WHEN p.college_email != au.email THEN '⚠️ CONFIRMED - This is a duplicate account'
        ELSE 'Not a duplicate'
    END as diagnosis
FROM auth.users au
LEFT JOIN profiles p ON LOWER(p.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
WHERE au.email = 'skzaid00000@gmail.com';

-- Query 3: Count how many duplicate accounts exist
SELECT 
    '=== SUMMARY ===' as section,
    COUNT(*) as total_duplicate_auth_accounts,
    COUNT(DISTINCT LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))) as unique_roll_numbers_affected,
    'These users registered twice due to password issues' as reason
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
    AND NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '') IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM profiles p2
        WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
    );

-- Query 4: List all affected users with both emails
SELECT 
    '=== ALL AFFECTED USERS ===' as section,
    LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) as roll_number,
    au.email as new_duplicate_email,
    (
        SELECT p.college_email 
        FROM profiles p 
        WHERE LOWER(p.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
        LIMIT 1
    ) as original_email,
    au.created_at as duplicate_created_date
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
    AND NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '') IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM profiles p2
        WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
    )
ORDER BY au.created_at DESC;
