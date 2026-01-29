-- ============================================================================
-- FIX DATABASE ERROR - Auth Schema Issues
-- Date: January 29, 2026
-- Error: "Database error querying schema" on login
-- ============================================================================

-- ============================================================================
-- PART 1: DIAGNOSE - Check what we created
-- ============================================================================

-- Check the auth.users we just created
SELECT 
    'AUTH.USERS CHECK' as check_type,
    id,
    email,
    instance_id,
    aud,
    role,
    encrypted_password IS NOT NULL as has_password,
    email_confirmed_at,
    is_sso_user,
    created_at
FROM auth.users
WHERE email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in');

-- Check auth.identities
SELECT 
    'AUTH.IDENTITIES CHECK' as check_type,
    i.id,
    i.user_id,
    au.email,
    i.provider,
    i.provider_id,
    i.identity_data
FROM auth.identities i
JOIN auth.users au ON au.id = i.user_id
WHERE au.email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in');

-- ============================================================================
-- PART 2: DELETE BAD RECORDS AND RECREATE PROPERLY
-- ============================================================================

-- First, delete the bad auth records we created
DELETE FROM auth.identities 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in')
);

DELETE FROM auth.users 
WHERE email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in');

-- ============================================================================
-- PART 3: Get correct instance_id from existing working user
-- ============================================================================

SELECT 
    'CORRECT INSTANCE_ID' as info,
    instance_id
FROM auth.users
LIMIT 1;

-- ============================================================================
-- PART 4: RECREATE AUTH USERS PROPERLY
-- Using correct schema structure
-- ============================================================================

DO $$
DECLARE
    rec RECORD;
    v_user_id UUID;
    v_count INTEGER := 0;
    v_password_hash TEXT;
    v_instance_id UUID;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '  RECREATING AUTH USERS WITH CORRECT SCHEMA';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- Get correct instance_id from existing user
    SELECT instance_id INTO v_instance_id FROM auth.users LIMIT 1;
    
    IF v_instance_id IS NULL THEN
        v_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;
    
    RAISE NOTICE '  Using instance_id: %', v_instance_id;

    -- Generate password hash for 'password'
    v_password_hash := crypt('password', gen_salt('bf'));

    FOR rec IN 
        SELECT p.id as profile_id, p.college_email, p.full_name, p.role
        FROM profiles p
        WHERE p.college_email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in')
        AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.email = p.college_email)
    LOOP
        v_user_id := gen_random_uuid();
        
        RAISE NOTICE '  Creating: %', rec.college_email;
        
        -- Create auth.users with ALL required fields
        INSERT INTO auth.users (
            id,
            instance_id,
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
            aud,
            role
        ) VALUES (
            v_user_id,
            v_instance_id,
            rec.college_email,
            v_password_hash,
            NOW(),                    -- email_confirmed_at
            NULL,                     -- invited_at
            '',                       -- confirmation_token
            NULL,                     -- confirmation_sent_at
            '',                       -- recovery_token
            NULL,                     -- recovery_sent_at
            '',                       -- email_change_token_new
            '',                       -- email_change
            NULL,                     -- email_change_sent_at
            NULL,                     -- last_sign_in_at
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            jsonb_build_object('full_name', COALESCE(rec.full_name, 'User')),
            FALSE,                    -- is_super_admin
            NOW(),                    -- created_at
            NOW(),                    -- updated_at
            NULL,                     -- phone
            NULL,                     -- phone_confirmed_at
            '',                       -- phone_change
            '',                       -- phone_change_token
            NULL,                     -- phone_change_sent_at
            '',                       -- email_change_token_current
            0,                        -- email_change_confirm_status
            NULL,                     -- banned_until
            '',                       -- reauthentication_token
            NULL,                     -- reauthentication_sent_at
            FALSE,                    -- is_sso_user
            NULL,                     -- deleted_at
            'authenticated',          -- aud
            'authenticated'           -- role
        );
        
        -- Create auth.identities
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
                'email', rec.college_email,
                'email_verified', true,
                'phone_verified', false
            ),
            'email',
            v_user_id::text,
            NULL,
            NOW(),
            NOW()
        );
        
        -- Update profile with auth_user_id
        UPDATE profiles
        SET auth_user_id = v_user_id
        WHERE id = rec.profile_id;
        
        v_count := v_count + 1;
        RAISE NOTICE '    ✅ Created: %', rec.college_email;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '  COMPLETED: Created users with password: password';
    RAISE NOTICE '  Count: %', v_count;
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- PART 5: VERIFY
-- ============================================================================

SELECT 
    'VERIFICATION' as status,
    au.email,
    au.id as auth_user_id,
    au.encrypted_password IS NOT NULL as has_password,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = au.id) as has_identity,
    au.is_sso_user,
    au.aud,
    au.role
FROM auth.users au
WHERE au.email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in');
