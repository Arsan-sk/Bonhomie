-- ============================================
-- CLEANUP CORRUPT DATA
-- Run this ANYTIME you get duplicate key errors
-- Safe to run multiple times
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'CLEANUP SCRIPT - Starting';
    RAISE NOTICE '====================================';
END $$;

-- ============================================
-- STEP 1: Diagnostic Report
-- ============================================

DO $$
DECLARE
    v_offline_profiles INTEGER;
    v_test_profiles INTEGER;
    v_orphaned_profiles INTEGER;
    v_orphaned_auth INTEGER;
    v_duplicate_rolls INTEGER;
    v_duplicate_emails INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 DIAGNOSTIC REPORT';
    RAISE NOTICE '====================================';
    
    SELECT COUNT(*) INTO v_offline_profiles 
    FROM profiles WHERE is_admin_created = TRUE;
    RAISE NOTICE 'Total offline profiles: %', v_offline_profiles;
    
    SELECT COUNT(*) INTO v_test_profiles 
    FROM profiles WHERE roll_number LIKE '%TEST%';
    RAISE NOTICE 'Test profiles: %', v_test_profiles;
    
    SELECT COUNT(*) INTO v_orphaned_profiles 
    FROM profiles 
    WHERE is_admin_created = TRUE AND auth_user_id IS NULL;
    RAISE NOTICE 'Profiles without auth: %', v_orphaned_profiles;
    
    SELECT COUNT(*) INTO v_orphaned_auth 
    FROM auth.users au
    LEFT JOIN profiles p ON au.id::text = p.auth_user_id::text
    WHERE p.id IS NULL AND au.email LIKE '%@aiktc.ac.in';
    RAISE NOTICE 'Auth users without profile: %', v_orphaned_auth;
    
    SELECT COUNT(*) - COUNT(DISTINCT LOWER(roll_number)) INTO v_duplicate_rolls
    FROM profiles WHERE is_admin_created = TRUE;
    IF v_duplicate_rolls > 0 THEN
        RAISE NOTICE '⚠️  Duplicate roll numbers: %', v_duplicate_rolls;
    END IF;
    
    SELECT COUNT(*) - COUNT(DISTINCT LOWER(college_email)) INTO v_duplicate_emails
    FROM profiles WHERE is_admin_created = TRUE;
    IF v_duplicate_emails > 0 THEN
        RAISE NOTICE '⚠️  Duplicate emails: %', v_duplicate_emails;
    END IF;
    
    RAISE NOTICE '====================================';
END $$;

-- ============================================
-- STEP 2: Show Problematic Records
-- ============================================

-- Show test profiles
SELECT 
    '⚠️  TEST PROFILES TO DELETE' as issue,
    id, roll_number, college_email, auth_user_id
FROM profiles 
WHERE roll_number LIKE '%TEST%'
ORDER BY roll_number;

-- Show orphaned profiles
SELECT 
    '⚠️  PROFILES WITHOUT AUTH' as issue,
    id, roll_number, college_email, auth_user_id
FROM profiles 
WHERE is_admin_created = TRUE AND auth_user_id IS NULL
ORDER BY roll_number;

-- Show orphaned auth users
SELECT 
    '⚠️  AUTH USERS WITHOUT PROFILE' as issue,
    au.id, au.email, au.created_at
FROM auth.users au
LEFT JOIN profiles p ON au.id::text = p.auth_user_id::text
WHERE p.id IS NULL AND au.email LIKE '%@aiktc.ac.in'
ORDER BY au.email;

-- Show duplicate roll numbers
SELECT 
    '⚠️  DUPLICATE ROLL NUMBERS' as issue,
    LOWER(roll_number) as roll_number,
    COUNT(*) as count,
    STRING_AGG(id::text, ', ') as profile_ids
FROM profiles 
WHERE is_admin_created = TRUE
GROUP BY LOWER(roll_number)
HAVING COUNT(*) > 1;

-- Show duplicate emails
SELECT 
    '⚠️  DUPLICATE EMAILS' as issue,
    LOWER(college_email) as email,
    COUNT(*) as count,
    STRING_AGG(id::text, ', ') as profile_ids
FROM profiles 
WHERE is_admin_created = TRUE
GROUP BY LOWER(college_email)
HAVING COUNT(*) > 1;

-- ============================================
-- STEP 3: Cleanup Operations
-- ============================================

DO $$
DECLARE
    v_deleted INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧹 CLEANUP OPERATIONS';
    RAISE NOTICE '====================================';
    
    -- Delete ALL test profiles completely (select auth.user id via join to handle auth_user_id stored as text or uuid)
    DELETE FROM auth.sessions 
    WHERE user_id IN (
        SELECT au.id FROM auth.users au
        JOIN profiles p ON au.id::text = p.auth_user_id::text
        WHERE p.roll_number LIKE '%TEST%'
    );
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted test sessions: %', v_deleted;
    
    DELETE FROM auth.refresh_tokens 
    WHERE user_id IN (
        SELECT au.id FROM auth.users au
        JOIN profiles p ON au.id::text = p.auth_user_id::text
        WHERE p.roll_number LIKE '%TEST%'
    );
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted test refresh tokens: %', v_deleted;
    
    DELETE FROM auth.identities 
    WHERE user_id IN (
        SELECT au.id FROM auth.users au
        JOIN profiles p ON au.id::text = p.auth_user_id::text
        WHERE p.roll_number LIKE '%TEST%'
    );
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted test identities: %', v_deleted;
    
    DELETE FROM auth.users 
    WHERE id IN (
        SELECT au.id FROM auth.users au
        JOIN profiles p ON au.id::text = p.auth_user_id::text
        WHERE p.roll_number LIKE '%TEST%'
    );
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted test auth users: %', v_deleted;
    
    DELETE FROM profiles WHERE roll_number LIKE '%TEST%';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted test profiles: %', v_deleted;
    
    -- Delete orphaned auth users (not linked to any profile)
    DELETE FROM auth.sessions 
    WHERE user_id IN (
        SELECT au.id FROM auth.users au
        LEFT JOIN profiles p ON au.id::text = p.auth_user_id::text
        WHERE p.id IS NULL AND au.email LIKE '%@aiktc.ac.in'
    );
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted orphaned sessions: %', v_deleted;
    
    DELETE FROM auth.refresh_tokens 
    WHERE user_id IN (
        SELECT au.id FROM auth.users au
        LEFT JOIN profiles p ON au.id::text = p.auth_user_id::text
        WHERE p.id IS NULL AND au.email LIKE '%@aiktc.ac.in'
    );
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted orphaned refresh tokens: %', v_deleted;
    
    DELETE FROM auth.identities 
    WHERE user_id IN (
        SELECT au.id FROM auth.users au
        LEFT JOIN profiles p ON au.id::text = p.auth_user_id::text
        WHERE p.id IS NULL AND au.email LIKE '%@aiktc.ac.in'
    );
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted orphaned identities: %', v_deleted;
    
    DELETE FROM auth.users 
    WHERE id::text NOT IN (SELECT auth_user_id::text FROM profiles WHERE auth_user_id IS NOT NULL)
    AND email LIKE '%@aiktc.ac.in';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted orphaned auth users: %', v_deleted;
    
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ CLEANUP COMPLETE';
    RAISE NOTICE '====================================';
END $$;

-- ============================================
-- STEP 4: Verification
-- ============================================

DO $$
DECLARE
    v_offline_profiles INTEGER;
    v_test_profiles INTEGER;
    v_orphaned_profiles INTEGER;
    v_orphaned_auth INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✓ POST-CLEANUP VERIFICATION';
    RAISE NOTICE '====================================';
    
    SELECT COUNT(*) INTO v_offline_profiles 
    FROM profiles WHERE is_admin_created = TRUE;
    RAISE NOTICE 'Offline profiles remaining: %', v_offline_profiles;
    
    SELECT COUNT(*) INTO v_test_profiles 
    FROM profiles WHERE roll_number LIKE '%TEST%';
    
    IF v_test_profiles = 0 THEN
        RAISE NOTICE '✅ All test profiles cleaned';
    ELSE
        RAISE NOTICE '⚠️  Still have % test profiles', v_test_profiles;
    END IF;
    
    SELECT COUNT(*) INTO v_orphaned_auth 
    FROM auth.users au
    LEFT JOIN profiles p ON au.id::text = p.auth_user_id::text
    WHERE p.id IS NULL AND au.email LIKE '%@aiktc.ac.in';
    
    IF v_orphaned_auth = 0 THEN
        RAISE NOTICE '✅ All orphaned auth users cleaned';
    ELSE
        RAISE NOTICE '⚠️  Still have % orphaned auth users', v_orphaned_auth;
    END IF;
    
    RAISE NOTICE '====================================';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Next step: Run ULTIMATE_FIX_RUN_THIS.sql';
    RAISE NOTICE '   to recreate auth users for existing profiles';
    RAISE NOTICE '====================================';
END $$;
