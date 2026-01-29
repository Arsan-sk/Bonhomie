-- FORCE CREATE PROFILE: skzaid00000@gmail.com
-- This will create the profile even if there's a roll number conflict
-- by setting roll_number to NULL

-- Show what we're about to do
SELECT 
    '=== WILL CREATE PROFILE ===' as section,
    au.id,
    au.email,
    au.raw_user_meta_data->>'full_name' as will_use_name,
    'NULL (avoiding conflict)' as will_use_roll_number
FROM auth.users au
WHERE au.email = 'skzaid00000@gmail.com'
    AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = au.id);

-- Create profile with NULL roll number to avoid conflicts
INSERT INTO profiles (
    id,
    full_name,
    college_email,
    roll_number,  -- Will be NULL to avoid conflict
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
    NULL,  -- Force NULL to avoid roll number conflict
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
WHERE au.email = 'skzaid00000@gmail.com'
    AND NOT EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = au.id
    );

-- Verify profile was created
SELECT 
    '=== PROFILE CREATED ===' as section,
    p.id,
    p.full_name,
    p.roll_number,
    p.college_email,
    p.created_at,
    p.updated_at,
    '✅ Profile now exists - User can login' as status
FROM profiles p
WHERE p.college_email = 'skzaid00000@gmail.com';

-- Final check
SELECT 
    '=== FINAL VERIFICATION ===' as section,
    au.id as auth_id,
    p.id as profile_id,
    p.full_name,
    CASE 
        WHEN au.id IS NOT NULL AND p.id IS NOT NULL THEN '✅ FIXED - Ask user to logout/login and hard refresh (Ctrl+Shift+R)'
        ELSE '❌ STILL MISSING'
    END as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'skzaid00000@gmail.com';

SELECT 
    '=== ACTION REQUIRED ===' as message,
    'User must:' as step_1,
    '1. LOGOUT completely' as step_2,
    '2. Clear browser cache or hard refresh (Ctrl+Shift+R)' as step_3,
    '3. LOGIN again' as step_4,
    'Dashboard should now work' as expected;
