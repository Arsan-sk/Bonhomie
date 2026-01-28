-- ============================================
-- Create Offline Profile WITH Auth User
-- Creates both profile and auth.users entry
-- Enables immediate login capability
-- Date: January 29, 2026
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_offline_profile_with_auth;

-- Create function that creates BOTH auth user and profile
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
SECURITY DEFINER -- Run with elevated privileges
AS $$
DECLARE
    v_auth_user_id UUID;
    v_profile_id UUID;
    v_result jsonb;
    v_encrypted_password TEXT;
BEGIN
    -- Check if profile already exists
    IF EXISTS (SELECT 1 FROM profiles WHERE roll_number = p_roll_number) THEN
        RAISE EXCEPTION 'Profile with roll number % already exists', p_roll_number;
    END IF;

    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_college_email) THEN
        RAISE EXCEPTION 'User with email % already exists', p_college_email;
    END IF;

    -- Generate UUID for profile
    v_profile_id := gen_random_uuid();

    -- Hash the password (Bonhomie@2026)
    v_encrypted_password := crypt('Bonhomie@2026', gen_salt('bf'));

    -- Create auth user first
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
        v_profile_id, -- Use same UUID for both
        'authenticated',
        'authenticated',
        p_college_email,
        v_encrypted_password,
        NOW(), -- Email already confirmed
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object('full_name', p_full_name, 'roll_number', p_roll_number),
        NOW(),
        NOW()
    )
    RETURNING id INTO v_auth_user_id;

    -- Create identity record
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
        v_auth_user_id::text,
        NOW(),
        NOW(),
        NOW()
    );

    -- Now create the profile
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
        TRUE, -- Mark as admin created
        v_auth_user_id, -- Link to auth user
        NOW(),
        NOW()
    );

    -- Create audit log
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

    -- Return success with details
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
    WHEN OTHERS THEN
        -- Return error
        v_result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE
        );
        RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_offline_profile_with_auth TO authenticated;
GRANT EXECUTE ON FUNCTION create_offline_profile_with_auth TO service_role;

-- ============================================
-- Test the function
-- ============================================

-- Test creating a profile
-- SELECT * FROM create_offline_profile_with_auth(
--     '22CS99',           -- roll_number
--     'Test Student',     -- full_name
--     '22cs99@aiktc.ac.in', -- college_email
--     '9876543210',       -- phone
--     'Computer Engineering', -- department
--     '2'                 -- year_of_study
-- );

-- Verify profile created
-- SELECT * FROM profiles WHERE roll_number = '22CS99';

-- Verify auth user created
-- SELECT id, email, email_confirmed_at FROM auth.users WHERE email = '22cs99@aiktc.ac.in';

-- Try to login with:
-- Email: 22cs99@aiktc.ac.in
-- Password: Bonhomie@2026

-- ============================================
-- Verification Queries
-- ============================================

-- Check offline profiles with auth users
SELECT 
    p.roll_number,
    p.full_name,
    p.college_email,
    p.is_admin_created,
    p.auth_user_id,
    au.email as auth_email,
    au.email_confirmed_at,
    CASE 
        WHEN p.auth_user_id IS NOT NULL AND au.id IS NOT NULL THEN '✅ Can Login'
        WHEN p.auth_user_id IS NULL THEN '❌ No Auth User'
        ELSE '⚠️ Auth User Issue'
    END as login_status
FROM profiles p
LEFT JOIN auth.users au ON au.id::text = p.auth_user_id::text
WHERE p.is_admin_created = TRUE
ORDER BY p.created_at DESC;

-- Count login-ready profiles
SELECT 
    COUNT(*) as total_offline,
    COUNT(auth_user_id) as can_login,
    COUNT(*) - COUNT(auth_user_id) as cannot_login
FROM profiles
WHERE is_admin_created = TRUE;
