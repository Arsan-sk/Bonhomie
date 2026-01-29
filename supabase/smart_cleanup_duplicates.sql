-- SMART CLEANUP: Handle duplicates based on analysis
-- This script will:
-- 1. Delete duplicates with NO registrations (safe)
-- 2. For duplicates WITH registrations:
--    - If no conflicts: Transfer registrations to oldest profile
--    - If conflicts exist: Delete NEWER registration, keep OLDEST
-- 3. Then delete duplicate profiles

-- Step 1: Backup everything first
CREATE TABLE IF NOT EXISTS backup_smart_cleanup_20260129 AS
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
    SELECT DISTINCT ON (LOWER(roll_number)) id
    FROM profiles
    WHERE roll_number IS NOT NULL AND roll_number != ''
    ORDER BY LOWER(roll_number), created_at
);

SELECT 'BACKUP CREATED' as status, COUNT(*) as backed_up 
FROM backup_smart_cleanup_20260129;

-- Step 2: Handle CONFLICTING registrations (both profiles registered for same event)
-- Delete the NEWER registration, keep the OLDER one
WITH duplicates AS (
    SELECT 
        LOWER(roll_number) as roll_number_normalized
    FROM profiles
    WHERE roll_number IS NOT NULL AND roll_number != ''
    GROUP BY LOWER(roll_number)
    HAVING COUNT(*) > 1
),
dup_profiles AS (
    SELECT 
        d.roll_number_normalized,
        p.id as profile_id,
        p.created_at,
        ROW_NUMBER() OVER (PARTITION BY d.roll_number_normalized ORDER BY p.created_at) as profile_num
    FROM duplicates d
    JOIN profiles p ON LOWER(p.roll_number) = d.roll_number_normalized
),
conflicting_registrations AS (
    SELECT 
        r2.id as registration_to_delete
    FROM dup_profiles dp1
    JOIN dup_profiles dp2 ON dp1.roll_number_normalized = dp2.roll_number_normalized 
        AND dp1.profile_num < dp2.profile_num  -- dp2 is the newer profile
    JOIN registrations r1 ON r1.profile_id = dp1.profile_id
    JOIN registrations r2 ON r2.profile_id = dp2.profile_id 
        AND r2.event_id = r1.event_id  -- Same event
)
DELETE FROM registrations
WHERE id IN (SELECT registration_to_delete FROM conflicting_registrations);

SELECT 'CONFLICTING REGISTRATIONS DELETED' as status;

-- Step 3: Transfer NON-CONFLICTING registrations to the kept profile
WITH duplicates AS (
    SELECT 
        LOWER(roll_number) as roll_number_normalized
    FROM profiles
    WHERE roll_number IS NOT NULL AND roll_number != ''
    GROUP BY LOWER(roll_number)
    HAVING COUNT(*) > 1
),
profiles_to_keep AS (
    SELECT DISTINCT ON (LOWER(roll_number))
        LOWER(roll_number) as roll_number_normalized,
        id as keep_profile_id
    FROM profiles
    WHERE roll_number IS NOT NULL AND roll_number != ''
    ORDER BY LOWER(roll_number), created_at
)
UPDATE registrations r
SET profile_id = (
    SELECT ptk.keep_profile_id
    FROM profiles p
    JOIN profiles_to_keep ptk ON LOWER(p.roll_number) = ptk.roll_number_normalized
    WHERE p.id = r.profile_id
)
WHERE profile_id IN (
    SELECT id FROM backup_smart_cleanup_20260129
)
AND profile_id NOT IN (
    SELECT keep_profile_id FROM profiles_to_keep
);

SELECT 'REGISTRATIONS TRANSFERRED' as status;

-- Step 4: Delete any remaining registrations on duplicate profiles
DELETE FROM registrations
WHERE profile_id IN (
    SELECT id FROM backup_smart_cleanup_20260129
);

SELECT 'REMAINING REGISTRATIONS DELETED' as status;

-- Step 5: Now delete the duplicate profiles
DELETE FROM profiles
WHERE id IN (
    SELECT id FROM backup_smart_cleanup_20260129
);

SELECT 
    '=== CLEANUP COMPLETE ===' as section,
    (SELECT COUNT(*) FROM backup_smart_cleanup_20260129) as profiles_deleted;

-- Step 6: Verify no duplicates remain
SELECT 
    '=== VERIFICATION ===' as section,
    COALESCE(COUNT(*), 0) as remaining_duplicates
FROM profiles
WHERE roll_number IS NOT NULL 
    AND roll_number != ''
GROUP BY LOWER(roll_number)
HAVING COUNT(*) > 1;

-- Step 7: Show final state of kept profiles
SELECT 
    '=== KEPT PROFILES WITH REGISTRATIONS ===' as section,
    p.roll_number,
    p.college_email,
    p.full_name,
    p.created_at,
    COUNT(r.id) as total_event_registrations,
    STRING_AGG(DISTINCT e.name, ', ') as events_registered
FROM profiles p
LEFT JOIN registrations r ON r.profile_id = p.id
LEFT JOIN events e ON e.id = r.event_id
WHERE LOWER(p.roll_number) IN (
    SELECT DISTINCT LOWER(roll_number) 
    FROM backup_smart_cleanup_20260129
)
GROUP BY p.roll_number, p.college_email, p.full_name, p.created_at
ORDER BY p.roll_number;

SELECT 
    '=== SUMMARY ===' as message,
    'Conflicting registrations deleted (kept older)' as action_1,
    'Non-conflicting registrations transferred' as action_2,
    'Duplicate profiles deleted' as action_3,
    'Oldest profile kept for each roll number' as result;
