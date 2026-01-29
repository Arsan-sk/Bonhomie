-- FIX ALL 37 MISSING PROFILES
-- This will CREATE all missing profiles for users registered today
-- 
-- Run this AFTER confirming the single user fix worked

-- Step 1: Show how many profiles are missing
SELECT 
    'MISSING PROFILES COUNT' as status,
    COUNT(*) as missing_count
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29'
    AND p.id IS NULL;

-- Step 2: Show list of missing profiles
SELECT 
    'USERS WITH MISSING PROFILES' as status,
    au.id,
    au.email,
    au.created_at,
    au.raw_user_meta_data->>'full_name' as will_create_with_name
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29'
    AND p.id IS NULL
ORDER BY au.created_at DESC;

-- Step 3: CREATE all missing profiles
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
    AND p.id IS NULL;  -- Only insert where profile doesn't exist

-- Step 4: Verify all profiles were created
SELECT 
    'VERIFICATION' as status,
    COUNT(*) as profiles_created
FROM profiles p
WHERE DATE(p.created_at) = '2026-01-29'
    AND p.updated_at > NOW() - INTERVAL '1 minute';

-- Step 5: Check if any are still missing
SELECT 
    'REMAINING MISSING PROFILES' as status,
    COUNT(*) as still_missing
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29'
    AND p.id IS NULL;

-- Step 6: Show sample of created profiles
SELECT 
    'CREATED PROFILES SAMPLE' as status,
    p.id,
    p.full_name,
    p.roll_number,
    p.college_email,
    p.school,
    p.department,
    p.created_at,
    p.updated_at
FROM profiles p
WHERE DATE(p.created_at) = '2026-01-29'
    AND p.updated_at > NOW() - INTERVAL '1 minute'
ORDER BY p.updated_at DESC
LIMIT 20;

-- Final summary
SELECT 
    '=== FIX COMPLETE ===' as message,
    'All missing profiles have been created' as result,
    'Users should logout and login again' as action_required,
    'Dashboard and event registration should now work' as expected;
