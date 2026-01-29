-- ============================================
-- BULK FIX: MATCH AUTH.USERS.ID TO PROFILE.ID
-- ============================================
-- Problem: 380 profiles have auth.users where auth.users.id != profile.id
-- Solution: Delete mismatched auth.users, create new ones with id = profile.id
-- This matches the fix we did for 23EC41
-- ============================================

-- STEP 1: First, let's see what we're dealing with
-- ============================================

SELECT 
    '1. PROFILES WITH MISMATCHED AUTH' as check,
    p.id as profile_id,
    p.college_email,
    p.full_name,
    au.id as current_auth_user_id,
    CASE WHEN p.id = au.id THEN '✅ MATCH' ELSE '❌ MISMATCH - NEEDS FIX' END as status
FROM profiles p
JOIN auth.users au ON LOWER(au.email) = LOWER(p.college_email)
WHERE p.id != au.id
LIMIT 20;

-- Count how many need fixing
SELECT 
    '1B. COUNT NEEDING FIX' as check,
    COUNT(*) as profiles_needing_fix
FROM profiles p
JOIN auth.users au ON LOWER(au.email) = LOWER(p.college_email)
WHERE p.id != au.id;

-- ============================================
-- STEP 2: Delete existing mismatched auth records (identities first, then users)
-- ============================================

-- 2A. Delete identities for mismatched users
DELETE FROM auth.identities
WHERE user_id IN (
    SELECT au.id 
    FROM auth.users au
    JOIN profiles p ON LOWER(p.college_email) = LOWER(au.email)
    WHERE au.id != p.id
);

-- 2B. Delete sessions for mismatched users
DELETE FROM auth.sessions
WHERE user_id IN (
    SELECT au.id 
    FROM auth.users au
    JOIN profiles p ON LOWER(p.college_email) = LOWER(au.email)
    WHERE au.id != p.id
);

-- 2C. Delete refresh_tokens for mismatched users
DELETE FROM auth.refresh_tokens
WHERE user_id IN (
    SELECT au.id 
    FROM auth.users au
    JOIN profiles p ON LOWER(p.college_email) = LOWER(au.email)
    WHERE au.id != p.id
);

-- 2D. Delete the mismatched auth.users
DELETE FROM auth.users
WHERE id IN (
    SELECT au.id 
    FROM auth.users au
    JOIN profiles p ON LOWER(p.college_email) = LOWER(au.email)
    WHERE au.id != p.id
);

-- ============================================
-- STEP 3: Create new auth.users with id = profile.id
-- ============================================

DO $$
DECLARE
    profile_rec RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_count INTEGER := 0;
    v_password_hash TEXT;
BEGIN
    -- Pre-compute password hash once
    v_password_hash := crypt('password', gen_salt('bf'));
    
    RAISE NOTICE 'Starting bulk auth user creation...';
    
    -- Loop through all profiles that don't have matching auth.users
    FOR profile_rec IN 
        SELECT 
            p.id,
            p.college_email,
            p.full_name,
            p.roll_number
        FROM profiles p
        LEFT JOIN auth.users au ON au.id = p.id
        WHERE au.id IS NULL  -- No auth.users with matching id
          AND p.college_email IS NOT NULL
          AND p.college_email != ''
    LOOP
        BEGIN
            -- Insert auth.users with id = profile.id
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
                profile_rec.id,                           -- id = profile.id (KEY FIX!)
                '00000000-0000-0000-0000-000000000000',   -- instance_id
                'authenticated',                          -- aud
                'authenticated',                          -- role
                LOWER(profile_rec.college_email),         -- email (lowercase)
                v_password_hash,                          -- password = 'password'
                v_now,                                    -- email_confirmed_at
                NULL,                                     -- invited_at
                '',                                       -- confirmation_token
                NULL,                                     -- confirmation_sent_at
                '',                                       -- recovery_token
                NULL,                                     -- recovery_sent_at
                '',                                       -- email_change_token_new
                '',                                       -- email_change
                NULL,                                     -- email_change_sent_at
                NULL,                                     -- last_sign_in_at
                '{"provider": "email", "providers": ["email"]}'::jsonb,
                jsonb_build_object('full_name', COALESCE(profile_rec.full_name, '')),
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
                FALSE,                                    -- is_sso_user (MUST be FALSE)
                NULL,                                     -- deleted_at
                FALSE                                     -- is_anonymous
            );
            
            -- Insert identity with provider_id = profile.id
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
                profile_rec.id,                           -- user_id = profile.id
                jsonb_build_object(
                    'sub', profile_rec.id::text,
                    'email', LOWER(profile_rec.college_email),
                    'email_verified', true,
                    'phone_verified', false
                ),
                'email',
                profile_rec.id::text,                     -- provider_id = profile.id as text
                v_now,
                v_now,
                v_now
            );
            
            -- Update profile to clear auth_user_id (since id = auth.users.id now)
            UPDATE profiles 
            SET auth_user_id = NULL,
                is_admin_created = FALSE,
                updated_at = v_now
            WHERE id = profile_rec.id;
            
            v_count := v_count + 1;
            
            IF v_count % 50 = 0 THEN
                RAISE NOTICE 'Processed % profiles...', v_count;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error processing %: %', profile_rec.college_email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Completed! Created % auth users', v_count;
END $$;

-- ============================================
-- STEP 4: Verify the fix
-- ============================================

-- 4A. Check total counts
SELECT '4A. TOTAL PROFILES' as check, COUNT(*) as count FROM profiles;
SELECT '4B. TOTAL AUTH.USERS' as check, COUNT(*) as count FROM auth.users;
SELECT '4C. TOTAL IDENTITIES' as check, COUNT(*) as count FROM auth.identities;

-- 4B. Check matching status now
SELECT 
    '4D. MATCH STATUS' as check,
    COUNT(*) as total_profiles,
    COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM auth.users au WHERE au.id = p.id)) as profiles_with_matching_auth,
    COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = p.id)) as profiles_without_matching_auth
FROM profiles p;

-- 4C. Sample verification
SELECT 
    '4E. SAMPLE VERIFICATION' as check,
    p.id as profile_id,
    p.college_email,
    au.id as auth_user_id,
    ai.provider_id,
    CASE WHEN p.id = au.id THEN '✅ ID MATCH' ELSE '❌ MISMATCH' END as id_status,
    CASE WHEN ai.provider_id = p.id::text THEN '✅ PROVIDER_ID MATCH' ELSE '❌ MISMATCH' END as provider_status
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.id
LEFT JOIN auth.identities ai ON ai.user_id = p.id
WHERE p.college_email LIKE '%@aiktc.ac.in'
LIMIT 10;

-- 4D. Check a few specific users
SELECT 
    '4F. SPECIFIC USERS CHECK' as check,
    p.id as profile_id,
    p.college_email,
    au.id as auth_user_id,
    au.encrypted_password IS NOT NULL as has_password,
    ai.provider_id = p.id::text as provider_id_matches,
    '✅ Ready to login with password "password"' as status
FROM profiles p
JOIN auth.users au ON au.id = p.id
JOIN auth.identities ai ON ai.user_id = p.id
WHERE p.college_email IN ('23ec59@aiktc.ac.in', '23ec41@aiktc.ac.in', '23ds33@aiktc.ac.in')
ORDER BY p.college_email;

-- ============================================
-- DONE! All users should now be able to login with:
-- Email: their college email
-- Password: password
-- ============================================
