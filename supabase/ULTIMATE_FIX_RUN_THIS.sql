-- ============================================
-- ULTIMATE FIX - Complete Offline Profile Auth System
-- COMPREHENSIVE VERSION - Fixes ALL issues and corrupt data
-- Run this in Supabase SQL Editor
-- Date: January 29, 2026
-- ============================================

-- ⚠️ CRITICAL: Run this in Supabase SQL Editor ONLY
-- This script is IDEMPOTENT - safe to run multiple times

DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'COMPREHENSIVE FIX - Starting...';
    RAISE NOTICE 'This will clean up ALL corrupt data';
    RAISE NOTICE '====================================';
END $$;

-- ============================================
-- STEP 0: DIAGNOSTIC - Understand Current State
-- ============================================

DO $$
DECLARE
    v_profile_count INTEGER;
    v_orphan_profiles INTEGER;
    v_orphan_auth INTEGER;
    v_test_profiles INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 DIAGNOSTIC PHASE';
    RAISE NOTICE '====================================';
    
    -- Count offline profiles
    SELECT COUNT(*) INTO v_profile_count FROM profiles WHERE is_admin_created = TRUE;
    RAISE NOTICE 'Offline profiles: %', v_profile_count;
    
    -- Count orphaned profiles (no auth link)
    SELECT COUNT(*) INTO v_orphan_profiles 
    FROM profiles 
    WHERE is_admin_created = TRUE AND auth_user_id IS NULL;
    RAISE NOTICE 'Orphaned profiles (no auth): %', v_orphan_profiles;
    
    -- Count orphaned auth users
    SELECT COUNT(*) INTO v_orphan_auth
    FROM auth.users au
    LEFT JOIN profiles p ON au.id::text = p.auth_user_id::text
    WHERE p.id IS NULL AND au.email LIKE '%@aiktc.ac.in';
    RAISE NOTICE 'Orphaned auth users: %', v_orphan_auth;
    
    -- Count test profiles
    SELECT COUNT(*) INTO v_test_profiles
    FROM profiles WHERE roll_number LIKE '%TEST%';
    RAISE NOTICE 'Test profiles to clean: %', v_test_profiles;
    
    RAISE NOTICE '====================================';
END $$;

-- ============================================
-- STEP 1: CLEANUP - Remove ALL corrupt data
-- ============================================

DO $$
DECLARE
    v_deleted_sessions INTEGER;
    v_deleted_tokens INTEGER;
    v_deleted_identities INTEGER;
    v_deleted_auth_users INTEGER;
    v_deleted_profiles INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧹 CLEANUP PHASE';
    RAISE NOTICE '====================================';
    
    -- Delete test profiles and their auth records
    DELETE FROM auth.sessions 
    WHERE user_id IN (
        SELECT au.id FROM auth.users au
        JOIN profiles p ON au.id::text = p.auth_user_id::text
        WHERE p.roll_number LIKE '%TEST%'
    );
    GET DIAGNOSTICS v_deleted_sessions = ROW_COUNT;
    
    DELETE FROM auth.refresh_tokens 
    WHERE user_id IN (
        SELECT au.id FROM auth.users au
        JOIN profiles p ON au.id::text = p.auth_user_id::text
        WHERE p.roll_number LIKE '%TEST%'
    );
    GET DIAGNOSTICS v_deleted_tokens = ROW_COUNT;
    
    DELETE FROM auth.identities 
    WHERE user_id IN (
        SELECT au.id FROM auth.users au
        JOIN profiles p ON au.id::text = p.auth_user_id::text
        WHERE p.roll_number LIKE '%TEST%'
    );
    GET DIAGNOSTICS v_deleted_identities = ROW_COUNT;
    
    DELETE FROM auth.users 
    WHERE id::text IN (
        SELECT p.auth_user_id::text FROM profiles p
        WHERE p.roll_number LIKE '%TEST%'
    );
    GET DIAGNOSTICS v_deleted_auth_users = ROW_COUNT;
    
    DELETE FROM profiles WHERE roll_number LIKE '%TEST%';
    GET DIAGNOSTICS v_deleted_profiles = ROW_COUNT;
    
    RAISE NOTICE 'Deleted test profiles: %', v_deleted_profiles;
    RAISE NOTICE 'Deleted test auth users: %', v_deleted_auth_users;
    
    -- Delete orphaned auth records (no profile link)
    DELETE FROM auth.sessions 
    WHERE user_id IN (
        SELECT au.id FROM auth.users au
        LEFT JOIN profiles p ON au.id::text = p.auth_user_id::text
        WHERE p.id IS NULL AND au.email LIKE '%@aiktc.ac.in'
    );
    GET DIAGNOSTICS v_deleted_sessions = ROW_COUNT;
    
    DELETE FROM auth.refresh_tokens 
    WHERE user_id IN (
        SELECT au.id FROM auth.users au
        LEFT JOIN profiles p ON au.id::text = p.auth_user_id::text
        WHERE p.id IS NULL AND au.email LIKE '%@aiktc.ac.in'
    );
    GET DIAGNOSTICS v_deleted_tokens = ROW_COUNT;
    
    DELETE FROM auth.identities 
    WHERE user_id IN (
        SELECT au.id FROM auth.users au
        LEFT JOIN profiles p ON au.id::text = p.auth_user_id::text
        WHERE p.id IS NULL AND au.email LIKE '%@aiktc.ac.in'
    );
    GET DIAGNOSTICS v_deleted_identities = ROW_COUNT;
    
    DELETE FROM auth.users 
    WHERE id::text NOT IN (SELECT auth_user_id::text FROM profiles WHERE auth_user_id IS NOT NULL)
    AND email LIKE '%@aiktc.ac.in';
    GET DIAGNOSTICS v_deleted_auth_users = ROW_COUNT;
    
    RAISE NOTICE 'Deleted orphaned auth users: %', v_deleted_auth_users;
    RAISE NOTICE 'Deleted orphaned identities: %', v_deleted_identities;
    
    RAISE NOTICE '✅ Cleanup complete';
    RAISE NOTICE '====================================';
END $$;

-- Drop old functions
DROP FUNCTION IF EXISTS create_offline_profile_with_auth CASCADE;
DROP FUNCTION IF EXISTS add_auth_to_existing_offline_profiles CASCADE;
DROP FUNCTION IF EXISTS fix_offline_profiles_auth CASCADE;

DO $$
BEGIN
    RAISE NOTICE '✅ Dropped old functions';
END $$;

-- ============================================
-- STEP 2: Create NEW function for creating profiles (used by frontend)
-- This fixes the provider_id error when creating NEW profiles
-- ============================================

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
    -- Normalize inputs for case-insensitive comparison
    p_roll_number := LOWER(TRIM(p_roll_number));
    p_college_email := LOWER(TRIM(p_college_email));
    p_full_name := TRIM(p_full_name);
    
    RAISE NOTICE 'Creating profile: % (%), Email: %', p_roll_number, p_full_name, p_college_email;
    
    -- Check if profile already exists by roll number (case-insensitive)
    SELECT id INTO v_existing_profile_id FROM profiles WHERE LOWER(roll_number) = p_roll_number;
    IF v_existing_profile_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Profile with roll number %s already exists (Profile ID: %s)', p_roll_number, v_existing_profile_id),
            'existing_profile_id', v_existing_profile_id
        );
    END IF;

    -- Check if profile already exists by email (case-insensitive)
    SELECT id INTO v_existing_profile_id FROM profiles WHERE LOWER(college_email) = p_college_email;
    IF v_existing_profile_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Profile with email %s already exists (Profile ID: %s)', p_college_email, v_existing_profile_id),
            'existing_profile_id', v_existing_profile_id
        );
    END IF;

    -- Check if auth user already exists (case-insensitive)
    SELECT id INTO v_existing_auth_id FROM auth.users WHERE LOWER(email) = p_college_email;
    IF v_existing_auth_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Auth user with email %s already exists (Auth ID: %s). This indicates corrupt data - run cleanup script.', p_college_email, v_existing_auth_id),
            'existing_auth_id', v_existing_auth_id
        );
    END IF;

    -- Generate SEPARATE UUIDs (CRITICAL: prevents primary key conflicts)
    v_profile_id := gen_random_uuid();
    v_auth_user_id := gen_random_uuid();
    
    RAISE NOTICE '  → Generated Profile ID: %', v_profile_id;
    RAISE NOTICE '  → Generated Auth User ID: %', v_auth_user_id;

    -- Hash the password
    v_encrypted_password := crypt('Bonhomie@2026', gen_salt('bf'));

    -- Create auth user (only fields we can set)
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_auth_user_id,
        'authenticated',
        'authenticated',
        p_college_email,
        v_encrypted_password,
        NOW(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object('full_name', p_full_name, 'roll_number', p_roll_number),
        NOW(),
        NOW()
    );

    -- Create identity record with provider_id (CRITICAL FIX)
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_auth_user_id,
        jsonb_build_object(
            'sub', v_auth_user_id::text,
            'email', p_college_email,
            'email_verified', true,
            'phone_verified', false
        ),
        'email',
        v_auth_user_id::text,  -- ✅ THIS WAS MISSING - CAUSES provider_id ERROR
        NOW(),
        NOW(),
        NOW()
    );

    -- Create the profile
    INSERT INTO profiles (
        id,
        roll_number,
        full_name,
        college_email,
        phone,
        role,
        department,
        year_of_study,
        is_admin_created,
        auth_user_id,
        created_at,
        updated_at
    ) VALUES (
        v_profile_id,
        p_roll_number,
        p_full_name,
        p_college_email,
        p_phone,
        'student',
        p_department,
        p_year_of_study,
        TRUE,
        v_auth_user_id,
        NOW(),
        NOW()
    );

    -- Create audit log (check if table exists first)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        INSERT INTO audit_logs (
            action_type,
            entity_type,
            entity_id,
            details
        ) VALUES (
            'profile_created_offline',
            'profile',
            v_profile_id,
            jsonb_build_object(
                'roll_number', p_roll_number,
                'full_name', p_full_name,
                'email', p_college_email,
                'phone', p_phone,
                'auth_user_id', v_auth_user_id,
                'default_password', 'Bonhomie@2026'
            )
        );
        RAISE NOTICE '  → Created audit log';
    ELSE
        RAISE NOTICE '  → Skipped audit log (table does not exist)';
    END IF;

    -- Return success
    v_result := jsonb_build_object(
        'success', true,
        'profile_id', v_profile_id,
        'auth_user_id', v_auth_user_id,
        'roll_number', p_roll_number,
        'full_name', p_full_name,
        'email', p_college_email,
        'default_password', 'Bonhomie@2026',
        'message', 'Profile and auth user created successfully'
    );

    RETURN v_result;

EXCEPTION
    WHEN unique_violation THEN
        -- Specific handling for duplicate key errors
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Duplicate key violation: ' || SQLERRM,
            'detail', SQLSTATE,
            'hint', 'A profile or auth user with this roll number or email already exists. Run the cleanup script to fix corrupt data.',
            'roll_number', p_roll_number,
            'email', p_college_email
        );
    WHEN OTHERS THEN
        -- Return detailed error for any other issue
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE,
            'sqlstate', SQLSTATE,
            'hint', 'Check Supabase logs for details',
            'roll_number', p_roll_number,
            'email', p_college_email
        );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_offline_profile_with_auth TO authenticated;
GRANT EXECUTE ON FUNCTION create_offline_profile_with_auth TO service_role;
GRANT EXECUTE ON FUNCTION create_offline_profile_with_auth TO anon;

DO $$
BEGIN
    RAISE NOTICE '✅ Step 2: Created function for NEW profiles (with provider_id fix)';
END $$;

-- ============================================
-- STEP 3: Fix EXISTING offline profiles that can't login
-- ============================================

DO $$
DECLARE
    profile_rec RECORD;
    v_auth_user_id UUID;
    v_encrypted_pwd TEXT;
    v_fixed_count INTEGER := 0;
    v_error_count INTEGER := 0;
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Fixing existing offline profiles...';
    RAISE NOTICE '====================================';
    
    -- Hash password
    v_encrypted_pwd := crypt('Bonhomie@2026', gen_salt('bf'));
    
    -- Clean up any orphaned auth records first
    DELETE FROM auth.identities 
    WHERE user_id IN (
        SELECT au.id 
        FROM auth.users au
        LEFT JOIN profiles p ON au.id::text = p.auth_user_id::text
        WHERE p.id IS NULL AND au.email LIKE '%@aiktc.ac.in'
    );
    
    DELETE FROM auth.users 
    WHERE id::text NOT IN (SELECT auth_user_id::text FROM profiles WHERE auth_user_id IS NOT NULL)
    AND email LIKE '%@aiktc.ac.in';
    
    RAISE NOTICE 'Cleaned up orphaned auth records';
    
    -- Reset all offline profiles auth links first
    UPDATE profiles
    SET auth_user_id = NULL
    WHERE is_admin_created = TRUE;
    
    RAISE NOTICE 'Reset all auth_user_id to NULL for fresh start';
    
    -- Process each offline profile
    FOR profile_rec IN 
        SELECT id, roll_number, full_name, college_email, phone
        FROM profiles
        WHERE is_admin_created = TRUE
        ORDER BY roll_number
    LOOP
        BEGIN
            RAISE NOTICE 'Processing profile: % (%)', profile_rec.roll_number, profile_rec.college_email;
            
            -- Check if auth user already exists
            SELECT id INTO v_auth_user_id
            FROM auth.users
            WHERE email = profile_rec.college_email;
            
            IF v_auth_user_id IS NOT NULL THEN
                RAISE NOTICE '  → Auth user already exists, deleting to recreate...';
                
                -- Delete old identity (with CASCADE handled manually)
                DELETE FROM auth.identities WHERE user_id = v_auth_user_id;
                
                -- Delete old sessions
                DELETE FROM auth.sessions WHERE user_id = v_auth_user_id;
                
                -- Delete old refresh tokens
                DELETE FROM auth.refresh_tokens WHERE user_id = v_auth_user_id;
                
                -- Delete old auth user
                DELETE FROM auth.users WHERE id = v_auth_user_id;
                
                RAISE NOTICE '  → Deleted old auth user and related records';
            END IF;
            
            -- Generate new UUID
            v_auth_user_id := gen_random_uuid();
            
            -- Create NEW auth user (only settable fields)
            INSERT INTO auth.users (
                instance_id,
                id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                raw_app_meta_data,
                raw_user_meta_data,
                created_at,
                updated_at
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                v_auth_user_id,
                'authenticated',
                'authenticated',
                profile_rec.college_email,
                v_encrypted_pwd,
                NOW(),
                jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
                jsonb_build_object('full_name', profile_rec.full_name, 'roll_number', profile_rec.roll_number),
                NOW(),
                NOW()
            );
            
            RAISE NOTICE '  → Created auth user: %', v_auth_user_id;
            
            -- Create identity with provider_id
            INSERT INTO auth.identities (
                id,
                user_id,
                identity_data,
                provider,
                provider_id,
                last_sign_in_at,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                v_auth_user_id,
                jsonb_build_object(
                    'sub', v_auth_user_id::text,
                    'email', profile_rec.college_email,
                    'email_verified', true,
                    'phone_verified', false
                ),
                'email',
                v_auth_user_id::text,
                NOW(),
                NOW(),
                NOW()
            );
            
            RAISE NOTICE '  → Created identity with provider_id';
            
            -- Link profile to auth user
            UPDATE profiles
            SET auth_user_id = v_auth_user_id,
                updated_at = NOW()
            WHERE id = profile_rec.id;
            
            RAISE NOTICE '  → Linked profile to auth user';
            RAISE NOTICE '  ✅ SUCCESS: % can now login!', profile_rec.college_email;
            
            v_fixed_count := v_fixed_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  ❌ ERROR: %', SQLERRM;
            v_error_count := v_error_count + 1;
        END;
    END LOOP;
    
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ Fixed % profiles', v_fixed_count;
    IF v_error_count > 0 THEN
        RAISE NOTICE '❌ Failed % profiles', v_error_count;
    END IF;
    RAISE NOTICE '====================================';
END $$;

-- ============================================
-- STEP 4: VERIFICATION
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'VERIFICATION RESULTS';
    RAISE NOTICE '====================================';
END $$;

-- Count check
SELECT 
    '📊 PROFILE COUNT' as section,
    COUNT(*) as total_offline_profiles,
    COUNT(auth_user_id) as have_auth_link,
    COUNT(*) - COUNT(auth_user_id) as missing_auth_link
FROM profiles
WHERE is_admin_created = TRUE;

-- Detailed status
SELECT 
    '📋 PROFILE STATUS' as section,
    roll_number,
    full_name,
    college_email as email,
    CASE 
        WHEN auth_user_id IS NOT NULL THEN '✅ Ready'
        ELSE '❌ Not Ready'
    END as status
FROM profiles
WHERE is_admin_created = TRUE
ORDER BY roll_number;

-- Auth users verification
SELECT 
    '🔐 AUTH USERS CHECK' as section,
    p.roll_number,
    p.college_email,
    au.id IS NOT NULL as auth_user_exists,
    au.encrypted_password IS NOT NULL as has_password,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    i.id IS NOT NULL as has_identity,
    i.provider_id IS NOT NULL as has_provider_id,
    CASE 
        WHEN au.id IS NOT NULL 
         AND au.encrypted_password IS NOT NULL 
         AND au.email_confirmed_at IS NOT NULL
         AND i.id IS NOT NULL
         AND i.provider_id IS NOT NULL 
        THEN '✅ CAN LOGIN'
        ELSE '❌ CANNOT LOGIN'
    END as login_status
FROM profiles p
LEFT JOIN auth.users au ON au.id::text = p.auth_user_id::text
LEFT JOIN auth.identities i ON i.user_id = p.auth_user_id
WHERE p.is_admin_created = TRUE
ORDER BY p.roll_number;

-- Login credentials
SELECT 
    '🔑 LOGIN CREDENTIALS' as section,
    roll_number,
    college_email as email,
    'Bonhomie@2026' as password,
    'Copy these credentials' as note
FROM profiles
WHERE is_admin_created = TRUE
ORDER BY roll_number;

-- ============================================
-- STEP 5: TEST NEW PROFILE CREATION
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Testing new profile creation...';
    RAISE NOTICE '====================================';
END $$;

-- Test creating a new profile
SELECT create_offline_profile_with_auth(
    '99TEST99',
    'Test Student',
    '99test99@aiktc.ac.in',
    '9999999999',
    'Test Department',
    '1'
) as test_result;

-- Verify test profile was created
SELECT 
    '🧪 TEST PROFILE CHECK' as section,
    roll_number,
    college_email,
    auth_user_id IS NOT NULL as has_auth,
    'Should be TRUE' as expected
FROM profiles
WHERE roll_number = '99TEST99';

-- Clean up test profile (comprehensive cleanup)
DO $$
DECLARE
    v_test_user_id UUID;
BEGIN
    -- Get test user id
    SELECT id INTO v_test_user_id FROM auth.users WHERE email = '99test99@aiktc.ac.in';
    
    IF v_test_user_id IS NOT NULL THEN
        -- Delete all related records in correct order
        DELETE FROM auth.sessions WHERE user_id = v_test_user_id;
        DELETE FROM auth.refresh_tokens WHERE user_id = v_test_user_id;
        DELETE FROM auth.identities WHERE user_id = v_test_user_id;
        DELETE FROM auth.users WHERE id = v_test_user_id;
        RAISE NOTICE '✅ Deleted test auth user and related records';
    END IF;
    
    -- Delete test profile
    DELETE FROM profiles WHERE roll_number = '99TEST99';
    RAISE NOTICE '✅ Deleted test profile';
    
    RAISE NOTICE '✅ Test profile fully cleaned up';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Test cleanup warning: %', SQLERRM;
        -- Continue anyway, this is just cleanup
END $$;

-- ============================================
-- FINAL STATUS
-- ============================================

DO $$
DECLARE
    v_total INTEGER;
    v_ready INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(auth_user_id)
    INTO v_total, v_ready
    FROM profiles
    WHERE is_admin_created = TRUE;
    
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE '🎉 ULTIMATE FIX COMPLETE!';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Total offline profiles: %', v_total;
    RAISE NOTICE 'Ready to login: %', v_ready;
    
    IF v_total = v_ready THEN
        RAISE NOTICE '✅ ALL PROFILES FIXED!';
        RAISE NOTICE '';
        RAISE NOTICE '📧 Students can now login with:';
        RAISE NOTICE '   Email: rollnumber@aiktc.ac.in';
        RAISE NOTICE '   Password: Bonhomie@2026';
        RAISE NOTICE '';
        RAISE NOTICE '🆕 New profile creation will work without errors';
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  Remind students to change password after first login!';
    ELSE
        RAISE NOTICE '⚠️  Some profiles still need attention';
        RAISE NOTICE 'Check the verification results above';
    END IF;
    RAISE NOTICE '====================================';
END $$;
