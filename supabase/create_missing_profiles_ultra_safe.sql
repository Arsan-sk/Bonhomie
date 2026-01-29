-- CREATE MISSING PROFILES - ULTRA SAFE VERSION
-- This handles ALL edge cases:
-- - Duplicate roll numbers
-- - Missing profiles
-- - NULL roll numbers
-- Uses ON CONFLICT for maximum safety

-- Step 1: Show what will be attempted
SELECT 
    '=== PROFILES TO CREATE ===' as section,
    au.id,
    au.email,
    au.raw_user_meta_data->>'full_name' as will_use_name,
    LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) as will_use_roll,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM profiles p 
            WHERE LOWER(p.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
            AND LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) IS NOT NULL
        ) THEN '⚠️ SKIP - Roll number exists'
        WHEN LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) IS NULL 
        THEN 'ℹ️ CREATE - No roll number'
        ELSE '✅ CREATE - Safe'
    END as action
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29'
    AND p.id IS NULL
ORDER BY au.created_at DESC;

-- Step 2: CREATE missing profiles with ON CONFLICT handling
INSERT INTO profiles (
    id,
    full_name,
    college_email,
    roll_number,
    school,
    department,
    program,
    year_of_study,
    admission_year,
    expected_passout_year,
    phone,
    gender,
    role,
    created_at,
    updated_at
)
SELECT 
    au.id,
    COALESCE(NULLIF(TRIM(au.raw_user_meta_data->>'full_name'), ''), 'User'),
    au.email,
    LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')),
    NULLIF(TRIM(au.raw_user_meta_data->>'school'), ''),
    NULLIF(TRIM(au.raw_user_meta_data->>'department'), ''),
    NULLIF(TRIM(au.raw_user_meta_data->>'program'), ''),
    NULLIF(TRIM(au.raw_user_meta_data->>'year_of_study'), ''),
    NULLIF(TRIM(au.raw_user_meta_data->>'admission_year'), ''),
    NULLIF(TRIM(au.raw_user_meta_data->>'expected_passout_year'), ''),
    NULLIF(TRIM(au.raw_user_meta_data->>'phone'), ''),
    NULLIF(TRIM(au.raw_user_meta_data->>'gender'), ''),
    CAST(COALESCE(au.raw_user_meta_data->>'role', 'student') AS user_role),
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29'
    AND p.id IS NULL
    -- Only create if roll number doesn't already exist OR is null
    AND (
        LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) IS NULL
        OR NOT EXISTS (
            SELECT 1 FROM profiles p2
            WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
        )
    )
ON CONFLICT (id) DO NOTHING;  -- Safety net

-- Step 3: Report results
SELECT 
    '=== PROFILES CREATED ===' as section,
    COUNT(*) as created_count
FROM profiles p
WHERE DATE(p.created_at) = '2026-01-29'
    AND p.updated_at > NOW() - INTERVAL '2 minutes';

-- Step 4: Show what COULDN'T be created (due to duplicate roll numbers)
SELECT 
    '=== SKIPPED DUE TO DUPLICATE ROLL NUMBERS ===' as section,
    au.id,
    au.email,
    au.raw_user_meta_data->>'full_name' as name,
    LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) as duplicate_roll,
    (SELECT p2.college_email 
     FROM profiles p2 
     WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
     LIMIT 1
    ) as existing_profile_email,
    '⚠️ This user has same roll number as existing profile' as issue
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29'
    AND p.id IS NULL
    AND LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM profiles p2
        WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
    );

-- Step 5: Final status
SELECT 
    '=== FINAL STATUS ===' as section,
    COUNT(*) FILTER (WHERE p.id IS NOT NULL) as profiles_now_exist,
    COUNT(*) FILTER (WHERE p.id IS NULL) as still_missing,
    COUNT(*) as total_auth_users_today
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29';

SELECT 
    '=== COMPLETE ===' as message,
    'Non-duplicate profiles created' as result,
    'Users with duplicate roll numbers need manual review' as note,
    'Run smart_cleanup_duplicates.sql first to fix duplicates' as recommendation;
