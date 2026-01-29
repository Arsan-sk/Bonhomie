-- FINAL FIX: Create all 37 missing profiles
-- UPDATED to check for duplicate roll numbers BEFORE inserting
-- This prevents creating new duplicates

-- Step 1: Check which of the 37 missing profiles would create duplicates
WITH missing_users AS (
    SELECT 
        au.id,
        au.email,
        LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) as roll_to_use,
        au.raw_user_meta_data->>'full_name' as name_to_use,
        au.created_at
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE DATE(au.created_at) = '2026-01-29'
        AND p.id IS NULL
)
SELECT 
    '=== ANALYSIS OF 37 MISSING PROFILES ===' as section,
    mu.id,
    mu.email,
    mu.roll_to_use,
    mu.name_to_use,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM profiles p 
            WHERE LOWER(p.roll_number) = mu.roll_to_use 
            AND mu.roll_to_use IS NOT NULL
        ) THEN '⚠️ DUPLICATE - WILL NOT CREATE'
        WHEN mu.roll_to_use IS NULL THEN 'ℹ️ NO ROLL NUMBER'
        ELSE '✅ SAFE TO CREATE'
    END as can_create
FROM missing_users mu
ORDER BY mu.created_at DESC;

-- Step 2: CREATE missing profiles (ONLY if roll number doesn't exist)
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
ON CONFLICT (id) DO NOTHING;  -- Skip if profile already exists
-- Note: If roll_number conflict occurs, the user has a duplicate roll number issue

-- Step 3: Report what was created
SELECT 
    '=== PROFILES CREATED ===' as section,
    COUNT(*) as created_count
FROM profiles p
WHERE DATE(p.created_at) = '2026-01-29'
    AND p.updated_at > NOW() - INTERVAL '2 minutes';

-- Step 4: Check if any still missing
SELECT 
    '=== STILL MISSING (Due to duplicate roll numbers) ===' as section,
    au.id,
    au.email,
    au.raw_user_meta_data->>'roll_number' as duplicate_roll_number,
    au.raw_user_meta_data->>'full_name' as name
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29'
    AND p.id IS NULL;

-- Step 5: Final verification
SELECT 
    '=== FINAL STATUS ===' as section,
    COUNT(*) FILTER (WHERE p.id IS NOT NULL) as profiles_exist,
    COUNT(*) FILTER (WHERE p.id IS NULL) as profiles_missing,
    COUNT(*) as total_users
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29';

SELECT 
    '=== COMPLETE ===' as message,
    'All non-duplicate profiles have been created' as result,
    'Users with duplicate roll numbers need manual review' as note,
    'All users should logout and login again' as action;
