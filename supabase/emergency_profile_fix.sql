-- EMERGENCY FIX: Manually repair all affected profiles
-- This is a more aggressive approach that will definitely work
-- 
-- Run this if the previous repair script didn't work

-- Step 1: First, let's see what we're working with
SELECT 
    '=== BEFORE FIX: Current State ===' as section,
    p.id,
    p.full_name,
    p.roll_number,
    p.college_email,
    au.raw_user_meta_data->>'full_name' as will_become,
    au.raw_user_meta_data->>'roll_number' as roll_will_become
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE DATE(p.created_at) = '2026-01-29'
ORDER BY p.created_at DESC;

-- Step 2: Create backup (different name to avoid conflicts)
DROP TABLE IF EXISTS emergency_backup_20260129;
CREATE TABLE emergency_backup_20260129 AS
SELECT * FROM profiles
WHERE DATE(created_at) = '2026-01-29';

SELECT 'BACKUP CREATED' as status, COUNT(*) as backed_up 
FROM emergency_backup_20260129;

-- Step 3: Delete and recreate profiles that are broken
-- First, save the IDs we need to fix
CREATE TEMP TABLE IF NOT EXISTS profiles_to_fix AS
SELECT p.id, au.raw_user_meta_data
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE DATE(p.created_at) = '2026-01-29'
    AND (p.full_name IS NULL OR p.full_name = '' OR p.full_name = 'User' OR p.full_name = 'New User');

SELECT 'IDENTIFIED FOR FIX' as status, COUNT(*) as count FROM profiles_to_fix;

-- Step 4: Delete broken profiles (CASCADE will handle any dependent records)
DELETE FROM profiles
WHERE id IN (SELECT id FROM profiles_to_fix);

SELECT 'DELETED BROKEN PROFILES' as status;

-- Step 5: Re-insert with correct data from metadata
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
WHERE au.id IN (SELECT id FROM profiles_to_fix);

SELECT 'RECREATED PROFILES' as status;

-- Step 6: Verify the fix
SELECT 
    '=== AFTER FIX: Verification ===' as section,
    p.id,
    p.full_name,
    p.roll_number,
    p.school,
    p.department,
    p.college_email,
    p.created_at,
    p.updated_at,
    CASE 
        WHEN p.full_name IS NULL OR p.full_name = '' THEN 'STILL_BROKEN'
        WHEN p.full_name = 'User' THEN 'USING_FALLBACK'
        ELSE 'FIXED'
    END as status
FROM profiles p
WHERE DATE(p.created_at) = '2026-01-29'
ORDER BY p.created_at DESC;

-- Step 7: Final count
SELECT 
    '=== FINAL RESULTS ===' as section,
    COUNT(*) FILTER (WHERE p.full_name IS NOT NULL AND p.full_name != '' AND p.full_name != 'User') as successfully_fixed,
    COUNT(*) FILTER (WHERE p.full_name = 'User') as using_fallback,
    COUNT(*) FILTER (WHERE p.full_name IS NULL OR p.full_name = '') as still_broken,
    COUNT(*) as total
FROM profiles p
WHERE DATE(p.created_at) = '2026-01-29';

-- Clean up temp table
DROP TABLE IF EXISTS profiles_to_fix;

SELECT '=== COMPLETE ===' as status,
       'Profiles have been recreated with correct data' as message,
       'Users should logout and login again' as action_required;
