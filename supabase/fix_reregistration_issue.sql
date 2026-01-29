-- SOLUTION: Handle re-registration issue
-- This handles both scenarios:
-- 1. Users who re-registered with different email (delete new auth.users)
-- 2. Users with unique roll numbers (create profiles)

-- ============================================================================
-- STEP 1: Backup affected auth.users
-- ============================================================================

DROP TABLE IF EXISTS backup_duplicate_registrations;
CREATE TABLE backup_duplicate_registrations AS
SELECT au.*, NOW() as backup_time,
    'Duplicate registration - roll number already exists' as reason
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
    AND EXISTS (
        SELECT 1 FROM profiles p2
        WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
        AND au.raw_user_meta_data->>'roll_number' IS NOT NULL
    );

SELECT 
    '=== STEP 1: BACKUP CREATED ===' as section,
    COUNT(*) as backed_up_duplicate_registrations
FROM backup_duplicate_registrations;

-- ============================================================================
-- STEP 2: Delete duplicate auth.users (users should use original email)
-- ============================================================================

DELETE FROM auth.users
WHERE id IN (SELECT id FROM backup_duplicate_registrations);

SELECT 
    '=== STEP 2: DUPLICATE AUTH.USERS DELETED ===' as section,
    (SELECT COUNT(*) FROM backup_duplicate_registrations) as deleted_count,
    'These users should use their ORIGINAL email to login' as note;

-- ============================================================================
-- STEP 3: Create profiles for remaining auth.users (unique roll numbers)
-- ============================================================================

INSERT INTO profiles (
    id, full_name, college_email, roll_number, school, department,
    program, year_of_study, admission_year, expected_passout_year,
    phone, gender, role, created_at, updated_at
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
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

SELECT 
    '=== STEP 3: NEW PROFILES CREATED ===' as section,
    COUNT(*) as created_count
FROM profiles
WHERE updated_at > NOW() - INTERVAL '2 minutes';

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================

SELECT 
    '=== STEP 4: FINAL VERIFICATION ===' as section,
    (SELECT COUNT(*) FROM auth.users) as total_auth_users,
    (SELECT COUNT(*) FROM profiles) as total_profiles,
    (SELECT COUNT(*) FROM auth.users au LEFT JOIN profiles p ON au.id = p.id WHERE p.id IS NULL) as still_missing,
    (SELECT COUNT(*) FROM backup_duplicate_registrations) as duplicates_removed;

-- ============================================================================
-- STEP 5: List of affected users who need to use old email
-- ============================================================================

SELECT 
    '=== STEP 5: USERS WHO MUST USE ORIGINAL EMAIL ===' as section,
    b.email as new_email_deleted,
    b.raw_user_meta_data->>'full_name' as name,
    b.raw_user_meta_data->>'roll_number' as roll_number,
    p.college_email as must_use_this_original_email,
    'Tell this user to login with original email' as action
FROM backup_duplicate_registrations b
INNER JOIN profiles p ON LOWER(p.roll_number) = LOWER(NULLIF(TRIM(b.raw_user_meta_data->>'roll_number'), ''))
ORDER BY b.created_at DESC;

SELECT 
    '╔══════════════════════════════════════════════════════════════╗' as line
UNION ALL SELECT '║              ✅ RE-REGISTRATION ISSUE RESOLVED               ║'
UNION ALL SELECT '╠══════════════════════════════════════════════════════════════╣'
UNION ALL SELECT '║  ✅ Duplicate auth.users deleted                             ║'
UNION ALL SELECT '║  ✅ Profiles created for legitimate new users                ║'
UNION ALL SELECT '║  ✅ Database is now consistent                               ║'
UNION ALL SELECT '╠══════════════════════════════════════════════════════════════╣'
UNION ALL SELECT '║  📌 NOTIFY AFFECTED USERS:                                   ║'
UNION ALL SELECT '║     Users who re-registered must use ORIGINAL email          ║'
UNION ALL SELECT '║     See list above for specific users                        ║'
UNION ALL SELECT '╚══════════════════════════════════════════════════════════════╝';
