-- CREATE MISSING PROFILES - EXPLICITLY SKIP DUPLICATES
-- This version explicitly excludes roll number 24dp55 and any other duplicates

-- Step 1: First, let's see who has 24dp55
SELECT 
    '=== EXISTING PROFILE WITH 24DP55 ===' as section,
    p.id,
    p.full_name,
    p.college_email,
    p.roll_number,
    p.created_at,
    'This profile already exists' as note
FROM profiles p
WHERE LOWER(p.roll_number) = '24dp55';

-- Step 2: Check who is TRYING to use 24dp55
SELECT 
    '=== AUTH USERS TRYING TO USE 24DP55 ===' as section,
    au.id,
    au.email,
    au.raw_user_meta_data->>'full_name' as name,
    au.raw_user_meta_data->>'roll_number' as wants_roll,
    'Will be SKIPPED' as action
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29'
    AND p.id IS NULL
    AND LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) = '24dp55';

-- Step 3: CREATE profiles - EXCLUDING 24dp55 and ANY existing roll numbers
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
    AND p.id IS NULL  -- Profile doesn't exist
    AND au.id NOT IN (
        -- Exclude anyone trying to use an existing roll number
        SELECT au2.id
        FROM auth.users au2
        WHERE LOWER(NULLIF(TRIM(au2.raw_user_meta_data->>'roll_number'), '')) IN (
            SELECT LOWER(p2.roll_number) 
            FROM profiles p2 
            WHERE p2.roll_number IS NOT NULL
        )
    );

-- Step 4: Verify what was created
SELECT 
    '=== SUCCESSFULLY CREATED ===' as section,
    COUNT(*) as created_count
FROM profiles
WHERE DATE(created_at) = '2026-01-29'
    AND updated_at > NOW() - INTERVAL '2 minutes';

-- Step 5: Show what's still missing (should be users with duplicate roll numbers)
SELECT 
    '=== STILL MISSING (DUPLICATE ROLL NUMBERS) ===' as section,
    au.email,
    au.raw_user_meta_data->>'full_name' as name,
    LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) as duplicate_roll,
    (
        SELECT p2.college_email 
        FROM profiles p2 
        WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
        LIMIT 1
    ) as roll_already_owned_by
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29'
    AND p.id IS NULL
ORDER BY au.email;

-- Step 6: Final count
SELECT 
    '=== FINAL STATUS ===' as section,
    COUNT(*) FILTER (WHERE p.id IS NOT NULL) as have_profiles,
    COUNT(*) FILTER (WHERE p.id IS NULL) as still_missing,
    COUNT(*) as total
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29';

SELECT 
    '=== COMPLETE ===' as message,
    'Profiles created for users with unique roll numbers' as result,
    'Users with duplicate roll numbers skipped' as note,
    'These users need manual intervention or cleanup duplicates first' as action;
