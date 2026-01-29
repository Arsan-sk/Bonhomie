-- SPECIFIC USER DIAGNOSTIC: shlharsan@gmail.com
-- This will show us exactly what's wrong with this one user

-- Query 1: Check if auth.users record exists
SELECT 
    '=== AUTH.USERS CHECK ===' as section,
    au.id,
    au.email,
    au.created_at,
    au.raw_user_meta_data,
    CASE WHEN au.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM auth.users au
WHERE au.email = 'shlharsan@gmail.com';

-- Query 2: Check if profile exists
SELECT 
    '=== PROFILE CHECK ===' as section,
    p.id,
    p.full_name,
    p.roll_number,
    p.school,
    p.department,
    p.college_email,
    p.created_at,
    CASE WHEN p.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM profiles p
WHERE p.college_email = 'shlharsan@gmail.com';

-- Query 3: Join to see the mismatch
SELECT 
    '=== THE PROBLEM ===' as section,
    au.id as auth_user_id,
    au.email,
    au.created_at as auth_created_at,
    p.id as profile_id,
    p.full_name,
    p.created_at as profile_created_at,
    CASE 
        WHEN au.id IS NOT NULL AND p.id IS NULL THEN '❌ PROFILE MISSING - THIS IS THE BUG'
        WHEN au.id IS NOT NULL AND p.id IS NOT NULL THEN '✅ BOTH EXIST'
        WHEN au.id IS NULL THEN '❌ AUTH USER MISSING'
    END as diagnosis
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'shlharsan@gmail.com';

-- Query 4: Show what metadata we have to create the profile
SELECT 
    '=== METADATA AVAILABLE FOR PROFILE CREATION ===' as section,
    au.id,
    au.email,
    au.raw_user_meta_data->>'full_name' as will_use_full_name,
    au.raw_user_meta_data->>'roll_number' as will_use_roll_number,
    au.raw_user_meta_data->>'school' as will_use_school,
    au.raw_user_meta_data->>'department' as will_use_department,
    au.raw_user_meta_data->>'program' as will_use_program,
    au.raw_user_meta_data->>'year_of_study' as will_use_year,
    au.raw_user_meta_data->>'phone' as will_use_phone,
    au.raw_user_meta_data->>'gender' as will_use_gender,
    au.raw_user_meta_data->>'role' as will_use_role
FROM auth.users au
WHERE au.email = 'shlharsan@gmail.com';

-- Query 5: Check if there are any registrations attempted (will fail due to FK constraint)
SELECT 
    '=== REGISTRATION ATTEMPTS ===' as section,
    r.*
FROM registrations r
JOIN auth.users au ON r.profile_id = au.id
WHERE au.email = 'shlharsan@gmail.com';
