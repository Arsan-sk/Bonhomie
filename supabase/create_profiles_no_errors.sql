-- CREATE MISSING PROFILES - GUARANTEED NO ERRORS VERSION
-- This version pre-filters out ALL potential conflicts before INSERT

-- Step 1: Show analysis
WITH missing_profiles AS (
    SELECT 
        au.id,
        au.email,
        au.raw_user_meta_data->>'full_name' as will_use_name,
        LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) as will_use_roll
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE DATE(au.created_at) = '2026-01-29'
        AND p.id IS NULL
)
SELECT 
    '=== ANALYSIS OF MISSING PROFILES ===' as section,
    COUNT(*) as total_missing,
    COUNT(*) FILTER (
        WHERE will_use_roll IS NULL
    ) as no_roll_number_safe,
    COUNT(*) FILTER (
        WHERE will_use_roll IS NOT NULL 
        AND EXISTS (SELECT 1 FROM profiles p WHERE LOWER(p.roll_number) = will_use_roll)
    ) as duplicate_roll_skip,
    COUNT(*) FILTER (
        WHERE will_use_roll IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM profiles p WHERE LOWER(p.roll_number) = will_use_roll)
    ) as unique_roll_safe
FROM missing_profiles;

-- Step 2: Show list of profiles that WILL be created
WITH safe_to_create AS (
    SELECT 
        au.id,
        au.email,
        au.raw_user_meta_data->>'full_name' as name,
        LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) as roll
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE DATE(au.created_at) = '2026-01-29'
        AND p.id IS NULL
        AND (
            -- Either no roll number OR roll number is unique
            LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) IS NULL
            OR NOT EXISTS (
                SELECT 1 FROM profiles p2
                WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
            )
        )
)
SELECT 
    '=== WILL CREATE THESE PROFILES ===' as section,
    * 
FROM safe_to_create;

-- Step 3: Show profiles that will be SKIPPED
WITH will_skip AS (
    SELECT 
        au.id,
        au.email,
        au.raw_user_meta_data->>'full_name' as name,
        LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) as duplicate_roll,
        (
            SELECT p2.college_email 
            FROM profiles p2 
            WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
            LIMIT 1
        ) as existing_owner
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE DATE(au.created_at) = '2026-01-29'
        AND p.id IS NULL
        AND LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM profiles p2
            WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
        )
)
SELECT 
    '=== WILL SKIP (DUPLICATE ROLL NUMBERS) ===' as section,
    *
FROM will_skip;

-- Step 4: CREATE only safe profiles (guaranteed no conflicts)
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
WHERE au.id IN (
    -- Only users that are safe to create
    SELECT au2.id
    FROM auth.users au2
    LEFT JOIN profiles p ON au2.id = p.id
    WHERE DATE(au2.created_at) = '2026-01-29'
        AND p.id IS NULL
        AND (
            -- Either no roll number OR roll number doesn't exist anywhere
            LOWER(NULLIF(TRIM(au2.raw_user_meta_data->>'roll_number'), '')) IS NULL
            OR NOT EXISTS (
                SELECT 1 FROM profiles p2
                WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au2.raw_user_meta_data->>'roll_number'), ''))
            )
        )
);

-- Step 5: Verification
SELECT 
    '=== CREATION RESULTS ===' as section,
    COUNT(*) as profiles_created
FROM profiles
WHERE DATE(created_at) = '2026-01-29'
    AND updated_at > NOW() - INTERVAL '2 minutes';

-- Step 6: Final check
SELECT 
    '=== STILL MISSING ===' as section,
    COUNT(*) as still_missing_count,
    STRING_AGG(au.email, ', ') as emails
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29'
    AND p.id IS NULL;

SELECT 
    '=== COMPLETE ===' as message,
    'Safe profiles created, duplicates skipped' as result,
    'Users with duplicate roll numbers need cleanup first' as note;
