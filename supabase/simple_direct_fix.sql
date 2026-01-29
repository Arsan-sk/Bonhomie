-- SIMPLE DIRECT FIX: Just update the damn profiles
-- This is the simplest possible approach - direct UPDATE with explicit values
-- 
-- Use this if you want a less aggressive fix than the emergency delete/recreate

-- Step 1: Show current broken state
SELECT 
    'CURRENT BROKEN PROFILES' as status,
    p.id,
    p.full_name as current_name,
    p.roll_number as current_roll,
    p.college_email,
    au.raw_user_meta_data->>'full_name' as metadata_name,
    au.raw_user_meta_data->>'roll_number' as metadata_roll
FROM profiles p
JOIN auth.users au ON p.id = au.id  
WHERE DATE(p.created_at) = '2026-01-29'
    AND (p.full_name IS NULL OR p.full_name = '' OR p.full_name = 'User' OR p.full_name = 'New User');

-- Step 2: Backup  
CREATE TABLE IF NOT EXISTS simple_backup_20260129 AS
SELECT * FROM profiles WHERE DATE(created_at) = '2026-01-29';

SELECT 'BACKUP CREATED' as status;

-- Step 3: THE FIX - Simple direct UPDATE
UPDATE profiles
SET
    full_name = (
        SELECT COALESCE(
            NULLIF(TRIM(au.raw_user_meta_data->>'full_name'), ''),
            'User'
        )
        FROM auth.users au 
        WHERE au.id = profiles.id
    ),
    roll_number = (
        SELECT LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
        FROM auth.users au
        WHERE au.id = profiles.id
    ),
    school = (
        SELECT NULLIF(TRIM(au.raw_user_meta_data->>'school'), '')
        FROM auth.users au
        WHERE au.id = profiles.id
    ),
    department = (
        SELECT NULLIF(TRIM(au.raw_user_meta_data->>'department'), '')
        FROM auth.users au
        WHERE au.id = profiles.id
    ),
    program = (
        SELECT NULLIF(TRIM(au.raw_user_meta_data->>'program'), '')
        FROM auth.users au
        WHERE au.id = profiles.id
    ),
    year_of_study = (
        SELECT NULLIF(TRIM(au.raw_user_meta_data->>'year_of_study'), '')
        FROM auth.users au
        WHERE au.id = profiles.id
    ),
    admission_year = (
        SELECT NULLIF(TRIM(au.raw_user_meta_data->>'admission_year'), '')
        FROM auth.users au
        WHERE au.id = profiles.id
    ),
    expected_passout_year = (
        SELECT NULLIF(TRIM(au.raw_user_meta_data->>'expected_passout_year'), '')
        FROM auth.users au
        WHERE au.id = profiles.id
    ),
    phone = (
        SELECT NULLIF(TRIM(au.raw_user_meta_data->>'phone'), '')
        FROM auth.users au
        WHERE au.id = profiles.id
    ),
    gender = (
        SELECT NULLIF(TRIM(au.raw_user_meta_data->>'gender'), '')
        FROM auth.users au
        WHERE au.id = profiles.id
    ),
    updated_at = NOW()
WHERE DATE(profiles.created_at) = '2026-01-29'
    AND (profiles.full_name IS NULL OR profiles.full_name = '' OR profiles.full_name = 'User' OR profiles.full_name = 'New User');

-- Step 4: Show results
SELECT 
    'AFTER UPDATE' as status,
    p.id,
    p.full_name as updated_name,
    p.roll_number as updated_roll,
    p.school,
    p.department,
    p.college_email,
    p.updated_at,
    CASE
        WHEN p.full_name IS NOT NULL AND p.full_name != '' AND p.full_name != 'User' THEN 'FIXED'
        WHEN p.full_name = 'User' THEN 'FALLBACK_USED'
        ELSE 'STILL_BROKEN'
    END as fix_status
FROM profiles p
WHERE DATE(p.created_at) = '2026-01-29'
ORDER BY p.created_at DESC;

-- Step 5: Count results
SELECT 
    'RESULTS' as section,
    COUNT(*) FILTER (WHERE full_name IS NOT NULL AND full_name != '' AND full_name NOT IN ('User', 'New User')) as fixed_with_real_name,
    COUNT(*) FILTER (WHERE full_name = 'User') as fixed_with_fallback,
    COUNT(*) FILTER (WHERE full_name IS NULL OR full_name = '' OR full_name = 'New User') as still_broken,
    COUNT(*) as total
FROM profiles
WHERE DATE(created_at) = '2026-01-29';

SELECT 
    'COMPLETE' as status,
    'If still broken, run emergency_profile_fix.sql instead' as next_action;
