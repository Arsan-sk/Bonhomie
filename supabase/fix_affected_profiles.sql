-- FIX AFFECTED PROFILES
-- This repairs existing broken profiles by extracting data from auth.users metadata
-- 
-- Run this AFTER fix_registration_trigger.sql
-- This will fix users who registered since the problematic commit (2026-01-22)

-- Step 1: Create backup of affected profiles
CREATE TABLE IF NOT EXISTS profiles_backup_20260129 AS
SELECT * FROM profiles
WHERE created_at > '2026-01-22 00:00:00'
    AND (full_name IS NULL OR full_name = '' OR full_name = 'New User');

-- Verify backup was created
SELECT 
    COUNT(*) as backed_up_profiles,
    MIN(created_at) as oldest_backup,
    MAX(created_at) as newest_backup
FROM profiles_backup_20260129;

-- Step 2: Update profiles with data from auth.users metadata
UPDATE profiles p
SET 
    full_name = COALESCE(
        NULLIF(TRIM(au.raw_user_meta_data->>'full_name'), ''),
        'User'  -- Fallback if metadata is also empty
    ),
    roll_number = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')),
    school = NULLIF(TRIM(au.raw_user_meta_data->>'school'), ''),
    department = NULLIF(TRIM(au.raw_user_meta_data->>'department'), ''),
    program = NULLIF(TRIM(au.raw_user_meta_data->>'program'), ''),
    year_of_study = NULLIF(TRIM(au.raw_user_meta_data->>'year_of_study'), ''),
    admission_year = NULLIF(TRIM(au.raw_user_meta_data->>'admission_year'), ''),
    expected_passout_year = NULLIF(TRIM(au.raw_user_meta_data->>'expected_passout_year'), ''),
    phone = NULLIF(TRIM(au.raw_user_meta_data->>'phone'), ''),
    gender = NULLIF(TRIM(au.raw_user_meta_data->>'gender'), ''),
    updated_at = NOW()
FROM auth.users au
WHERE p.id = au.id
    AND p.created_at > '2026-01-22 00:00:00'
    AND (p.full_name = '' OR p.full_name IS NULL OR p.full_name = 'New User');

-- Step 3: Verify the fix
SELECT 
    '=== REPAIR RESULTS ===' as message,
    COUNT(*) as profiles_updated
FROM profiles p
WHERE p.created_at > '2026-01-22 00:00:00'
    AND p.updated_at > NOW() - INTERVAL '5 minutes'
    AND p.full_name IS NOT NULL 
    AND p.full_name != ''
    AND p.full_name != 'New User';

-- Step 4: Check if any profiles still have issues
SELECT 
    '=== REMAINING ISSUES ===' as message,
    COUNT(*) as still_broken,
    ARRAY_AGG(p.college_email) as affected_emails
FROM profiles p
WHERE p.created_at > '2026-01-22 00:00:00'
    AND (p.full_name IS NULL OR p.full_name = '' OR p.full_name = 'New User');

-- Step 5: Display sample of repaired profiles
SELECT 
    p.id,
    p.full_name,
    p.roll_number,
    p.school,
    p.department,
    p.college_email,
    p.created_at,
    p.updated_at,
    'REPAIRED' as status
FROM profiles p
WHERE p.created_at > '2026-01-22 00:00:00'
    AND p.updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY p.updated_at DESC
LIMIT 20;

-- Final summary
SELECT 
    '=== FIX COMPLETE ===' as message,
    'Affected profiles have been repaired' as result,
    'Users should now be able to:' as can_now,
    '1. See their dashboard without infinite loading' as feature_1,
    '2. View their correct name in the profile' as feature_2,
    '3. Register for events without foreign key errors' as feature_3,
    'Ask affected users to logout and login again' as action_required;

-- Optional: Drop backup table (uncomment if you want to keep it)
-- DROP TABLE IF EXISTS profiles_backup_20260129;
