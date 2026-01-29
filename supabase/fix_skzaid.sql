-- FIX FOR SPECIFIC USER: skzaid00000@gmail.com
-- This creates the missing profile for this user

-- Step 1: Show current state
SELECT 
    'BEFORE FIX' as status,
    au.id as auth_id,
    au.email,
    p.id as profile_id,
    CASE 
        WHEN p.id IS NULL THEN '❌ PROFILE MISSING'
        ELSE '✅ PROFILE EXISTS'
    END as current_state
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'skzaid00000@gmail.com';

-- Step 2: CREATE the missing profile
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
WHERE au.email = 'skzaid00000@gmail.com'
    AND NOT EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = au.id
    )
    -- Skip if roll number already exists
    AND (
        LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) IS NULL
        OR NOT EXISTS (
            SELECT 1 FROM profiles p2
            WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
        )
    );

-- Step 3: Verify the profile was created
SELECT 
    'AFTER FIX' as status,
    p.id,
    p.full_name,
    p.roll_number,
    p.school,
    p.department,
    p.college_email,
    p.role,
    p.created_at,
    p.updated_at,
    CASE 
        WHEN p.id IS NOT NULL THEN '✅ PROFILE CREATED SUCCESSFULLY'
        ELSE '❌ STILL MISSING - Check for roll number conflict'
    END as result
FROM profiles p
WHERE p.college_email = 'skzaid00000@gmail.com';

-- Step 4: Final verification
SELECT 
    '=== TEST RESULT ===' as status,
    au.id as auth_id,
    au.email,
    p.id as profile_id,
    p.full_name,
    CASE 
        WHEN au.id IS NOT NULL AND p.id IS NOT NULL THEN '✅ LOGIN WILL WORK - Dashboard will load'
        WHEN au.id IS NOT NULL AND p.id IS NULL THEN '❌ STILL BROKEN - Profile missing (likely roll number conflict)'
        ELSE '❌ AUTH USER MISSING'
    END as login_status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'skzaid00000@gmail.com';

-- Step 5: If profile still missing, show why
SELECT 
    '=== IF STILL MISSING ===' as section,
    'Roll number conflict' as likely_reason,
    au.raw_user_meta_data->>'roll_number' as their_roll,
    (
        SELECT p2.college_email 
        FROM profiles p2 
        WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
        LIMIT 1
    ) as roll_already_owned_by
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'skzaid00000@gmail.com'
    AND p.id IS NULL;

SELECT 
    '=== NEXT STEPS ===' as message,
    'Ask user to logout and login: skzaid00000@gmail.com' as action_1,
    'Dashboard should now load properly' as expected_result_1,
    'Profile name should display correctly' as expected_result_2;
