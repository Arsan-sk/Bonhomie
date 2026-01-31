-- ============================================
-- BULK FIX: MATCH AUTH.USERS.ID TO PROFILE.ID
-- ============================================
-- FIXED: Type casting for varchar/uuid columns
-- FIXED: Includes ALL domains, not just @aiktc.ac.in
-- ============================================

-- STEP 1: First, let's see what we're dealing with ok(ALL DOMAINS)
-- ============================================

SELECT 
    '1A. PROFILES WITH MISMATCHED AUTH' as check,
    p.id as profile_id,
    p.college_email,
    p.full_name,
    au.id as current_auth_user_id,
    CASE WHEN p.id = au.id THEN '✅ MATCH' ELSE '❌ MISMATCH - NEEDS FIX' END as status
FROM profiles p
JOIN auth.users au ON LOWER(au.email) = LOWER(p.college_email)
WHERE p.id != au.id
LIMIT 20;

-- Count how many need fixing (ALL DOMAINS)
SELECT 
    '1B. COUNT NEEDING FIX' as check,
    COUNT(*) as profiles_needing_fix
FROM profiles p
JOIN auth.users au ON LOWER(au.email) = LOWER(p.college_email)
WHERE p.id != au.id;

-- Show by domain
SELECT 
    '1C. MISMATCHES BY DOMAIN' as check,
    SUBSTRING(p.college_email FROM POSITION('@' IN p.college_email)) as domain,
    COUNT(*) as count
FROM profiles p
JOIN auth.users au ON LOWER(au.email) = LOWER(p.college_email)
WHERE p.id != au.id
GROUP BY SUBSTRING(p.college_email FROM POSITION('@' IN p.college_email))
ORDER BY count DESC;

-- ============================================
-- STEP 2: Delete existing mismatched auth records
-- ============================================

-- 2A. Get the list of mismatched auth.users IDs first
-- Store them for reference
CREATE TEMP TABLE IF NOT EXISTS mismatched_auth_ids AS
SELECT au.id as auth_user_id, p.id as profile_id, au.email
FROM auth.users au
JOIN profiles p ON LOWER(p.college_email) = LOWER(au.email)
WHERE au.id != p.id;

SELECT '2A. MISMATCHED AUTH IDS TO DELETE' as check, COUNT(*) as count FROM mismatched_auth_ids;

-- 2B. Delete identities for mismatched users (user_id is uuid)
DELETE FROM auth.identities
WHERE user_id IN (SELECT auth_user_id FROM mismatched_auth_ids);

-- 2C. Delete sessions for mismatched users (user_id is uuid)
DELETE FROM auth.sessions
WHERE user_id IN (SELECT auth_user_id FROM mismatched_auth_ids);

-- 2D. Delete refresh_tokens for mismatched users (user_id is VARCHAR - need cast!)
DELETE FROM auth.refresh_tokens
WHERE user_id::uuid IN (SELECT auth_user_id FROM mismatched_auth_ids);

-- 2E. Delete mfa_factors if exists
DELETE FROM auth.mfa_factors
WHERE user_id IN (SELECT auth_user_id FROM mismatched_auth_ids);

-- 2F. Delete mfa_challenges if exists  
DELETE FROM auth.mfa_challenges
WHERE factor_id IN (
    SELECT id FROM auth.mfa_factors WHERE user_id IN (SELECT auth_user_id FROM mismatched_auth_ids)
);

-- 2G. Delete one_time_tokens if exists
DELETE FROM auth.one_time_tokens
WHERE user_id IN (SELECT auth_user_id FROM mismatched_auth_ids);

-- 2H. Delete the mismatched auth.users
DELETE FROM auth.users
WHERE id IN (SELECT auth_user_id FROM mismatched_auth_ids);

SELECT '2I. DELETED MISMATCHED AUTH USERS' as check, 
       (SELECT COUNT(*) FROM auth.users) as remaining_auth_users;

-- Drop temp table
DROP TABLE IF EXISTS mismatched_auth_ids;

-- ============================================
-- STEP 3: Create new auth.users with id = profile.id
-- ============================================

DO $$
DECLARE
    profile_rec RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_count INTEGER := 0;
    v_error_count INTEGER := 0;
    v_password_hash TEXT;
BEGIN
    -- Pre-compute password hash once
    v_password_hash := crypt('password', gen_salt('bf'));
    
    RAISE NOTICE 'Starting bulk auth user creation...';
    RAISE NOTICE 'Password will be set to: password';
    
    -- Loop through ALL profiles that don't have matching auth.users
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
          AND p.college_email LIKE '%@%'  -- Must have @ for valid email
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
            
            -- Clear auth_user_id since profile.id = auth.users.id now
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
            v_error_count := v_error_count + 1;
            RAISE NOTICE 'Error processing %: %', profile_rec.college_email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Completed! Created % auth users', v_count;
    RAISE NOTICE 'Errors: %', v_error_count;
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- STEP 4: Verify the fix
-- ============================================

-- 4A. Check total counts
SELECT '4A. TOTAL PROFILES' as check, COUNT(*) as count FROM profiles;
SELECT '4B. TOTAL AUTH.USERS' as check, COUNT(*) as count FROM auth.users;
SELECT '4C. TOTAL IDENTITIES' as check, COUNT(*) as count FROM auth.identities;

-- 4D. Check matching status now
SELECT 
    '4D. MATCH STATUS (ALL DOMAINS)' as check,
    COUNT(*) as total_profiles,
    COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM auth.users au WHERE au.id = p.id)) as profiles_with_matching_auth,
    COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = p.id)) as profiles_without_matching_auth
FROM profiles p;

-- 4E. Breakdown by domain
SELECT 
    '4E. STATUS BY DOMAIN' as check,
    SUBSTRING(p.college_email FROM POSITION('@' IN p.college_email)) as domain,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM auth.users au WHERE au.id = p.id)) as matched,
    COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = p.id)) as unmatched
FROM profiles p
WHERE p.college_email LIKE '%@%'
GROUP BY SUBSTRING(p.college_email FROM POSITION('@' IN p.college_email))
ORDER BY total DESC;

-- 4F. Sample verification
SELECT 
    '4F. SAMPLE VERIFICATION' as check,
    p.id as profile_id,
    p.college_email,
    au.id as auth_user_id,
    ai.provider_id,
    CASE WHEN p.id = au.id THEN '✅ ID MATCH' ELSE '❌ MISMATCH' END as id_status,
    CASE WHEN ai.provider_id = p.id::text THEN '✅ PROVIDER_ID MATCH' ELSE '❌ MISMATCH' END as provider_status
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.id
LEFT JOIN auth.identities ai ON ai.user_id = p.id
LIMIT 15;

-- 4G. Check if any mismatches remain
SELECT 
    '4G. ANY REMAINING MISMATCHES?' as check,
    p.id as profile_id,
    p.college_email,
    au.id as auth_user_id_mismatch
FROM profiles p
JOIN auth.users au ON LOWER(au.email) = LOWER(p.college_email)
WHERE p.id != au.id
LIMIT 10;

-- ============================================
-- DONE! All users should now be able to login with:
-- Email: their college email
-- Password: password
-- ============================================
