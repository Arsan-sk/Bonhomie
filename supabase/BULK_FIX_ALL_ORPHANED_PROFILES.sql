-- ============================================================================
-- BULK FIX: Create auth records for ALL orphaned profiles
-- This fixes "Database error querying schema" for ALL users at once
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================================

-- ============================================================================
-- STEP 1: DIAGNOSIS - Find all profiles without proper auth records
-- ============================================================================

-- Show all orphaned profiles (profiles without auth.users)
SELECT 
    '1. ORPHANED PROFILES (no auth.users)' as diagnosis,
    p.id as profile_id,
    p.college_email,
    p.full_name,
    p.auth_user_id,
    p.is_admin_created,
    CASE 
        WHEN au.id IS NULL THEN '❌ NO AUTH USER'
        ELSE '✅ Has auth user'
    END as auth_status
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.auth_user_id OR au.id = p.id
WHERE au.id IS NULL
ORDER BY p.college_email;

-- Count of problematic profiles
SELECT 
    '2. SUMMARY' as info,
    COUNT(*) as total_orphaned_profiles
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.auth_user_id OR au.id = p.id
WHERE au.id IS NULL;

-- ============================================================================
-- STEP 2: BULK FIX - Create auth.users and auth.identities for ALL orphaned profiles
-- ============================================================================

DO $$
DECLARE
    orphan_record RECORD;
    v_user_id uuid;
    v_now timestamptz := now();
    v_count int := 0;
    v_errors int := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Starting bulk fix for orphaned profiles';
    RAISE NOTICE '========================================';
    
    -- Loop through all profiles that don't have auth.users records
    FOR orphan_record IN 
        SELECT 
            p.id as profile_id,
            p.college_email,
            p.full_name,
            p.auth_user_id
        FROM profiles p
        LEFT JOIN auth.users au ON au.id = p.auth_user_id OR au.id = p.id
        WHERE au.id IS NULL
          AND p.college_email IS NOT NULL
          AND p.college_email != ''
    LOOP
        BEGIN
            RAISE NOTICE 'Processing: % (%)', orphan_record.college_email, orphan_record.full_name;
            
            -- Generate new UUID for auth user
            v_user_id := gen_random_uuid();
            
            -- Clean up any existing broken records for this email
            DELETE FROM auth.sessions WHERE user_id IN (SELECT id FROM auth.users WHERE email = orphan_record.college_email);
            DELETE FROM auth.refresh_tokens WHERE user_id IN (SELECT id::text FROM auth.users WHERE email = orphan_record.college_email);
            DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = orphan_record.college_email);
            DELETE FROM auth.users WHERE email = orphan_record.college_email;
            
            -- Create auth.users record
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
                '00000000-0000-0000-0000-000000000000',
                'authenticated',
                'authenticated',
                orphan_record.college_email,
                crypt('password', gen_salt('bf')),  -- Default password: "password"
                v_now,
                NULL,
                '',
                NULL,
                '',
                NULL,
                '',
                '',
                NULL,
                NULL,
                '{"provider": "email", "providers": ["email"]}'::jsonb,
                jsonb_build_object('full_name', COALESCE(orphan_record.full_name, '')),
                FALSE,
                v_now,
                v_now,
                NULL,
                NULL,
                '',
                '',
                NULL,
                '',
                0,
                NULL,
                '',
                NULL,
                FALSE,
                NULL,
                FALSE
            );
            
            -- Create auth.identities record (REQUIRED for login)
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
                    'email', orphan_record.college_email,
                    'email_verified', true,
                    'phone_verified', false
                ),
                'email',
                v_user_id::text,
                v_now,
                v_now,
                v_now
            );
            
            -- Update profile to link to auth user and set is_admin_created = TRUE
            UPDATE profiles 
            SET 
                auth_user_id = v_user_id,
                is_admin_created = TRUE
            WHERE id = orphan_record.profile_id;
            
            v_count := v_count + 1;
            RAISE NOTICE '✅ Fixed: % (auth_user_id: %)', orphan_record.college_email, v_user_id;
            
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            RAISE NOTICE '❌ Error fixing %: %', orphan_record.college_email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Bulk fix completed!';
    RAISE NOTICE 'Fixed: % profiles', v_count;
    RAISE NOTICE 'Errors: % profiles', v_errors;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Default password for all fixed users: password';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 3: VERIFICATION - Check results
-- ============================================================================

-- Check remaining orphaned profiles (should be 0)
SELECT 
    '3a. REMAINING ORPHANED PROFILES (should be 0)' as check,
    COUNT(*) as count
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.auth_user_id OR au.id = p.id
WHERE au.id IS NULL;

-- Show all profiles with their auth status
SELECT 
    '3b. ALL PROFILES STATUS' as check,
    p.college_email,
    p.full_name,
    p.is_admin_created,
    CASE WHEN au.id IS NOT NULL THEN '✅' ELSE '❌' END as has_auth_user,
    CASE WHEN ai.id IS NOT NULL THEN '✅' ELSE '❌' END as has_identity
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.auth_user_id OR au.id = p.id
LEFT JOIN auth.identities ai ON ai.user_id = au.id
ORDER BY p.college_email
LIMIT 50;

-- ============================================================================
-- STEP 4: Also fix profiles where auth_user_id exists but no auth.users record
-- ============================================================================

-- Find profiles where auth_user_id is set but points to non-existent auth.users
SELECT 
    '4. PROFILES WITH INVALID auth_user_id' as check,
    p.id,
    p.college_email,
    p.auth_user_id,
    'auth_user_id points to non-existent auth.users' as issue
FROM profiles p
WHERE p.auth_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = p.auth_user_id);

-- Fix these too
DO $$
DECLARE
    invalid_record RECORD;
    v_user_id uuid;
    v_now timestamptz := now();
    v_count int := 0;
BEGIN
    RAISE NOTICE 'Fixing profiles with invalid auth_user_id...';
    
    FOR invalid_record IN 
        SELECT 
            p.id as profile_id,
            p.college_email,
            p.full_name,
            p.auth_user_id
        FROM profiles p
        WHERE p.auth_user_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = p.auth_user_id)
          AND p.college_email IS NOT NULL
    LOOP
        BEGIN
            v_user_id := gen_random_uuid();
            
            -- Clean up
            DELETE FROM auth.users WHERE email = invalid_record.college_email;
            
            -- Create auth.users
            INSERT INTO auth.users (
                id, instance_id, aud, role, email, encrypted_password,
                email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                is_super_admin, created_at, updated_at, is_sso_user, is_anonymous,
                confirmation_token, recovery_token, email_change_token_new,
                email_change, phone_change, phone_change_token,
                email_change_token_current, email_change_confirm_status,
                reauthentication_token
            ) VALUES (
                v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
                invalid_record.college_email, crypt('password', gen_salt('bf')),
                v_now, '{"provider": "email", "providers": ["email"]}'::jsonb,
                jsonb_build_object('full_name', COALESCE(invalid_record.full_name, '')),
                FALSE, v_now, v_now, FALSE, FALSE,
                '', '', '', '', '', '', '', 0, ''
            );
            
            -- Create identity
            INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
            VALUES (
                gen_random_uuid(), v_user_id,
                jsonb_build_object('sub', v_user_id::text, 'email', invalid_record.college_email, 'email_verified', true, 'phone_verified', false),
                'email', v_user_id::text, v_now, v_now, v_now
            );
            
            -- Update profile
            UPDATE profiles SET auth_user_id = v_user_id, is_admin_created = TRUE WHERE id = invalid_record.profile_id;
            
            v_count := v_count + 1;
            RAISE NOTICE '✅ Fixed invalid auth_user_id: %', invalid_record.college_email;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Error: % - %', invalid_record.college_email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Fixed % profiles with invalid auth_user_id', v_count;
END $$;

-- ============================================================================
-- FINAL CHECK
-- ============================================================================

SELECT 
    'FINAL STATUS' as report,
    (SELECT COUNT(*) FROM profiles) as total_profiles,
    (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%@aiktc.ac.in' OR email LIKE '%@gmail.com') as total_auth_users,
    (SELECT COUNT(*) FROM profiles p WHERE EXISTS (SELECT 1 FROM auth.users au WHERE au.id = p.auth_user_id OR au.id = p.id)) as profiles_with_auth,
    (SELECT COUNT(*) FROM profiles p WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = p.auth_user_id OR au.id = p.id)) as profiles_without_auth;
