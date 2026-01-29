-- DELETE DUPLICATE ROLL NUMBER: 23DS34
-- Keep the FIRST (oldest) profile, delete the rest
-- This is for your test accounts with roll number 23DS34

-- Step 1: Show what will be deleted
SELECT 
    '=== PROFILES THAT WILL BE DELETED ===' as section,
    p.id,
    p.full_name,
    p.college_email,
    p.roll_number,
    p.created_at,
    'WILL BE DELETED' as action
FROM profiles p
WHERE LOWER(p.roll_number) = '23ds34'
    AND p.id NOT IN (
        -- Keep the first one (oldest)
        SELECT id 
        FROM profiles 
        WHERE LOWER(roll_number) = '23ds34' 
        ORDER BY created_at 
        LIMIT 1
    );

-- Step 2: Show which one will be KEPT
SELECT 
    '=== PROFILE THAT WILL BE KEPT ===' as section,
    p.id,
    p.full_name,
    p.college_email,
    p.roll_number,
    p.created_at,
    'WILL BE KEPT' as action
FROM profiles p
WHERE LOWER(p.roll_number) = '23ds34'
ORDER BY created_at
LIMIT 1;

-- Step 3: Create backup before deletion
CREATE TABLE IF NOT EXISTS backup_deleted_duplicates_20260129 AS
SELECT p.*, NOW() as backup_time
FROM profiles p
WHERE LOWER(p.roll_number) = '23ds34'
    AND p.id NOT IN (
        SELECT id 
        FROM profiles 
        WHERE LOWER(roll_number) = '23ds34' 
        ORDER BY created_at 
        LIMIT 1
    );

SELECT 'BACKUP CREATED' as status, COUNT(*) as backed_up 
FROM backup_deleted_duplicates_20260129;

-- Step 4: DELETE the duplicates (keep oldest)
DELETE FROM profiles
WHERE LOWER(roll_number) = '23ds34'
    AND id NOT IN (
        -- Keep the first one (oldest)
        SELECT id 
        FROM profiles 
        WHERE LOWER(roll_number) = '23ds34' 
        ORDER BY created_at 
        LIMIT 1
    );

-- Step 5: Delete corresponding auth.users for the deleted profiles
-- (Optional - only if you want to remove the auth accounts too)
DELETE FROM auth.users
WHERE email IN (
    SELECT backup_deleted_duplicates_20260129.college_email
    FROM backup_deleted_duplicates_20260129
);

-- Step 6: Verify cleanup
SELECT 
    '=== AFTER CLEANUP ===' as section,
    COUNT(*) as remaining_profiles_with_23ds34
FROM profiles
WHERE LOWER(roll_number) = '23ds34';

SELECT 
    '=== REMAINING PROFILE ===' as section,
    p.*
FROM profiles p
WHERE LOWER(p.roll_number) = '23ds34';
