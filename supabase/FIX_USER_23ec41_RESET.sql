-- ============================================================================
-- COMPLETE RESET AND FIX FOR: 23ec41@aiktc.ac.in
-- "Database error querying schema" = Malformed auth records
-- ============================================================================

-- ============================================================================
-- STEP 1: Get structure from a WORKING user to copy exactly
-- ============================================================================

-- Find a working user (one that CAN login)
SELECT 
    '1. WORKING USER STRUCTURE' as info,
    id,
    instance_id,
    aud,
    role,
    email,
    is_sso_user,
    raw_app_meta_data,
    raw_user_meta_data
FROM auth.users
WHERE email NOT IN ('23ec41@aiktc.ac.in', '23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in')
AND email_confirmed_at IS NOT NULL
LIMIT 1;

-- ============================================================================
-- STEP 2: COMPLETELY DELETE existing broken records for this user
-- ============================================================================

-- Delete identities first (foreign key)
DELETE FROM auth.identities 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = '23ec41@aiktc.ac.in');

-- Delete sessions
DELETE FROM auth.sessions 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = '23ec41@aiktc.ac.in');

-- Delete refresh tokens (user_id is varchar in this table)
DELETE FROM auth.refresh_tokens 
WHERE user_id::uuid IN (SELECT id FROM auth.users WHERE email = '23ec41@aiktc.ac.in');

-- Delete the user
DELETE FROM auth.users WHERE email = '23ec41@aiktc.ac.in';

-- ============================================================================
-- STEP 3: CREATE FRESH AUTH USER (copying exact structure from working user)
-- ============================================================================

DO $$
DECLARE
    v_new_user_id UUID;
    v_instance_id UUID;
    v_working_raw_app_meta JSONB;
BEGIN
    -- Generate new user ID
    v_new_user_id := gen_random_uuid();
    
    -- Get instance_id and raw_app_meta_data from a working user
    SELECT instance_id, raw_app_meta_data 
    INTO v_instance_id, v_working_raw_app_meta
    FROM auth.users 
    WHERE email_confirmed_at IS NOT NULL 
    AND id IN (SELECT user_id FROM auth.identities)
    LIMIT 1;
    
    RAISE NOTICE 'Using instance_id: %', v_instance_id;
    RAISE NOTICE 'New user_id: %', v_new_user_id;
    
    -- Insert into auth.users with MINIMAL required fields
    -- Let Supabase defaults handle the rest
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role,
        created_at,
        updated_at
    ) VALUES (
        v_new_user_id,
        v_instance_id,
        '23ec41@aiktc.ac.in',
        crypt('password', gen_salt('bf')),
        NOW(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        '{"full_name": "User"}'::jsonb,
        'authenticated',
        'authenticated',
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '✅ Created auth.users record';
    
    -- Insert into auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        provider,
        identity_data,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_new_user_id,
        v_new_user_id::text,
        'email',
        jsonb_build_object(
            'sub', v_new_user_id::text,
            'email', '23ec41@aiktc.ac.in',
            'email_verified', true,
            'phone_verified', false
        ),
        NOW(),
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '✅ Created auth.identities record';
    
    -- Update profile to link
    UPDATE profiles
    SET auth_user_id = v_new_user_id
    WHERE college_email = '23ec41@aiktc.ac.in';
    
    RAISE NOTICE '✅ Linked profile';
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════';
    RAISE NOTICE '  LOGIN CREDENTIALS:';
    RAISE NOTICE '  Email: 23ec41@aiktc.ac.in';
    RAISE NOTICE '  Password: password';
    RAISE NOTICE '════════════════════════════════════════════';
END $$;

-- ============================================================================
-- STEP 4: VERIFY - Compare with working user structure
-- ============================================================================

SELECT 
    '4. VERIFICATION' as step,
    au.email,
    au.id,
    au.instance_id,
    au.aud,
    au.role,
    au.email_confirmed_at IS NOT NULL as confirmed,
    au.encrypted_password IS NOT NULL as has_pass,
    i.id IS NOT NULL as has_identity,
    i.provider,
    i.provider_id
FROM auth.users au
LEFT JOIN auth.identities i ON i.user_id = au.id
WHERE au.email = '23ec41@aiktc.ac.in';

-- Compare structure with a working user
SELECT 
    '5. COMPARE WITH WORKING USER' as step,
    au.email,
    au.instance_id,
    au.aud,
    au.role,
    i.provider,
    i.provider_id = au.id::text as provider_id_matches
FROM auth.users au
JOIN auth.identities i ON i.user_id = au.id
WHERE au.email_confirmed_at IS NOT NULL
LIMIT 2;
