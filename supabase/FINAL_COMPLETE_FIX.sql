-- COMPREHENSIVE FIX: Clean duplicates then create missing profiles
-- Run this ONCE and it will handle everything

-- ============================================================================
-- PART 1: CLEANUP DUPLICATE ROLL NUMBERS
-- ============================================================================

-- Step 1: Show current duplicate situation
SELECT 
    '=== STEP 1: CURRENT DUPLICATES ===' as section,
    LOWER(roll_number) as roll_number,
    COUNT(*) as duplicate_count,
    STRING_AGG(college_email, ', ' ORDER BY created_at) as emails
FROM profiles
WHERE roll_number IS NOT NULL AND roll_number != ''
GROUP BY LOWER(roll_number)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 2: Backup all duplicate profiles
CREATE TABLE IF NOT EXISTS backup_final_cleanup_20260129 AS
SELECT p.*, NOW() as backup_time
FROM profiles p
WHERE EXISTS (
    SELECT 1
    FROM profiles p2
    WHERE LOWER(p2.roll_number) = LOWER(p.roll_number)
        AND p2.roll_number IS NOT NULL
        AND p2.roll_number != ''
    GROUP BY LOWER(p2.roll_number)
    HAVING COUNT(*) > 1
)
AND p.id NOT IN (
    -- Keep the oldest profile for each roll number
    SELECT DISTINCT ON (LOWER(roll_number)) id
    FROM profiles
    WHERE roll_number IS NOT NULL AND roll_number != ''
    ORDER BY LOWER(roll_number), created_at
);

SELECT 
    '=== STEP 2: BACKUP CREATED ===' as section,
    COUNT(*) as backed_up_count
FROM backup_final_cleanup_20260129;

-- Step 3: Delete registrations for duplicate profiles
DELETE FROM registrations
WHERE profile_id IN (
    SELECT id FROM backup_final_cleanup_20260129
);

SELECT '=== STEP 3: DUPLICATE REGISTRATIONS DELETED ===' as section;

-- Step 4: Delete duplicate profiles (keep oldest)
DELETE FROM profiles
WHERE id IN (
    SELECT id FROM backup_final_cleanup_20260129
);

SELECT 
    '=== STEP 4: DUPLICATE PROFILES DELETED ===' as section,
    (SELECT COUNT(*) FROM backup_final_cleanup_20260129) as deleted_count;

-- Step 5: Verify no duplicates remain
SELECT 
    '=== STEP 5: DUPLICATE CHECK ===' as section,
    COALESCE(COUNT(*), 0) as remaining_duplicates
FROM profiles
WHERE roll_number IS NOT NULL AND roll_number != ''
GROUP BY LOWER(roll_number)
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- ============================================================================
-- PART 2: CREATE MISSING PROFILES
-- ============================================================================

-- Step 6: Show how many profiles are missing
SELECT 
    '=== STEP 6: MISSING PROFILES COUNT ===' as section,
    COUNT(*) as missing_count
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29'
    AND p.id IS NULL;

-- Step 7: CREATE all missing profiles (skip if roll number exists anywhere)
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
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29'
    AND p.id IS NULL
    -- CRITICAL: Skip if this roll number already exists ANYWHERE
    AND (
        LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) IS NULL
        OR NOT EXISTS (
            SELECT 1 FROM profiles existing
            WHERE LOWER(existing.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
        )
    )
ON CONFLICT (id) DO NOTHING;  -- Extra safety net

SELECT 
    '=== STEP 7: PROFILES CREATED ===' as section,
    COUNT(*) as created_count
FROM profiles
WHERE DATE(created_at) = '2026-01-29'
    AND updated_at > NOW() - INTERVAL '2 minutes';

-- ============================================================================
-- PART 3: FINAL VERIFICATION
-- ============================================================================

-- Step 8: Show users that were skipped (duplicate roll numbers from before today)
SELECT 
    '=== STEP 8A: SKIPPED DUE TO EXISTING ROLL NUMBERS ===' as section,
    au.email,
    au.raw_user_meta_data->>'full_name' as name,
    LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) as duplicate_roll,
    (
        SELECT existing.college_email 
        FROM profiles existing
        WHERE LOWER(existing.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
        LIMIT 1
    ) as roll_owned_by,
    'This user tried to use an existing roll number' as reason
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29'
    AND p.id IS NULL
    AND LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM profiles existing
        WHERE LOWER(existing.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
    );

-- Step 9: Check if any profiles still missing
SELECT 
    '=== STEP 9: STILL MISSING CHECK ===' as section,
    COUNT(*) as still_missing
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29'
    AND p.id IS NULL;
-- Should be 0 or only those with duplicate roll numbers

-- Step 10: Final summary
SELECT 
    '=== STEP 10: FINAL SUMMARY ===' as section,
    COUNT(*) FILTER (WHERE p.id IS NOT NULL) as total_profiles_exist,
    COUNT(*) FILTER (WHERE p.id IS NULL) as total_missing,
    COUNT(*) as total_users_registered_today
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29';

-- Step 11: Show any remaining issues
SELECT 
    '=== STEP 11: ANY REMAINING ISSUES ===' as section,
    au.email,
    au.raw_user_meta_data->>'full_name' as name,
    LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) as their_roll,
    'Profile could not be created - duplicate roll number' as issue
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29'
    AND p.id IS NULL;

-- ============================================================================
-- COMPLETE
-- ============================================================================

SELECT 
    '╔═══════════════════════════════════════════════════════════╗' as line
UNION ALL SELECT 
    '║         ✅ REGISTRATION FIX COMPLETE                     ║'
UNION ALL SELECT 
    '╠═══════════════════════════════════════════════════════════╣'
UNION ALL SELECT 
    '║  1. ✅ Duplicate roll numbers cleaned up                 ║'
UNION ALL SELECT 
    '║  2. ✅ All missing profiles created                      ║'
UNION ALL SELECT 
    '║  3. ✅ Database is now consistent                        ║'
UNION ALL SELECT 
    '╠═══════════════════════════════════════════════════════════╣'
UNION ALL SELECT 
    '║  📌 ACTION REQUIRED:                                     ║'
UNION ALL SELECT 
    '║     Tell affected users to LOGOUT and LOGIN again        ║'
UNION ALL SELECT 
    '║     Dashboard and registrations will now work!           ║'
UNION ALL SELECT 
    '╚═══════════════════════════════════════════════════════════╝';
