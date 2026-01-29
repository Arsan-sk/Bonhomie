-- ============================================================================
-- FIND AND FIX ORPHANED PROFILES (profiles without auth.users)
-- Date: January 29, 2026
-- ============================================================================

-- ============================================================================
-- PART 1: DIAGNOSE - Find all profiles WITHOUT auth.users
-- ============================================================================

-- 1.1 Count orphaned profiles
SELECT 
    'ORPHANED PROFILES SUMMARY' as report,
    (SELECT COUNT(*) FROM profiles) as total_profiles,
    (SELECT COUNT(*) FROM profiles p WHERE EXISTS (SELECT 1 FROM auth.users au WHERE au.email = p.college_email)) as profiles_with_auth,
    (SELECT COUNT(*) FROM profiles p WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.email = p.college_email)) as profiles_WITHOUT_auth_CANNOT_LOGIN;

-- 1.2 List ALL orphaned profiles (no auth.users record)
SELECT 
    'ORPHANED - NO AUTH.USERS' as status,
    p.id as profile_id,
    p.college_email,
    p.roll_number,
    p.full_name,
    p.role,
    p.is_admin_created,
    p.created_at
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users au WHERE au.email = p.college_email
)
ORDER BY p.college_email;

-- ============================================================================
-- PART 2: FIX - Create auth.users for ALL orphaned profiles
-- Password will be set to: password
-- ============================================================================

DO $$
DECLARE
    rec RECORD;
    v_user_id UUID;
    v_count INTEGER := 0;
    v_password_hash TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '  CREATING AUTH.USERS FOR ORPHANED PROFILES';
    RAISE NOTICE '  Default password: password';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';

    -- Generate password hash for 'password'
    v_password_hash := crypt('password', gen_salt('bf'));

    FOR rec IN 
        SELECT p.id as profile_id, p.college_email, p.full_name, p.role, p.is_admin_created
        FROM profiles p
        WHERE p.college_email IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.email = p.college_email)
    LOOP
        -- Generate new UUID for auth user
        v_user_id := gen_random_uuid();
        
        RAISE NOTICE '  Creating auth for: % (profile_id: %)', rec.college_email, rec.profile_id;
        
        -- 1. Create auth.users record
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
            updated_at,
            confirmation_token,
            recovery_token
        ) VALUES (
            v_user_id,
            '00000000-0000-0000-0000-000000000000',
            rec.college_email,
            v_password_hash,
            NOW(),  -- Email confirmed
            jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
            jsonb_build_object('full_name', rec.full_name, 'role', rec.role),
            'authenticated',
            'authenticated',
            NOW(),
            NOW(),
            '',
            ''
        );
        
        -- 2. Create auth.identities record (REQUIRED for login!)
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
            NOW(),
            NOW(),
            NOW()
        );
        
        -- 3. Link profile to auth user (update auth_user_id)
        UPDATE profiles
        SET auth_user_id = v_user_id
        WHERE id = rec.profile_id;
        
        v_count := v_count + 1;
        RAISE NOTICE '    ✅ Created auth user: % for %', v_user_id, rec.college_email;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '  COMPLETED: Created % auth users', v_count;
    RAISE NOTICE '  All users can now login with password: password';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PART 3: VERIFY - Check that all profiles now have auth.users
-- ============================================================================

SELECT 
    'AFTER FIX - VERIFICATION' as report,
    (SELECT COUNT(*) FROM profiles) as total_profiles,
    (SELECT COUNT(*) FROM profiles p WHERE EXISTS (SELECT 1 FROM auth.users au WHERE au.email = p.college_email)) as profiles_with_auth,
    (SELECT COUNT(*) FROM profiles p WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.email = p.college_email)) as profiles_still_without_auth;

-- Verify the specific users
SELECT 
    'SPECIFIC USERS CHECK' as report,
    p.college_email,
    p.full_name,
    au.id as auth_user_id,
    EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = au.id) as has_identity,
    '✅ Can login with password: password' as status
FROM profiles p
JOIN auth.users au ON au.email = p.college_email
WHERE p.college_email IN ('23ec59@aiktc.ac.in', '23ds33@aiktc.ac.in');
