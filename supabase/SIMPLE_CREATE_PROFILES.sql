-- SIMPLIFIED FIX: Just create missing profiles with proper conflict handling
-- Run this if FINAL_COMPLETE_FIX keeps failing

-- Check current state
SELECT 
    '=== CURRENT STATE ===' as section,
    COUNT(*) FILTER (WHERE p.id IS NOT NULL) as have_profiles,
    COUNT(*) FILTER (WHERE p.id IS NULL) as missing_profiles,
    COUNT(*) as total_today
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29';

-- Create missing profiles with bulletproof conflict handling
WITH profiles_to_create AS (
    SELECT 
        au.id,
        COALESCE(NULLIF(TRIM(au.raw_user_meta_data->>'full_name'), ''), 'User') as full_name,
        au.email,
        LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) as roll_number,
        NULLIF(TRIM(au.raw_user_meta_data->>'school'), '') as school,
        NULLIF(TRIM(au.raw_user_meta_data->>'department'), '') as department,
        NULLIF(TRIM(au.raw_user_meta_data->>'program'), '') as program,
        NULLIF(TRIM(au.raw_user_meta_data->>'year_of_study'), '') as year_of_study,
        NULLIF(TRIM(au.raw_user_meta_data->>'admission_year'), '') as admission_year,
        NULLIF(TRIM(au.raw_user_meta_data->>'expected_passout_year'), '') as expected_passout_year,
        NULLIF(TRIM(au.raw_user_meta_data->>'phone'), '') as phone,
        NULLIF(TRIM(au.raw_user_meta_data->>'gender'), '') as gender,
        CAST(COALESCE(au.raw_user_meta_data->>'role', 'student') AS user_role) as role,
        au.created_at
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE DATE(au.created_at) = '2026-01-29'
        AND p.id IS NULL
),
safe_inserts AS (
    SELECT ptc.*
    FROM profiles_to_create ptc
    WHERE ptc.roll_number IS NULL  -- No roll number, always safe
       OR NOT EXISTS (
           SELECT 1 FROM profiles p
           WHERE LOWER(p.roll_number) = ptc.roll_number
       )
)
INSERT INTO profiles (
    id, full_name, college_email, roll_number, school, department,
    program, year_of_study, admission_year, expected_passout_year,
    phone, gender, role, created_at, updated_at
)
SELECT 
    id, full_name, email, roll_number, school, department,
    program, year_of_study, admission_year, expected_passout_year,
    phone, gender, role, created_at, NOW()
FROM safe_inserts;

-- Show results
SELECT 
    '=== CREATED ===' as section,
    COUNT(*) as count
FROM profiles
WHERE updated_at > NOW() - INTERVAL '1 minute';

-- Show skipped (duplicate roll numbers)
SELECT 
    '=== SKIPPED ===' as section,
    au.email,
    au.raw_user_meta_data->>'full_name' as name,
    LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) as duplicate_roll
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29'
    AND p.id IS NULL;

-- Final count
SELECT 
    '=== FINAL ===' as section,
    COUNT(*) FILTER (WHERE p.id IS NOT NULL) as have_profiles,
    COUNT(*) FILTER (WHERE p.id IS NULL) as still_missing,
    COUNT(*) as total
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29';
