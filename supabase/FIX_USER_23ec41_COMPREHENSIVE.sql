-- ============================================================================
-- COMPREHENSIVE FIX FOR USER: 23ec41@aiktc.ac.in
-- Fixes "Database error querying schema" issue
-- ============================================================================

-- ============================================================================
-- STEP 1: DIAGNOSE - What's the current state?
-- ============================================================================

-- 1.1 Check auth.users
SELECT 
    '1.1 AUTH.USERS' as step,
    id,
    email,
    instance_id,
    encrypted_password IS NOT NULL as has_password,
    email_confirmed_at,
    aud,
    role,
    is_sso_user
FROM auth.users
WHERE email = '23ec41@aiktc.ac.in';

-- 1.2 Check auth.identities (THIS IS USUALLY THE PROBLEM!)
SELECT 
    '1.2 AUTH.IDENTITIES' as step,
    i.id as identity_id,
    i.user_id,
    i.provider,
    i.provider_id,
    i.identity_data,
    CASE 
        WHEN i.id IS NULL THEN '❌ NO IDENTITY - CAUSES DATABASE ERROR!'
        WHEN i.provider_id != i.user_id::text THEN '❌ PROVIDER_ID MISMATCH!'
        ELSE '✅ OK'
    END as status
FROM auth.users au
LEFT JOIN auth.identities i ON i.user_id = au.id
WHERE au.email = '23ec41@aiktc.ac.in';

-- 1.3 Check profiles
SELECT 
    '1.3 PROFILES' as step,
    id,
    college_email,
    full_name,
    auth_user_id,
    is_admin_created
FROM profiles
WHERE college_email = '23ec41@aiktc.ac.in';

-- 1.4 Count check
SELECT 
    '1.4 COUNTS' as step,
    (SELECT COUNT(*) FROM auth.users WHERE email = '23ec41@aiktc.ac.in') as auth_users_count,
    (SELECT COUNT(*) FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = '23ec41@aiktc.ac.in')) as identities_count,
    (SELECT COUNT(*) FROM profiles WHERE college_email = '23ec41@aiktc.ac.in') as profiles_count;

-- ============================================================================
-- STEP 2: FIX AUTH.IDENTITIES (The main cause of "Database error")
-- ============================================================================

DO $$
DECLARE
    v_user_id UUID;
    v_instance_id UUID;
    v_identity_exists BOOLEAN;
    v_identity_correct BOOLEAN;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '  FIXING USER: 23ec41@aiktc.ac.in';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';

    -- Get user ID
    SELECT id, instance_id INTO v_user_id, v_instance_id
    FROM auth.users
    WHERE email = '23ec41@aiktc.ac.in';
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '❌ User does not exist in auth.users - need to create';
        
        -- Get correct instance_id from existing user
        SELECT instance_id INTO v_instance_id FROM auth.users LIMIT 1;
        IF v_instance_id IS NULL THEN
            v_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
        END IF;
        
        v_user_id := gen_random_uuid();
        
        -- Create auth.users
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, aud, role,
            created_at, updated_at, is_sso_user,
            confirmation_token, recovery_token, email_change_token_new,
            email_change, email_change_token_current, email_change_confirm_status,
            reauthentication_token, phone_change, phone_change_token
        ) VALUES (
            v_user_id, v_instance_id, '23ec41@aiktc.ac.in',
            crypt('password', gen_salt('bf')), NOW(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{}'::jsonb, 'authenticated', 'authenticated',
            NOW(), NOW(), FALSE,
            '', '', '', '', '', 0, '', '', ''
        );
        
        RAISE NOTICE '✅ Created auth.users record: %', v_user_id;
    ELSE
        RAISE NOTICE '✅ User exists in auth.users: %', v_user_id;
        
        -- Update password
        UPDATE auth.users
        SET 
            encrypted_password = crypt('password', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            aud = 'authenticated',
            role = 'authenticated',
            is_sso_user = FALSE,
            updated_at = NOW()
        WHERE id = v_user_id;
        
        RAISE NOTICE '✅ Updated password to: password';
    END IF;
    
    -- Check if identity exists
    SELECT EXISTS (
        SELECT 1 FROM auth.identities WHERE user_id = v_user_id
    ) INTO v_identity_exists;
    
    -- Check if identity is correct
    SELECT EXISTS (
        SELECT 1 FROM auth.identities 
        WHERE user_id = v_user_id 
        AND provider = 'email' 
        AND provider_id = v_user_id::text
    ) INTO v_identity_correct;
    
    IF NOT v_identity_exists THEN
        RAISE NOTICE '❌ No auth.identities found - CREATING (this was the problem!)';
        
        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, provider_id,
            last_sign_in_at, created_at, updated_at
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
            v_user_id::text,
            NULL,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ Created auth.identities record';
        
    ELSIF NOT v_identity_correct THEN
        RAISE NOTICE '⚠️ Identity exists but is corrupted - FIXING';
        
        UPDATE auth.identities
        SET 
            provider_id = v_user_id::text,
            identity_data = jsonb_build_object(
                'sub', v_user_id::text,
                'email', '23ec41@aiktc.ac.in',
                'email_verified', true,
                'phone_verified', false
            ),
            updated_at = NOW()
        WHERE user_id = v_user_id AND provider = 'email';
        
        RAISE NOTICE '✅ Fixed auth.identities record';
    ELSE
        RAISE NOTICE '✅ auth.identities is correct';
    END IF;
    
    -- Link profile if exists
    UPDATE profiles
    SET auth_user_id = v_user_id
    WHERE college_email = '23ec41@aiktc.ac.in'
    AND (auth_user_id IS NULL OR auth_user_id != v_user_id);
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '  COMPLETED! User can now login with:';
    RAISE NOTICE '  Email: 23ec41@aiktc.ac.in';
    RAISE NOTICE '  Password: password';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- STEP 3: VERIFY FIX
-- ============================================================================

SELECT 
    '3. VERIFICATION' as step,
    au.email,
    au.id as auth_user_id,
    au.encrypted_password IS NOT NULL as has_password,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    au.is_sso_user,
    i.id IS NOT NULL as has_identity,
    i.provider,
    i.provider_id = au.id::text as provider_id_correct,
    p.id IS NOT NULL as has_profile,
    p.full_name,
    CASE 
        WHEN au.id IS NOT NULL 
            AND au.encrypted_password IS NOT NULL 
            AND au.email_confirmed_at IS NOT NULL
            AND i.id IS NOT NULL 
            AND i.provider_id = au.id::text 
        THEN '✅ CAN LOGIN'
        ELSE '❌ STILL HAS ISSUES'
    END as final_status
FROM auth.users au
LEFT JOIN auth.identities i ON i.user_id = au.id AND i.provider = 'email'
LEFT JOIN profiles p ON p.college_email = au.email
WHERE au.email = '23ec41@aiktc.ac.in';
