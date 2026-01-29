-- DIAGNOSE SPECIFIC USER: skzaid00000@gmail.com
-- Error: "cannot read properties of null reading full_name"
-- This means the profile is NULL (doesn't exist)

-- Query 1: Check if auth.users record exists
SELECT 
    '=== 1. AUTH.USERS CHECK ===' as section,
    au.id,
    au.email,
    au.created_at,
    au.email_confirmed_at,
    au.raw_user_meta_data,
    CASE WHEN au.id IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM auth.users au
WHERE au.email = 'skzaid00000@gmail.com';

-- Query 2: Check if profile exists
SELECT 
    '=== 2. PROFILE CHECK ===' as section,
    p.id,
    p.full_name,
    p.roll_number,
    p.school,
    p.department,
    p.college_email,
    p.created_at,
    p.updated_at,
    CASE WHEN p.id IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM profiles p
WHERE p.college_email = 'skzaid00000@gmail.com';

-- Query 3: Join to see the exact problem
SELECT 
    '=== 3. THE PROBLEM ===' as section,
    au.id as auth_user_id,
    au.email,
    au.created_at as auth_created_at,
    p.id as profile_id,
    p.full_name,
    p.created_at as profile_created_at,
    CASE 
        WHEN au.id IS NOT NULL AND p.id IS NULL THEN '❌ PROFILE MISSING - THIS IS THE BUG'
        WHEN au.id IS NOT NULL AND p.id IS NOT NULL THEN '✅ BOTH EXIST - No issue'
        WHEN au.id IS NULL THEN '❌ AUTH USER MISSING'
    END as diagnosis
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'skzaid00000@gmail.com';

-- Query 4: Check metadata available for profile creation
SELECT 
    '=== 4. METADATA FOR PROFILE CREATION ===' as section,
    au.id,
    au.email,
    au.raw_user_meta_data->>'full_name' as meta_full_name,
    au.raw_user_meta_data->>'roll_number' as meta_roll_number,
    au.raw_user_meta_data->>'school' as meta_school,
    au.raw_user_meta_data->>'department' as meta_department,
    au.raw_user_meta_data->>'program' as meta_program,
    au.raw_user_meta_data->>'year_of_study' as meta_year,
    au.raw_user_meta_data->>'phone' as meta_phone,
    au.raw_user_meta_data->>'gender' as meta_gender
FROM auth.users au
WHERE au.email = 'skzaid00000@gmail.com';

-- Query 5: Check if roll number conflict
SELECT 
    '=== 5. ROLL NUMBER CONFLICT CHECK ===' as section,
    au.raw_user_meta_data->>'roll_number' as wants_to_use_roll,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM profiles p2
            WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
            AND au.raw_user_meta_data->>'roll_number' IS NOT NULL
        ) THEN '⚠️ CONFLICT - Roll number already exists'
        WHEN au.raw_user_meta_data->>'roll_number' IS NULL OR au.raw_user_meta_data->>'roll_number' = ''
        THEN 'ℹ️ NO ROLL NUMBER in metadata'
        ELSE '✅ SAFE - Roll number available'
    END as roll_status,
    (
        SELECT p2.college_email 
        FROM profiles p2 
        WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
        LIMIT 1
    ) as roll_owned_by
FROM auth.users au
WHERE au.email = 'skzaid00000@gmail.com';

-- Query 6: Show complete raw metadata
SELECT 
    '=== 6. COMPLETE RAW METADATA ===' as section,
    raw_user_meta_data::text as full_metadata
FROM auth.users
WHERE email = 'skzaid00000@gmail.com';
