-- FIND AND CLEANUP DUPLICATE ROLL NUMBERS
-- This identifies all duplicate roll numbers in the system

-- Query 1: Find all duplicate roll numbers
SELECT 
    '=== DUPLICATE ROLL NUMBERS ===' as section,
    roll_number,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(college_email ORDER BY created_at) as emails,
    ARRAY_AGG(id ORDER BY created_at) as profile_ids,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM profiles
WHERE roll_number IS NOT NULL 
    AND roll_number != ''
GROUP BY roll_number
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Query 2: Specifically check roll number 23DS34 (case-insensitive)
SELECT 
    '=== ROLL NUMBER 23DS34 DETAILS ===' as section,
    p.id,
    p.full_name,
    p.college_email,
    p.roll_number,
    p.school,
    p.department,
    p.created_at,
    au.email as auth_email,
    au.raw_user_meta_data->>'full_name' as original_name,
    ROW_NUMBER() OVER (PARTITION BY LOWER(p.roll_number) ORDER BY p.created_at) as row_num
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE LOWER(p.roll_number) = '23ds34'
ORDER BY p.created_at;

-- Query 3: Find ALL users from today with duplicate roll numbers
SELECT 
    '=== TODAY DUPLICATES ===' as section,
    p.roll_number,
    COUNT(*) as count,
    ARRAY_AGG(p.college_email ORDER BY p.created_at) as emails
FROM profiles p
WHERE DATE(p.created_at) = '2026-01-29'
    AND p.roll_number IS NOT NULL
GROUP BY p.roll_number
HAVING COUNT(*) > 1;

-- Query 4: Check auth.users with missing profiles (our 37)
SELECT 
    '=== MISSING PROFILES WITH ROLL NUMBERS ===' as section,
    au.id,
    au.email,
    au.raw_user_meta_data->>'roll_number' as would_use_roll,
    au.raw_user_meta_data->>'full_name' as would_use_name,
    au.created_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29'
    AND p.id IS NULL
ORDER BY au.created_at DESC;
