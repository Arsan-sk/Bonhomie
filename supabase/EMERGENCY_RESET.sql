-- ============================================
-- EMERGENCY RESET - Nuclear Option
-- ⚠️  USE ONLY IF EVERYTHING IS BROKEN
-- This will DELETE ALL offline profiles and start fresh
-- ============================================

-- SAFETY CHECK: Uncomment the next line to enable this script
-- SET LOCAL emergency_reset = 'CONFIRMED';

DO $$
BEGIN
    -- Safety check
    IF current_setting('emergency_reset', true) IS DISTINCT FROM 'CONFIRMED' THEN
        RAISE EXCEPTION 'SAFETY CHECK: This script will DELETE ALL offline profiles. To proceed, uncomment the SET LOCAL emergency_reset line at the top of this file.';
    END IF;
    
    RAISE NOTICE '====================================';
    RAISE NOTICE '⚠️  EMERGENCY RESET STARTING';
    RAISE NOTICE '⚠️  THIS WILL DELETE ALL OFFLINE PROFILES';
    RAISE NOTICE '====================================';
END $$;

-- ============================================
-- Show what will be deleted
-- ============================================

SELECT 
    '📊 PROFILES TO BE DELETED' as notice,
    COUNT(*) as count
FROM profiles 
WHERE is_admin_created = TRUE;

SELECT 
    '📋 PROFILE LIST' as notice,
    roll_number,
    full_name,
    college_email
FROM profiles 
WHERE is_admin_created = TRUE
ORDER BY roll_number;

-- ============================================
-- Delete everything related to offline profiles
-- ============================================

DO $$
DECLARE
    v_deleted_sessions INTEGER;
    v_deleted_tokens INTEGER;
    v_deleted_identities INTEGER;
    v_deleted_users INTEGER;
    v_deleted_profiles INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🗑️  DELETING ALL DATA';
    RAISE NOTICE '====================================';
    
    -- Delete sessions (resolve auth_user_id stored as text by joining auth.users)
    DELETE FROM auth.sessions 
    WHERE user_id IN (
        SELECT au.id FROM auth.users au
        JOIN profiles p ON au.id::text = p.auth_user_id::text
        WHERE p.is_admin_created = TRUE AND p.auth_user_id IS NOT NULL
    );
    GET DIAGNOSTICS v_deleted_sessions = ROW_COUNT;
    RAISE NOTICE 'Deleted sessions: %', v_deleted_sessions;
    
    -- Delete refresh tokens
    DELETE FROM auth.refresh_tokens 
    WHERE user_id IN (
        SELECT au.id FROM auth.users au
        JOIN profiles p ON au.id::text = p.auth_user_id::text
        WHERE p.is_admin_created = TRUE AND p.auth_user_id IS NOT NULL
    );
    GET DIAGNOSTICS v_deleted_tokens = ROW_COUNT;
    RAISE NOTICE 'Deleted refresh tokens: %', v_deleted_tokens;
    
    -- Delete identities
    DELETE FROM auth.identities 
    WHERE user_id IN (
        SELECT au.id FROM auth.users au
        JOIN profiles p ON au.id::text = p.auth_user_id::text
        WHERE p.is_admin_created = TRUE AND p.auth_user_id IS NOT NULL
    );
    GET DIAGNOSTICS v_deleted_identities = ROW_COUNT;
    RAISE NOTICE 'Deleted identities: %', v_deleted_identities;
    
    -- Delete auth users
    DELETE FROM auth.users 
           WHERE id::text NOT IN (SELECT auth_user_id::text FROM profiles WHERE auth_user_id IS NOT NULL)
           AND email LIKE '%@aiktc.ac.in';
    GET DIAGNOSTICS v_deleted_users = ROW_COUNT;
    RAISE NOTICE 'Deleted auth users: %', v_deleted_users;
    
    -- Delete profiles
    DELETE FROM profiles 
    WHERE is_admin_created = TRUE;
    GET DIAGNOSTICS v_deleted_profiles = ROW_COUNT;
    RAISE NOTICE 'Deleted profiles: %', v_deleted_profiles;
    
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ ALL OFFLINE PROFILES DELETED';
    RAISE NOTICE '====================================';
END $$;

-- ============================================
-- Clean up orphaned records (just in case)
-- ============================================

DO $$
DECLARE
    v_deleted INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧹 CLEANING UP ORPHANED RECORDS';
    RAISE NOTICE '====================================';
    
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
END $$;

-- ============================================
-- Recreate function with correct implementation
-- ============================================

DROP FUNCTION IF EXISTS create_offline_profile_with_auth CASCADE;

CREATE OR REPLACE FUNCTION create_offline_profile_with_auth(
    p_roll_number TEXT,
    p_full_name TEXT,
    p_college_email TEXT,
    p_phone TEXT DEFAULT NULL,
    p_department TEXT DEFAULT 'General',
    p_year_of_study TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_auth_user_id UUID;
    v_profile_id UUID;
    v_result jsonb;
    v_encrypted_password TEXT;
    v_existing_profile_id UUID;
    v_existing_auth_id UUID;
BEGIN
    -- Normalize inputs
    p_roll_number := LOWER(TRIM(p_roll_number));
    p_college_email := LOWER(TRIM(p_college_email));
    p_full_name := TRIM(p_full_name);
    
    -- Check duplicates (case-insensitive)
    SELECT id INTO v_existing_profile_id FROM profiles WHERE LOWER(roll_number) = p_roll_number;
    IF v_existing_profile_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Roll number already exists');
    END IF;

    SELECT id INTO v_existing_profile_id FROM profiles WHERE LOWER(college_email) = p_college_email;
    IF v_existing_profile_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Email already exists');
    END IF;

    SELECT id INTO v_existing_auth_id FROM auth.users WHERE LOWER(email) = p_college_email;
    IF v_existing_auth_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Auth user already exists');
    END IF;

    -- Generate SEPARATE UUIDs (CRITICAL!)
    v_profile_id := gen_random_uuid();
    v_auth_user_id := gen_random_uuid();

    -- Hash password
    v_encrypted_password := crypt('Bonhomie@2026', gen_salt('bf'));

    -- Create auth user
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_auth_user_id,
        'authenticated', 'authenticated', p_college_email, v_encrypted_password,
        NOW(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object('full_name', p_full_name, 'roll_number', p_roll_number),
        NOW(), NOW()
    );

    -- Create identity
    INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_auth_user_id,
        jsonb_build_object('sub', v_auth_user_id::text, 'email', p_college_email, 'email_verified', true),
        'email', v_auth_user_id::text,
        NOW(), NOW(), NOW()
    );

    -- Create profile
    INSERT INTO profiles (
        id, roll_number, full_name, college_email, phone,
        role, department, year_of_study, is_admin_created,
        auth_user_id, created_at, updated_at
    ) VALUES (
        v_profile_id, p_roll_number, p_full_name, p_college_email, p_phone,
        'student', p_department, p_year_of_study, TRUE,
        v_auth_user_id, NOW(), NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'profile_id', v_profile_id,
        'auth_user_id', v_auth_user_id,
        'message', 'Profile created successfully'
    );

EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'error', 'Duplicate key: ' || SQLERRM);
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION create_offline_profile_with_auth TO authenticated;
GRANT EXECUTE ON FUNCTION create_offline_profile_with_auth TO service_role;
GRANT EXECUTE ON FUNCTION create_offline_profile_with_auth TO anon;

-- ============================================
-- Final Verification
-- ============================================

DO $$
DECLARE
    v_offline_count INTEGER;
    v_orphaned_auth INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ EMERGENCY RESET COMPLETE';
    RAISE NOTICE '====================================';
    
    SELECT COUNT(*) INTO v_offline_count FROM profiles WHERE is_admin_created = TRUE;
    SELECT COUNT(*) INTO v_orphaned_auth 
    FROM auth.users au
    LEFT JOIN profiles p ON au.id::text = p.auth_user_id::text
    WHERE p.id IS NULL AND au.email LIKE '%@aiktc.ac.in';
    
    RAISE NOTICE 'Offline profiles: %', v_offline_count;
    RAISE NOTICE 'Orphaned auth users: %', v_orphaned_auth;
    RAISE NOTICE '';
    RAISE NOTICE '🆕 System is now clean and ready';
    RAISE NOTICE '📝 Create new profiles from Admin panel';
    RAISE NOTICE '====================================';
END $$;
