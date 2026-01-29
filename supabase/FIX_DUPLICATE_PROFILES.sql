-- ============================================================================
-- FIX DUPLICATE PROFILES - Causing "Cannot coerce to single JSON" error
-- Date: January 29, 2026
-- ============================================================================

-- 1. Check for duplicate profiles by college_email
SELECT 
    'DUPLICATE PROFILES' as issue,
    college_email,
    COUNT(*) as count,
    string_agg(id::text, ', ') as profile_ids,
    string_agg(COALESCE(is_admin_created::text, 'null'), ', ') as admin_created_flags
FROM profiles
WHERE college_email IS NOT NULL
GROUP BY college_email
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 2. Show details of duplicate profiles for affected users
SELECT 
    p.id as profile_id,
    p.college_email,
    p.roll_number,
    p.full_name,
    p.is_admin_created,
    p.auth_user_id,
    p.created_at,
    CASE WHEN au.id IS NOT NULL THEN '✅ Has auth.users' ELSE '❌ No auth.users' END as auth_status
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.id OR au.id = p.auth_user_id
WHERE p.college_email IN (
    SELECT college_email FROM profiles 
    WHERE college_email IS NOT NULL 
    GROUP BY college_email HAVING COUNT(*) > 1
)
ORDER BY p.college_email, p.created_at;

-- ============================================================================
-- 3. FIX: Remove duplicate profiles, keep the one linked to auth.users
-- ============================================================================

DO $$
DECLARE
    rec RECORD;
    v_keep_id UUID;
    v_delete_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Finding and fixing duplicate profiles...';
    
    FOR rec IN 
        SELECT 
            college_email,
            array_agg(id ORDER BY created_at ASC) as profile_ids
        FROM profiles
        WHERE college_email IS NOT NULL
        GROUP BY college_email
        HAVING COUNT(*) > 1
    LOOP
        -- Find the profile that's linked to auth.users (either by id or auth_user_id)
        SELECT p.id INTO v_keep_id
        FROM profiles p
        JOIN auth.users au ON (au.id = p.id OR au.id = p.auth_user_id OR au.email = p.college_email)
        WHERE p.college_email = rec.college_email
        LIMIT 1;
        
        -- If no profile is linked to auth, keep the oldest one
        IF v_keep_id IS NULL THEN
            v_keep_id := rec.profile_ids[1];
        END IF;
        
        RAISE NOTICE '  Email: % - Keeping profile: %', rec.college_email, v_keep_id;
        
        -- Move any registrations from duplicate profiles to the kept profile
        UPDATE registrations
        SET profile_id = v_keep_id
        WHERE profile_id IN (SELECT unnest(rec.profile_ids))
        AND profile_id != v_keep_id;
        
        -- Delete duplicate profiles
        DELETE FROM profiles
        WHERE college_email = rec.college_email
        AND id != v_keep_id;
        
        v_delete_count := v_delete_count + (array_length(rec.profile_ids, 1) - 1);
    END LOOP;
    
    RAISE NOTICE 'Deleted duplicates count: %', v_delete_count;
END $$;

-- ============================================================================
-- 4. VERIFY no more duplicates
-- ============================================================================

SELECT 
    'VERIFICATION' as check_type,
    college_email,
    COUNT(*) as count
FROM profiles
WHERE college_email IS NOT NULL
GROUP BY college_email
HAVING COUNT(*) > 1;

-- Should return 0 rows if fixed

-- 5. Check specific user
SELECT 
    'SPECIFIC USER CHECK' as check_type,
    p.id as profile_id,
    p.college_email,
    p.full_name,
    p.auth_user_id,
    au.id as auth_user_id_from_auth,
    au.email
FROM profiles p
LEFT JOIN auth.users au ON au.email = p.college_email
WHERE p.college_email = '23ec59@aiktc.ac.in';
