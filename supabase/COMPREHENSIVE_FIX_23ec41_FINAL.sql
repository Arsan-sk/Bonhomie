-- ============================================================================
-- COMPREHENSIVE FIX FOR 23ec41@aiktc.ac.in
-- This script COMPLETELY resets everything for this user
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================================

-- ============================================================================
-- STEP 1: Clean up ALL existing auth data for this email
-- ============================================================================

-- Delete sessions
DELETE FROM auth.sessions 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = '23ec41@aiktc.ac.in');

-- Delete refresh tokens (using text comparison since it's varchar)
DELETE FROM auth.refresh_tokens 
WHERE user_id IN (SELECT id::text FROM auth.users WHERE email = '23ec41@aiktc.ac.in');

-- Delete identities
DELETE FROM auth.identities 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = '23ec41@aiktc.ac.in');

-- Delete the auth user
DELETE FROM auth.users WHERE email = '23ec41@aiktc.ac.in';

-- ============================================================================
-- STEP 2: Get the existing profile info
-- ============================================================================
SELECT '2. EXISTING PROFILE' as step, id, college_email, full_name, auth_user_id, is_admin_created
FROM profiles WHERE college_email = '23ec41@aiktc.ac.in';

-- ============================================================================
-- STEP 3: Create fresh auth.users entry
-- Using the EXACT same pattern as working users
-- ============================================================================

DO $$
DECLARE
    v_user_id uuid;
    v_profile_id uuid;
    v_now timestamptz := now();
BEGIN
    -- Generate a new UUID for auth user
    v_user_id := gen_random_uuid();
    
    -- Get the profile id
    SELECT id INTO v_profile_id FROM profiles WHERE college_email = '23ec41@aiktc.ac.in';
    
    RAISE NOTICE 'Creating auth user with id: %', v_user_id;
    RAISE NOTICE 'Existing profile id: %', v_profile_id;
    
    -- Insert into auth.users with ALL required fields properly set
    INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        invited_at,
        confirmation_token,
        confirmation_sent_at,
        recovery_token,
        recovery_sent_at,
        email_change_token_new,
        email_change,
        email_change_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        phone,
        phone_confirmed_at,
        phone_change,
        phone_change_token,
        phone_change_sent_at,
        email_change_token_current,
        email_change_confirm_status,
        banned_until,
        reauthentication_token,
        reauthentication_sent_at,
        is_sso_user,
        deleted_at,
        is_anonymous
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',  -- instance_id (MUST be this exact value)
        'authenticated',                          -- aud (MUST be 'authenticated')
        'authenticated',                          -- role (MUST be 'authenticated')
        '23ec41@aiktc.ac.in',                    -- email
        crypt('password', gen_salt('bf')),        -- encrypted_password (password = 'password')
        v_now,                                    -- email_confirmed_at (confirms email)
        NULL,                                     -- invited_at
        '',                                       -- confirmation_token
        NULL,                                     -- confirmation_sent_at
        '',                                       -- recovery_token
        NULL,                                     -- recovery_sent_at
        '',                                       -- email_change_token_new
        '',                                       -- email_change
        NULL,                                     -- email_change_sent_at
        NULL,                                     -- last_sign_in_at
        '{"provider": "email", "providers": ["email"]}'::jsonb,  -- raw_app_meta_data
        '{"full_name": "Maaz Abdul Sattar Rakhange"}'::jsonb,    -- raw_user_meta_data
        FALSE,                                    -- is_super_admin
        v_now,                                    -- created_at
        v_now,                                    -- updated_at
        NULL,                                     -- phone
        NULL,                                     -- phone_confirmed_at
        '',                                       -- phone_change
        '',                                       -- phone_change_token
        NULL,                                     -- phone_change_sent_at
        '',                                       -- email_change_token_current
        0,                                        -- email_change_confirm_status
        NULL,                                     -- banned_until
        '',                                       -- reauthentication_token
        NULL,                                     -- reauthentication_sent_at
        FALSE,                                    -- is_sso_user (MUST be FALSE for email login)
        NULL,                                     -- deleted_at
        FALSE                                     -- is_anonymous
    );
    
    RAISE NOTICE 'Auth user created successfully';
    
    -- Insert into auth.identities (REQUIRED for login to work)
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
        v_user_id,
        jsonb_build_object(
            'sub', v_user_id::text,
            'email', '23ec41@aiktc.ac.in',
            'email_verified', true,
            'phone_verified', false
        ),
        'email',
        v_user_id::text,  -- provider_id MUST equal user_id as text
        v_now,
        v_now,
        v_now
    );
    
    RAISE NOTICE 'Identity created successfully';
    
    -- Update the profile to link to this auth user
    UPDATE profiles 
    SET 
        auth_user_id = v_user_id,
        is_admin_created = TRUE  -- Set TRUE so system uses auth_user_id for lookup
    WHERE college_email = '23ec41@aiktc.ac.in';
    
    RAISE NOTICE 'Profile updated with auth_user_id: %', v_user_id;
    
END $$;

-- ============================================================================
-- STEP 4: Verify everything is correct
-- ============================================================================

-- Check auth.users
SELECT 
    '4a. AUTH USER' as check,
    id,
    email,
    instance_id,
    aud,
    role,
    email_confirmed_at IS NOT NULL as email_confirmed,
    encrypted_password IS NOT NULL as has_password,
    is_sso_user,
    raw_app_meta_data
FROM auth.users 
WHERE email = '23ec41@aiktc.ac.in';

-- Check auth.identities
SELECT 
    '4b. IDENTITY' as check,
    id,
    user_id,
    provider,
    provider_id,
    provider_id = user_id::text as provider_id_matches_user_id,
    identity_data
FROM auth.identities
WHERE user_id = (SELECT id FROM auth.users WHERE email = '23ec41@aiktc.ac.in');

-- Check profile
SELECT 
    '4c. PROFILE' as check,
    id as profile_id,
    college_email,
    full_name,
    auth_user_id,
    is_admin_created,
    role
FROM profiles
WHERE college_email = '23ec41@aiktc.ac.in';

-- Check linkage
SELECT 
    '4d. LINKAGE CHECK' as check,
    p.college_email,
    p.auth_user_id as profile_auth_user_id,
    au.id as auth_users_id,
    CASE WHEN p.auth_user_id = au.id THEN '✅ LINKED' ELSE '❌ NOT LINKED' END as status
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.auth_user_id
WHERE p.college_email = '23ec41@aiktc.ac.in';

-- Compare with working user
SELECT 
    '4e. COMPARISON WITH WORKING USER' as check,
    email,
    instance_id,
    aud,
    role,
    is_sso_user
FROM auth.users
WHERE email IN ('23ec41@aiktc.ac.in', '23ec14@aiktc.ac.in')
ORDER BY email;

-- ============================================================================
-- STEP 5: Test login ability (this just verifies the password hash works)
-- ============================================================================
SELECT 
    '5. PASSWORD CHECK' as check,
    email,
    CASE 
        WHEN encrypted_password = crypt('password', encrypted_password) 
        THEN '✅ Password "password" is correct'
        ELSE '❌ Password check failed'
    END as password_status
FROM auth.users
WHERE email = '23ec41@aiktc.ac.in';
