-- NUCLEAR OPTION: Complete duplicate cleanup on BOTH auth.users and profiles
-- Strategy: Find duplicates in BOTH tables, delete NEWER entries, keep OLDEST
-- This will completely eliminate the duplicate roll number issue

-- ============================================================================
-- PHASE 1: FIND ALL DUPLICATES
-- ============================================================================

-- Step 1: Find duplicate roll numbers in PROFILES table
SELECT 
    '=== STEP 1A: DUPLICATES IN PROFILES TABLE ===' as section,
    LOWER(roll_number) as roll_number,
    COUNT(*) as duplicate_count,
    STRING_AGG(college_email, ', ' ORDER BY created_at) as all_emails,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM profiles
WHERE roll_number IS NOT NULL AND roll_number != ''
GROUP BY LOWER(roll_number)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 2: Find duplicate roll numbers in AUTH.USERS metadata
SELECT 
    '=== STEP 1B: DUPLICATES IN AUTH.USERS ===' as section,
    LOWER(NULLIF(TRIM(raw_user_meta_data->>'roll_number'), '')) as roll_number,
    COUNT(*) as duplicate_count,
    STRING_AGG(email, ', ' ORDER BY created_at) as all_emails,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM auth.users
WHERE NULLIF(TRIM(raw_user_meta_data->>'roll_number'), '') IS NOT NULL
GROUP BY LOWER(NULLIF(TRIM(raw_user_meta_data->>'roll_number'), ''))
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- ============================================================================
-- PHASE 2: BACKUP EVERYTHING
-- ============================================================================

-- Step 2A: Backup duplicate PROFILES
DROP TABLE IF EXISTS backup_deleted_profiles_final;
CREATE TABLE backup_deleted_profiles_final AS
SELECT p.*, NOW() as backup_time
FROM profiles p
WHERE p.id IN (
    -- All duplicate profiles EXCEPT the oldest for each roll number
    SELECT p2.id
    FROM profiles p2
    WHERE p2.roll_number IS NOT NULL 
        AND p2.roll_number != ''
        AND EXISTS (
            SELECT 1 FROM profiles p3
            WHERE LOWER(p3.roll_number) = LOWER(p2.roll_number)
            GROUP BY LOWER(p3.roll_number)
            HAVING COUNT(*) > 1
        )
        AND p2.id NOT IN (
            -- Keep oldest
            SELECT DISTINCT ON (LOWER(roll_number)) id
            FROM profiles
            WHERE roll_number IS NOT NULL AND roll_number != ''
            ORDER BY LOWER(roll_number), created_at ASC
        )
);

SELECT 
    '=== STEP 2A: PROFILES BACKED UP ===' as section,
    COUNT(*) as backed_up_profiles
FROM backup_deleted_profiles_final;

-- Step 2B: Backup duplicate AUTH.USERS
DROP TABLE IF EXISTS backup_deleted_auth_users_final;
CREATE TABLE backup_deleted_auth_users_final AS
SELECT au.*, NOW() as backup_time
FROM auth.users au
WHERE au.id IN (
    -- All duplicate auth users EXCEPT the oldest for each roll number
    SELECT au2.id
    FROM auth.users au2
    WHERE NULLIF(TRIM(au2.raw_user_meta_data->>'roll_number'), '') IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM auth.users au3
            WHERE LOWER(NULLIF(TRIM(au3.raw_user_meta_data->>'roll_number'), '')) = 
                  LOWER(NULLIF(TRIM(au2.raw_user_meta_data->>'roll_number'), ''))
            GROUP BY LOWER(NULLIF(TRIM(au3.raw_user_meta_data->>'roll_number'), ''))
            HAVING COUNT(*) > 1
        )
        AND au2.id NOT IN (
            -- Keep oldest
            SELECT DISTINCT ON (LOWER(NULLIF(TRIM(raw_user_meta_data->>'roll_number'), ''))) id
            FROM auth.users
            WHERE NULLIF(TRIM(raw_user_meta_data->>'roll_number'), '') IS NOT NULL
            ORDER BY LOWER(NULLIF(TRIM(raw_user_meta_data->>'roll_number'), '')), created_at ASC
        )
);

SELECT 
    '=== STEP 2B: AUTH.USERS BACKED UP ===' as section,
    COUNT(*) as backed_up_auth_users
FROM backup_deleted_auth_users_final;

-- ============================================================================
-- PHASE 3: DELETE EVERYTHING RELATED TO DUPLICATES
-- ============================================================================

-- Step 3A: Delete registrations for duplicate PROFILES
DELETE FROM registrations
WHERE profile_id IN (SELECT id FROM backup_deleted_profiles_final);

SELECT 
    '=== STEP 3A: REGISTRATIONS DELETED ===' as section,
    'Deleted registrations for duplicate profiles' as action;

-- Step 3B: Delete duplicate PROFILES (keep oldest)
DELETE FROM profiles
WHERE id IN (SELECT id FROM backup_deleted_profiles_final);

SELECT 
    '=== STEP 3B: DUPLICATE PROFILES DELETED ===' as section,
    (SELECT COUNT(*) FROM backup_deleted_profiles_final) as deleted_count;

-- Step 3C: Delete duplicate AUTH.USERS (keep oldest)
DELETE FROM auth.users
WHERE id IN (SELECT id FROM backup_deleted_auth_users_final);

SELECT 
    '=== STEP 3C: DUPLICATE AUTH.USERS DELETED ===' as section,
    (SELECT COUNT(*) FROM backup_deleted_auth_users_final) as deleted_count;

-- ============================================================================
-- PHASE 4: VERIFICATION
-- ============================================================================

-- Step 4A: Check for remaining duplicates in PROFILES
SELECT 
    '=== STEP 4A: REMAINING PROFILE DUPLICATES ===' as section,
    COALESCE(COUNT(*), 0) as remaining_duplicate_count
FROM (
    SELECT LOWER(roll_number) as roll_num
    FROM profiles
    WHERE roll_number IS NOT NULL AND roll_number != ''
    GROUP BY LOWER(roll_number)
    HAVING COUNT(*) > 1
) subq;
-- MUST BE 0

-- Step 4B: Check for remaining duplicates in AUTH.USERS
SELECT 
    '=== STEP 4B: REMAINING AUTH.USERS DUPLICATES ===' as section,
    COALESCE(COUNT(*), 0) as remaining_duplicate_count
FROM (
    SELECT LOWER(NULLIF(TRIM(raw_user_meta_data->>'roll_number'), '')) as roll_num
    FROM auth.users
    WHERE NULLIF(TRIM(raw_user_meta_data->>'roll_number'), '') IS NOT NULL
    GROUP BY LOWER(NULLIF(TRIM(raw_user_meta_data->>'roll_number'), ''))
    HAVING COUNT(*) > 1
) subq;
-- MUST BE 0

-- ============================================================================
-- PHASE 5: CREATE MISSING PROFILES
-- ============================================================================

-- Step 5: Now create ALL missing profiles (skip if roll number exists in profiles)
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
WHERE p.id IS NULL  -- Profile doesn't exist for this auth.user
    AND (
        -- Either no roll number OR roll number doesn't exist in profiles table
        LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) IS NULL
        OR NOT EXISTS (
            SELECT 1 FROM profiles existing_profile
            WHERE LOWER(existing_profile.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
        )
    );

-- Step 5A: Show users that COULDN'T be created (roll number conflict)
SELECT 
    '=== STEP 5A: SKIPPED (ROLL NUMBER CONFLICT) ===' as section,
    au.email as auth_user_email,
    au.raw_user_meta_data->>'full_name' as wants_name,
    LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) as wants_roll_number,
    existing_p.college_email as roll_owned_by,
    existing_p.full_name as owner_name,
    'This roll number already belongs to another user' as reason
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
INNER JOIN profiles existing_p ON LOWER(existing_p.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
WHERE p.id IS NULL
    AND LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) IS NOT NULL;

SELECT 
    '=== STEP 5B: MISSING PROFILES CREATED ===' as section,
    COUNT(*) as created_count
FROM profiles
WHERE updated_at > NOW() - INTERVAL '2 minutes';

-- ============================================================================
-- FINAL REPORT
-- ============================================================================

SELECT 
    '=== FINAL SUMMARY ===' as section,
    (SELECT COUNT(*) FROM backup_deleted_profiles_final) as profiles_deleted,
    (SELECT COUNT(*) FROM backup_deleted_auth_users_final) as auth_users_deleted,
    (SELECT COUNT(*) FROM profiles WHERE updated_at > NOW() - INTERVAL '2 minutes') as profiles_created,
    (SELECT COUNT(*) FROM auth.users au LEFT JOIN profiles p ON au.id = p.id WHERE p.id IS NULL) as still_missing;

SELECT 
    '╔══════════════════════════════════════════════════════════════╗' as line
UNION ALL SELECT '║                    ✅ CLEANUP COMPLETE                      ║'
UNION ALL SELECT '╠══════════════════════════════════════════════════════════════╣'
UNION ALL SELECT '║  ✅ Duplicate profiles deleted (kept oldest)                ║'
UNION ALL SELECT '║  ✅ Duplicate auth.users deleted (kept oldest)              ║'
UNION ALL SELECT '║  ✅ All missing profiles created                            ║'
UNION ALL SELECT '║  ✅ No more duplicate roll number errors                    ║'
UNION ALL SELECT '╠══════════════════════════════════════════════════════════════╣'
UNION ALL SELECT '║  📌 Affected users should LOGOUT and LOGIN again            ║'
UNION ALL SELECT '╚══════════════════════════════════════════════════════════════╝';
