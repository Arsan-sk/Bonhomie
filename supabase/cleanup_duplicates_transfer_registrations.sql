-- ALTERNATE: Cleanup duplicates by TRANSFERRING registrations to kept profile
-- This version keeps all registrations by moving them to the oldest profile
-- Use this if you want to preserve event registrations

-- Step 1: Show what will happen
WITH duplicates AS (
    SELECT 
        roll_number,
        COUNT(*) as dup_count
    FROM profiles
    WHERE roll_number IS NOT NULL 
        AND roll_number != ''
    GROUP BY roll_number
    HAVING COUNT(*) > 1
),
profile_info AS (
    SELECT 
        d.roll_number,
        p.id as profile_id,
        p.college_email,
        COUNT(r.id) as reg_count,
        ROW_NUMBER() OVER (PARTITION BY LOWER(d.roll_number) ORDER BY p.created_at) as row_num
    FROM duplicates d
    JOIN profiles p ON LOWER(p.roll_number) = LOWER(d.roll_number)
    LEFT JOIN registrations r ON r.profile_id = p.id
    GROUP BY d.roll_number, p.id, p.college_email, p.created_at
)
SELECT 
    '=== REGISTRATION TRANSFER PLAN ===' as section,
    pi.roll_number,
    pi.profile_id,
    pi.college_email,
    pi.reg_count,
    CASE 
        WHEN pi.row_num = 1 THEN 'KEEP - Will receive transferred registrations'
        ELSE 'DELETE - Registrations will be transferred'
    END as action
FROM profile_info pi
ORDER BY pi.roll_number, pi.row_num;

-- Step 2: Get the profile IDs to keep (oldest for each roll number)
CREATE TEMP TABLE IF NOT EXISTS profiles_to_keep AS
SELECT DISTINCT ON (LOWER(roll_number))
    LOWER(roll_number) as roll_number_normalized,
    id as keep_profile_id
FROM profiles
WHERE roll_number IS NOT NULL AND roll_number != ''
ORDER BY LOWER(roll_number), created_at;

-- Step 3: Transfer registrations FROM duplicates TO kept profile
UPDATE registrations r
SET profile_id = (
    SELECT ptk.keep_profile_id
    FROM profiles p
    JOIN profiles_to_keep ptk ON LOWER(p.roll_number) = ptk.roll_number_normalized
    WHERE p.id = r.profile_id
)
WHERE profile_id IN (
    -- Duplicate profiles (not the kept ones)
    SELECT p.id
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
    AND p.id NOT IN (SELECT keep_profile_id FROM profiles_to_keep)
);

-- Step 4: Backup profiles that will be deleted
CREATE TABLE IF NOT EXISTS backup_transferred_duplicates_20260129 AS
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
AND p.id NOT IN (SELECT keep_profile_id FROM profiles_to_keep);

SELECT 'BACKUP CREATED' as status, COUNT(*) as count 
FROM backup_transferred_duplicates_20260129;

-- Step 5: DELETE duplicate profiles (registrations already transferred)
DELETE FROM profiles
WHERE id IN (
    SELECT id FROM backup_transferred_duplicates_20260129
);

-- Step 6: Verify
SELECT 
    '=== RESULTS ===' as section,
    (SELECT COUNT(*) FROM backup_transferred_duplicates_20260129) as profiles_deleted,
    (SELECT COUNT(*) FROM profiles WHERE roll_number IS NOT NULL GROUP BY roll_number HAVING COUNT(*) > 1) as remaining_duplicates;

-- Step 7: Show kept profiles with their total registrations
SELECT 
    '=== KEPT PROFILES WITH REGISTRATIONS ===' as section,
    p.roll_number,
    p.college_email,
    p.full_name,
    COUNT(r.id) as total_registrations
FROM profiles p
LEFT JOIN registrations r ON r.profile_id = p.id
WHERE LOWER(p.roll_number) IN (
    SELECT roll_number_normalized FROM profiles_to_keep
)
GROUP BY p.roll_number, p.college_email, p.full_name
ORDER BY p.roll_number;

DROP TABLE IF EXISTS profiles_to_keep;

SELECT '=== COMPLETE ===' as status,
       'Registrations transferred, duplicates deleted' as result;
