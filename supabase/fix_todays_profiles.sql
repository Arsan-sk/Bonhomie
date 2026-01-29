-- FIX AFFECTED PROFILES - UPDATED FOR TODAY'S REGISTRATIONS
-- This repairs existing broken profiles by extracting data from auth.users metadata
-- 
-- Updated to specifically target today's date (2026-01-29)
-- Run this AFTER fix_registration_trigger.sql

-- Step 1: Create backup of affected profiles from today
CREATE TABLE IF NOT EXISTS profiles_backup_20260129_v2 AS
SELECT * FROM profiles
WHERE DATE(created_at) = '2026-01-29'
    AND (full_name IS NULL OR full_name = '' OR full_name = 'New User');

-- Verify backup was created
SELECT 
    'BACKUP CREATED' as status,
    COUNT(*) as backed_up_profiles,
    MIN(created_at) as oldest_backup,
    MAX(created_at) as newest_backup
FROM profiles_backup_20260129_v2;

-- Step 2: Show what will be updated (DRY RUN)
SELECT 
    '=== PROFILES THAT WILL BE UPDATED ===' as section,
    p.id,
    p.full_name as current_name,
    COALESCE(
        NULLIF(TRIM(au.raw_user_meta_data->>'full_name'), ''),
        'User'
    ) as new_name,
    p.roll_number as current_roll,
    LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) as new_roll,
    p.college_email
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE DATE(p.created_at) = '2026-01-29'
    AND (p.full_name = '' OR p.full_name IS NULL OR p.full_name = 'New User');

-- Step 3: Update profiles with data from auth.users metadata
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
    AND DATE(p.created_at) = '2026-01-29'
    AND (p.full_name = '' OR p.full_name IS NULL OR p.full_name = 'New User');

-- Step 4: Verify the fix
SELECT 
    '=== REPAIR RESULTS ===' as message,
    COUNT(*) as profiles_updated,
    ARRAY_AGG(p.full_name) FILTER (WHERE p.full_name IS NOT NULL AND p.full_name != 'User') as updated_names
FROM profiles p
WHERE DATE(p.created_at) = '2026-01-29'
    AND p.updated_at > NOW() - INTERVAL '5 minutes'
    AND p.full_name IS NOT NULL 
    AND p.full_name != ''
    AND p.full_name != 'New User';

-- Step 5: Check if any profiles still have issues
SELECT 
    '=== REMAINING ISSUES ===' as message,
    COUNT(*) as still_broken,
    ARRAY_AGG(p.college_email) as affected_emails
FROM profiles p
WHERE DATE(p.created_at) = '2026-01-29'
    AND (p.full_name IS NULL OR p.full_name = '' OR p.full_name = 'New User');

-- Step 6: Display sample of repaired profiles
SELECT 
    '=== REPAIRED PROFILES ===' as section,
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
WHERE DATE(p.created_at) = '2026-01-29'
    AND p.updated_at > NOW() - INTERVAL '5 minutes'
    AND p.full_name IS NOT NULL
    AND p.full_name != ''
    AND p.full_name != 'New User'
ORDER BY p.updated_at DESC;

-- Final summary
SELECT 
    '=== FIX COMPLETE ===' as message,
    'Affected profiles from 2026-01-29 have been repaired' as result,
    'Users should now be able to:' as can_now,
    '1. See their dashboard without infinite loading' as feature_1,
    '2. View their correct name in the profile' as feature_2,
    '3. Register for events without foreign key errors' as feature_3,
    'Ask affected users to logout and login again' as action_required;

-- Optional: Show the backup table info (for potential rollback)
SELECT 
    '=== BACKUP TABLE INFO ===' as section,
    'profiles_backup_20260129_v2' as backup_table_name,
    'To rollback, restore from this backup table' as rollback_info;
