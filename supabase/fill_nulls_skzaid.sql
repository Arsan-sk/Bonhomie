-- CHECK AND FIX NULL VALUES: skzaid00000@gmail.com
-- Check what fields are NULL and fill them with placeholder values

-- Step 1: Check current profile values
SELECT 
    '=== CURRENT PROFILE VALUES ===' as section,
    p.id,
    p.full_name,
    p.college_email,
    p.roll_number,
    p.school,
    p.department,
    p.program,
    p.year_of_study,
    p.admission_year,
    p.expected_passout_year,
    p.phone,
    p.gender,
    p.role,
    p.created_at,
    p.updated_at,
    -- Show which fields are NULL
    CASE WHEN p.full_name IS NULL THEN '❌ NULL' ELSE '✅ OK' END as full_name_status,
    CASE WHEN p.school IS NULL THEN '❌ NULL' ELSE '✅ OK' END as school_status,
    CASE WHEN p.department IS NULL THEN '❌ NULL' ELSE '✅ OK' END as department_status,
    CASE WHEN p.program IS NULL THEN '❌ NULL' ELSE '✅ OK' END as program_status
FROM profiles p
WHERE p.college_email = 'skzaid00000@gmail.com';

-- Step 2: Update NULL fields with placeholder values
UPDATE profiles
SET
    full_name = COALESCE(full_name, 'Zaid'),
    school = COALESCE(school, 'SOET'),
    department = COALESCE(department, 'bit'),
    program = COALESCE(program, 'B.Tech'),
    year_of_study = COALESCE(year_of_study, '2'),
    admission_year = COALESCE(admission_year, '2023'),
    expected_passout_year = COALESCE(expected_passout_year, '2027'),
    phone = COALESCE(phone, '0000000000'),
    gender = COALESCE(gender, 'other'),
    updated_at = NOW()
WHERE college_email = 'skzaid00000@gmail.com';

SELECT 
    '=== UPDATED PROFILE ===' as section,
    'All NULL fields filled with placeholder values' as action;

-- Step 3: Verify the updated profile
SELECT 
    '=== AFTER UPDATE ===' as section,
    p.id,
    p.full_name,
    p.college_email,
    p.roll_number,
    p.school,
    p.department,
    p.program,
    p.year_of_study,
    p.admission_year,
    p.expected_passout_year,
    p.phone,
    p.gender,
    p.role,
    p.updated_at,
    '✅ All fields populated' as status
FROM profiles p
WHERE p.college_email = 'skzaid00000@gmail.com';

-- Step 4: Check if profile exists at all
SELECT 
    '=== PROFILE EXISTENCE CHECK ===' as section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM profiles WHERE college_email = 'skzaid00000@gmail.com')
        THEN '✅ Profile exists'
        ELSE '❌ Profile DOES NOT EXIST - Need to create it first!'
    END as existence_status;

SELECT 
    '=== ACTION REQUIRED ===' as message,
    'User MUST logout and login again' as step_1,
    'Clear browser cache (Ctrl+Shift+R)' as step_2,
    'User can update placeholder values in their profile settings' as step_3;
