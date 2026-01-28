-- ============================================
-- SIMPLE OFFLINE PROFILES - Clean Approach
-- Date: January 29, 2026
-- ============================================
-- 
-- This script:
-- 1. REMOVES all complex auth-related functions we created
-- 2. Creates a SIMPLE function to add offline profiles (NO auth.users)
-- 3. Profiles created this way have is_admin_created = TRUE
-- 4. NO login functionality - students must contact admin
--
-- ⚠️ RUN THIS IN SUPABASE SQL EDITOR
-- ============================================

-- ============================================
-- STEP 1: DROP ALL OLD FUNCTIONS
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Removing old auth-related functions...';
    RAISE NOTICE '====================================';
END $$;

-- Drop all the problematic functions we created
DROP FUNCTION IF EXISTS create_offline_profile_with_auth(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_offline_profile_with_auth CASCADE;
DROP FUNCTION IF EXISTS add_auth_to_existing_offline_profiles CASCADE;
DROP FUNCTION IF EXISTS fix_offline_profiles_auth CASCADE;
DROP FUNCTION IF EXISTS create_auth_for_offline_profiles CASCADE;

DO $$
BEGIN
    RAISE NOTICE '✅ Dropped all old auth-related functions';
END $$;

-- ============================================
-- STEP 2: CLEAN UP ANY ORPHANED AUTH USERS
-- (from previous failed attempts)
-- ============================================

DO $$
DECLARE
    v_deleted INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Cleaning up orphaned auth records...';
    
    -- Delete identities for orphaned auth users (aiktc emails without profiles)
    -- Note: auth.identities.user_id is UUID, so no cast needed
    DELETE FROM auth.identities 
    WHERE user_id IN (
        SELECT au.id FROM auth.users au
        WHERE au.email LIKE '%@aiktc.ac.in'
        AND NOT EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.college_email = au.email
            AND p.is_admin_created = FALSE
        )
    );
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted orphaned identities: %', v_deleted;
    
    -- Delete sessions for orphaned auth users
    -- Note: auth.sessions.user_id is UUID, so no cast needed
    DELETE FROM auth.sessions 
    WHERE user_id IN (
        SELECT au.id FROM auth.users au
        WHERE au.email LIKE '%@aiktc.ac.in'
        AND NOT EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.college_email = au.email
            AND p.is_admin_created = FALSE
        )
    );
    
    -- Delete refresh tokens for orphaned auth users
    -- Note: auth.refresh_tokens.user_id is VARCHAR, so cast UUID to TEXT
    DELETE FROM auth.refresh_tokens 
    WHERE user_id::text IN (
        SELECT au.id::text FROM auth.users au
        WHERE au.email LIKE '%@aiktc.ac.in'
        AND NOT EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.college_email = au.email
            AND p.is_admin_created = FALSE
        )
    );
    
    -- Delete orphaned auth users (aiktc emails that don't have regular profiles)
    DELETE FROM auth.users 
    WHERE email LIKE '%@aiktc.ac.in'
    AND NOT EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.college_email = auth.users.email
        AND p.is_admin_created = FALSE
    );
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted orphaned auth users: %', v_deleted;
    
    RAISE NOTICE '✅ Cleanup complete';
END $$;

-- ============================================
-- STEP 3: Reset auth_user_id for admin-created profiles
-- (they shouldn't have auth users)
-- ============================================

DO $$
DECLARE
    v_updated INTEGER;
BEGIN
    UPDATE profiles 
    SET auth_user_id = NULL 
    WHERE is_admin_created = TRUE;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RAISE NOTICE 'Reset auth_user_id for % admin-created profiles', v_updated;
END $$;

-- ============================================
-- STEP 4: CREATE SIMPLE OFFLINE PROFILE FUNCTION
-- This ONLY creates a profile entry - NO auth.users
-- ============================================

CREATE OR REPLACE FUNCTION create_simple_offline_profile(
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
    v_profile_id UUID;
    v_existing_profile_id UUID;
    v_normalized_roll TEXT;
    v_normalized_email TEXT;
BEGIN
    -- Normalize inputs
    v_normalized_roll := LOWER(TRIM(p_roll_number));
    v_normalized_email := LOWER(TRIM(p_college_email));
    p_full_name := TRIM(p_full_name);
    
    -- Validate inputs
    IF v_normalized_roll IS NULL OR v_normalized_roll = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Roll number is required'
        );
    END IF;
    
    IF p_full_name IS NULL OR p_full_name = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Full name is required'
        );
    END IF;
    
    IF v_normalized_email IS NULL OR v_normalized_email = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'College email is required'
        );
    END IF;
    
    -- Check if profile already exists by roll number
    SELECT id INTO v_existing_profile_id 
    FROM profiles 
    WHERE LOWER(roll_number) = v_normalized_roll;
    
    IF v_existing_profile_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Profile with roll number %s already exists', p_roll_number),
            'existing_profile_id', v_existing_profile_id
        );
    END IF;
    
    -- Check if profile already exists by email
    SELECT id INTO v_existing_profile_id 
    FROM profiles 
    WHERE LOWER(college_email) = v_normalized_email;
    
    IF v_existing_profile_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Profile with email %s already exists', p_college_email),
            'existing_profile_id', v_existing_profile_id
        );
    END IF;
    
    -- Generate profile ID
    v_profile_id := gen_random_uuid();
    
    -- Create the profile (NO auth.users entry)
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
        auth_user_id,  -- NULL for offline profiles
        created_at,
        updated_at
    ) VALUES (
        v_profile_id,
        v_normalized_roll,
        p_full_name,
        v_normalized_email,
        p_phone,
        'student',
        COALESCE(p_department, 'General'),
        p_year_of_study,
        TRUE,  -- Mark as admin-created
        NULL,  -- NO auth user
        NOW(),
        NOW()
    );
    
    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'profile_id', v_profile_id,
        'roll_number', v_normalized_roll,
        'full_name', p_full_name,
        'email', v_normalized_email,
        'message', 'Profile created successfully (offline mode - no login)'
    );

EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'A profile with this roll number or email already exists',
            'detail', SQLERRM
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE
        );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_simple_offline_profile TO authenticated;
GRANT EXECUTE ON FUNCTION create_simple_offline_profile TO service_role;
GRANT EXECUTE ON FUNCTION create_simple_offline_profile TO anon;

DO $$
BEGIN
    RAISE NOTICE '✅ Created simple offline profile function';
END $$;

-- ============================================
-- STEP 5: CHECK FOR ADMIN-CREATED PROFILE FUNCTION
-- Used by registration to detect if profile exists
-- ============================================

CREATE OR REPLACE FUNCTION check_admin_created_profile(p_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile RECORD;
BEGIN
    SELECT id, roll_number, full_name, is_admin_created
    INTO v_profile
    FROM profiles
    WHERE LOWER(college_email) = LOWER(TRIM(p_email));
    
    IF v_profile.id IS NULL THEN
        RETURN jsonb_build_object(
            'exists', false,
            'is_admin_created', false
        );
    END IF;
    
    RETURN jsonb_build_object(
        'exists', true,
        'is_admin_created', COALESCE(v_profile.is_admin_created, false),
        'profile_id', v_profile.id,
        'roll_number', v_profile.roll_number,
        'full_name', v_profile.full_name
    );
END;
$$;

GRANT EXECUTE ON FUNCTION check_admin_created_profile TO authenticated;
GRANT EXECUTE ON FUNCTION check_admin_created_profile TO service_role;
GRANT EXECUTE ON FUNCTION check_admin_created_profile TO anon;

DO $$
BEGIN
    RAISE NOTICE '✅ Created check_admin_created_profile function';
END $$;

-- ============================================
-- STEP 6: VERIFICATION
-- ============================================

DO $$
DECLARE
    v_total_profiles INTEGER;
    v_admin_created INTEGER;
    v_regular INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'VERIFICATION';
    RAISE NOTICE '====================================';
    
    SELECT COUNT(*) INTO v_total_profiles FROM profiles;
    SELECT COUNT(*) INTO v_admin_created FROM profiles WHERE is_admin_created = TRUE;
    SELECT COUNT(*) INTO v_regular FROM profiles WHERE is_admin_created = FALSE OR is_admin_created IS NULL;
    
    RAISE NOTICE 'Total profiles: %', v_total_profiles;
    RAISE NOTICE 'Admin-created (offline): %', v_admin_created;
    RAISE NOTICE 'Regular (can login): %', v_regular;
    RAISE NOTICE '';
    RAISE NOTICE '✅ SETUP COMPLETE!';
    RAISE NOTICE '';
    RAISE NOTICE '📝 How it works now:';
    RAISE NOTICE '   - Admin creates offline profiles → is_admin_created = TRUE';
    RAISE NOTICE '   - These profiles have NO login capability';
    RAISE NOTICE '   - If student tries to register with same email:';
    RAISE NOTICE '     → Show "Profile exists, contact admin"';
    RAISE NOTICE '   - Login will be added later when needed';
    RAISE NOTICE '====================================';
END $$;

-- Show current admin-created profiles
SELECT 
    roll_number,
    full_name,
    college_email,
    is_admin_created,
    auth_user_id IS NOT NULL as has_auth,
    'No login - contact admin' as login_status
FROM profiles
WHERE is_admin_created = TRUE
ORDER BY roll_number;
