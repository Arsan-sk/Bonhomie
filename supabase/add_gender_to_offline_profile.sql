-- ============================================
-- ADD GENDER PARAMETER TO SIMPLE OFFLINE PROFILE FUNCTION
-- Migration: Add p_gender parameter to create_simple_offline_profile
-- ============================================

-- Drop and recreate the function with gender parameter
DROP FUNCTION IF EXISTS create_simple_offline_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_simple_offline_profile(
    p_roll_number TEXT,
    p_full_name TEXT,
    p_college_email TEXT,
    p_phone TEXT DEFAULT NULL,
    p_department TEXT DEFAULT 'General',
    p_year_of_study TEXT DEFAULT NULL,
    p_gender TEXT DEFAULT 'male'  -- NEW: Gender parameter with default 'male'
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
    v_normalized_gender TEXT;
BEGIN
    -- Normalize inputs
    v_normalized_roll := LOWER(TRIM(p_roll_number));
    v_normalized_email := LOWER(TRIM(p_college_email));
    p_full_name := TRIM(p_full_name);
    
    -- Normalize gender (ensure lowercase, default to 'male' if invalid)
    v_normalized_gender := LOWER(TRIM(COALESCE(p_gender, 'male')));
    IF v_normalized_gender NOT IN ('male', 'female') THEN
        v_normalized_gender := 'male';
    END IF;
    
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
        gender,  -- NEW: Include gender
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
        v_normalized_gender,  -- NEW: Insert gender
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
        'gender', v_normalized_gender,  -- NEW: Return gender in response
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

-- ============================================
-- VERIFICATION
-- ============================================
-- Test the function with gender parameter:
-- SELECT create_simple_offline_profile('test123', 'Test User', 'test123@aiktc.ac.in', '9876543210', 'General', NULL, 'female');
