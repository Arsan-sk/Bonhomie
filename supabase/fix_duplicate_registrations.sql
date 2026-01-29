-- FIX DUPLICATE REGISTRATIONS
-- Strategy: Delete duplicate auth.users accounts, keep original accounts
-- Users should use their ORIGINAL email with the password you changed

-- Step 1: Show what will be deleted
WITH duplicate_accounts AS (
    SELECT 
        au.id as duplicate_auth_id,
        au.email as duplicate_email,
        LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) as roll_number,
        au.created_at as duplicate_created
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE p.id IS NULL
        AND NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '') IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM profiles p2
            WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
        )
)
SELECT 
    '=== WILL DELETE THESE DUPLICATE ACCOUNTS ===' as section,
    da.duplicate_email as will_delete_email,
    da.roll_number,
    da.duplicate_created,
    p.college_email as original_email_to_use,
    p.full_name as original_name,
    'User should use ORIGINAL email with the password you changed' as instruction
FROM duplicate_accounts da
JOIN profiles p ON LOWER(p.roll_number) = da.roll_number;

-- Step 2: Backup duplicate auth.users before deletion
CREATE TABLE IF NOT EXISTS backup_duplicate_auth_users_password_issue AS
SELECT au.*, NOW() as backup_time
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
    AND NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '') IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM profiles p2
        WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
    );

SELECT 
    '=== BACKUP CREATED ===' as section,
    COUNT(*) as backed_up_count
FROM backup_duplicate_auth_users_password_issue;

-- Step 3: Delete duplicate auth.users accounts
DELETE FROM auth.users
WHERE id IN (
    SELECT au.id
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE p.id IS NULL
        AND NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '') IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM profiles p2
            WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
        )
);

SELECT 
    '=== DUPLICATE ACCOUNTS DELETED ===' as section,
    (SELECT COUNT(*) FROM backup_duplicate_auth_users_password_issue) as deleted_count;

-- Step 4: Verification - should be 0 duplicate accounts now
SELECT 
    '=== VERIFICATION ===' as section,
    COUNT(*) as remaining_duplicate_accounts
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
    AND NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '') IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM profiles p2
        WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
    );
-- Should be 0

-- Step 5: List of users to notify
SELECT 
    '=== NOTIFY THESE USERS ===' as section,
    email as original_email_to_use,
    full_name,
    roll_number,
    'Tell them: Use ORIGINAL email, password was changed yesterday' as message
FROM profiles
WHERE LOWER(roll_number) IN (
    SELECT roll_number 
    FROM backup_duplicate_auth_users_password_issue
    WHERE LOWER(NULLIF(TRIM(raw_user_meta_data->>'roll_number'), '')) IS NOT NULL
);

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

SELECT 
    '╔══════════════════════════════════════════════════════════════╗' as line
UNION ALL SELECT '║          ✅ DUPLICATE ACCOUNTS CLEANUP COMPLETE              ║'
UNION ALL SELECT '╠══════════════════════════════════════════════════════════════╣'
UNION ALL SELECT '║  ✅ Duplicate auth.users accounts deleted                    ║'
UNION ALL SELECT '║  ✅ Original accounts preserved                              ║'
UNION ALL SELECT '║  ✅ Backups created for rollback                             ║'
UNION ALL SELECT '╠══════════════════════════════════════════════════════════════╣'
UNION ALL SELECT '║  📌 NOTIFY AFFECTED USERS:                                   ║'
UNION ALL SELECT '║     1. Use your ORIGINAL email (check Step 5 results)        ║'
UNION ALL SELECT '║     2. Use the password changed yesterday                    ║'
UNION ALL SELECT '║     3. Do NOT try to register again                          ║'
UNION ALL SELECT '║                                                              ║'
UNION ALL SELECT '║  💡 For skzaid00000@gmail.com specifically:                  ║'
UNION ALL SELECT '║     Tell user to find their original email and use that      ║'
UNION ALL SELECT '╚══════════════════════════════════════════════════════════════╝';
