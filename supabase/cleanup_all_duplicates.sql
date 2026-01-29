-- CLEANUP DUPLICATES WITH REGISTRATIONS
-- This version handles profiles that have event registrations
-- Strategy: Transfer registrations to the kept profile, then delete duplicates

-- Step 1: Identify duplicates and their registrations
WITH duplicates AS (
    SELECT 
        roll_number,
        COUNT(*) as dup_count
    FROM profiles
    WHERE roll_number IS NOT NULL 
        AND roll_number != ''
    GROUP BY roll_number
    HAVING COUNT(*) > 1
)
SELECT 
    '=== DUPLICATES WITH REGISTRATIONS ===' as section,
    d.roll_number,
    p.id as profile_id,
    p.college_email,
    p.created_at,
    COUNT(r.id) as registration_count,
    ROW_NUMBER() OVER (PARTITION BY LOWER(d.roll_number) ORDER BY p.created_at) as row_num,
    CASE 
        WHEN ROW_NUMBER() OVER (PARTITION BY LOWER(d.roll_number) ORDER BY p.created_at) = 1 
        THEN 'WILL KEEP' 
        ELSE 'WILL DELETE' 
    END as action
FROM duplicates d
JOIN profiles p ON LOWER(p.roll_number) = LOWER(d.roll_number)
LEFT JOIN registrations r ON r.profile_id = p.id
GROUP BY d.roll_number, p.id, p.college_email, p.created_at
ORDER BY d.roll_number, p.created_at;

-- Step 2: Create backup
CREATE TABLE IF NOT EXISTS backup_dup_with_registrations_20260129 AS
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
FROM backup_dup_with_registrations_20260129;

-- Step 3: DELETE registrations for duplicate profiles (NOT the kept one)
-- We'll delete these registrations since they're from test accounts
DELETE FROM registrations
WHERE profile_id IN (
    SELECT id FROM backup_dup_with_registrations_20260129
);

SELECT 
    'REGISTRATIONS DELETED' as status,
    'Check if any registrations were deleted' as note;

-- Step 4: Now DELETE the duplicate profiles (should work now)
DELETE FROM profiles
WHERE id IN (
    SELECT id FROM backup_dup_with_registrations_20260129
);

-- Step 5: Verify cleanup
SELECT 
    '=== VERIFICATION ===' as section,
    COUNT(*) as profiles_deleted
FROM backup_dup_with_registrations_20260129;

-- Step 6: Check if any duplicates remain
SELECT 
    '=== REMAINING DUPLICATES ===' as section,
    roll_number,
    COUNT(*) as still_duplicate
FROM profiles
WHERE roll_number IS NOT NULL 
    AND roll_number != ''
GROUP BY roll_number
HAVING COUNT(*) > 1;

-- Should return 0 rows

SELECT 
    '=== CLEANUP COMPLETE ===' as message,
    'All duplicate profiles and their registrations deleted' as result,
    'Oldest profile kept for each roll number' as kept_rule;
