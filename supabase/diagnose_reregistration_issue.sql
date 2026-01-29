-- COMPREHENSIVE DIAGNOSTIC: Identify all affected users
-- This finds users who re-registered after password change

-- ============================================================================
-- SCENARIO 1: Same roll number, different emails (password change victims)
-- ============================================================================

SELECT 
    '=== SCENARIO 1: USERS WHO RE-REGISTERED (Different email, same roll) ===' as section,
    p.roll_number,
    p.college_email as original_email,
    p.full_name as original_name,
    p.created_at as original_registration,
    au_new.email as new_attempt_email,
    au_new.raw_user_meta_data->>'full_name' as new_attempt_name,
    au_new.created_at as new_attempt_date,
    'User tried to re-register after password change' as diagnosis,
    'Old account works, new account has no profile' as issue
FROM profiles p
INNER JOIN auth.users au_new ON 
    LOWER(NULLIF(TRIM(au_new.raw_user_meta_data->>'roll_number'), '')) = LOWER(p.roll_number)
    AND au_new.email != p.college_email
LEFT JOIN profiles p_new ON au_new.id = p_new.id
WHERE p_new.id IS NULL
    AND au_new.raw_user_meta_data->>'roll_number' IS NOT NULL
ORDER BY au_new.created_at DESC;

-- ============================================================================
-- SCENARIO 2: Auth users without profiles (trigger failure)
-- ============================================================================

SELECT 
    '=== SCENARIO 2: MISSING PROFILES (Trigger failed) ===' as section,
    au.id,
    au.email,
    au.raw_user_meta_data->>'full_name' as name,
    au.raw_user_meta_data->>'roll_number' as wants_roll,
    au.created_at,
    DATE(au.created_at) as registration_date,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM profiles p2
            WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
            AND au.raw_user_meta_data->>'roll_number' IS NOT NULL
        ) THEN 'Roll number conflict'
        WHEN au.raw_user_meta_data->>'roll_number' IS NULL THEN 'No roll number in metadata'
        ELSE 'Unknown reason'
    END as reason
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;

-- ============================================================================
-- SCENARIO 3: Count by date
-- ============================================================================

WITH missing_by_date AS (
    SELECT 
        DATE(au.created_at) as registration_date,
        au.email,
        ROW_NUMBER() OVER (PARTITION BY DATE(au.created_at) ORDER BY au.created_at) as row_num
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE p.id IS NULL
)
SELECT 
    '=== SCENARIO 3: MISSING PROFILES BY DATE ===' as section,
    registration_date,
    COUNT(*) as missing_profile_count,
    STRING_AGG(email, ', ') FILTER (WHERE row_num <= 5) as sample_emails
FROM missing_by_date
GROUP BY registration_date
ORDER BY registration_date DESC;

-- ============================================================================
-- SUMMARY STATISTICS
-- ============================================================================

SELECT 
    '=== SUMMARY STATISTICS ===' as section,
    (SELECT COUNT(*) FROM auth.users) as total_auth_users,
    (SELECT COUNT(*) FROM profiles) as total_profiles,
    (SELECT COUNT(*) FROM auth.users au LEFT JOIN profiles p ON au.id = p.id WHERE p.id IS NULL) as missing_profiles,
    (SELECT COUNT(*) FROM profiles p WHERE EXISTS (
        SELECT 1 FROM auth.users au 
        WHERE LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) = LOWER(p.roll_number)
        AND au.email != p.college_email
    )) as profiles_with_duplicate_roll_attempts;

-- ============================================================================
-- RECOMMENDED ACTIONS
-- ============================================================================

SELECT 
    '=== RECOMMENDED ACTIONS ===' as section,
    action_type,
    description,
    affected_count
FROM (
    VALUES 
        ('ACTION 1', 'Delete duplicate auth.users (keep original profile)', 
         (SELECT COUNT(*) FROM auth.users au WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = au.id) 
          AND EXISTS (SELECT 1 FROM profiles p2 WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))))),
        
        ('ACTION 2', 'Create profiles for auth.users with unique roll numbers',
         (SELECT COUNT(*) FROM auth.users au WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = au.id)
          AND (NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '') IS NULL 
               OR NOT EXISTS (SELECT 1 FROM profiles p2 WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')))))),
        
        ('ACTION 3', 'Notify users to use original email',
         (SELECT COUNT(*) FROM auth.users au WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = au.id)
          AND EXISTS (SELECT 1 FROM profiles p2 WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')))))
) AS actions(action_type, description, affected_count);
