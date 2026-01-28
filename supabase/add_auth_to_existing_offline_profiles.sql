-- ============================================
-- Add Auth Users for Existing Offline Profiles
-- Fixes profiles created BEFORE immediate login implementation
-- Creates auth.users entries for profiles with:
--   - is_admin_created = TRUE
--   - auth_user_id = NULL (no auth user yet)
-- Date: January 29, 2026
-- ============================================

-- ⚠️ IMPORTANT: Run this in Supabase SQL Editor ONLY
-- This requires service role privileges

-- ============================================
-- Step 1: Check existing offline profiles without auth
-- ============================================

SELECT 
    roll_number,
    full_name,
    college_email,
    phone,
    is_admin_created,
    auth_user_id,
    CASE 
        WHEN auth_user_id IS NULL THEN '❌ Needs Auth User'
        ELSE '✅ Has Auth User'
    END as status
FROM profiles
WHERE is_admin_created = TRUE
ORDER BY created_at DESC;

-- ============================================
-- Step 2: Create function to add auth users for existing profiles
-- ============================================

CREATE OR REPLACE FUNCTION add_auth_to_existing_offline_profiles()
RETURNS TABLE (
    profile_id UUID,
    roll_number TEXT,
    email TEXT,
    status TEXT,
    auth_user_id UUID
) AS $$
DECLARE
    profile_record RECORD;
    v_auth_user_id UUID;
    v_encrypted_password TEXT;
BEGIN
    -- Hash the default password
    v_encrypted_password := crypt('Bonhomie@2026', gen_salt('bf'));

    -- Loop through all offline profiles without auth users
    FOR profile_record IN 
        SELECT 
            p.id,
            p.roll_number,
            p.college_email,
            p.full_name,
            p.phone
        FROM profiles p
        WHERE p.is_admin_created = TRUE
        AND p.auth_user_id IS NULL
    LOOP
        BEGIN
            -- Check if email already exists in auth.users
            IF EXISTS (SELECT 1 FROM auth.users WHERE email = profile_record.college_email) THEN
                -- Email exists, just link it
                SELECT au.id INTO v_auth_user_id
                FROM auth.users au
                WHERE au.email = profile_record.college_email;

                -- Update profile to link to existing auth user
                UPDATE profiles 
                SET auth_user_id = v_auth_user_id
                WHERE id = profile_record.id;

                -- Return success with existing auth user
                profile_id := profile_record.id;
                roll_number := profile_record.roll_number;
                email := profile_record.college_email;
                status := 'LINKED_EXISTING_AUTH_USER';
                auth_user_id := v_auth_user_id;
                RETURN NEXT;
            ELSE
                -- Create new auth user
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
                    gen_random_uuid(),
                    'authenticated',
                    'authenticated',
                    profile_record.college_email,
                    v_encrypted_password,
                    NOW(), -- Email already confirmed
                    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
                    jsonb_build_object('full_name', profile_record.full_name, 'roll_number', profile_record.roll_number),
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
                        'email', profile_record.college_email,
                        'email_verified', true,
                        'phone_verified', false
                    ),
                    'email',
                    v_auth_user_id::text,
                    NOW(),
                    NOW(),
                    NOW()
                );

                -- Link the auth user to the profile
                UPDATE profiles 
                SET auth_user_id = v_auth_user_id
                WHERE id = profile_record.id;

                -- Update audit log
                INSERT INTO audit_logs (
                    action_type,
                    entity_type,
                    entity_id,
                    details
                ) VALUES (
                    'auth_user_added_to_existing_profile',
                    'profile',
                    profile_record.id,
                    jsonb_build_object(
                        'roll_number', profile_record.roll_number,
                        'full_name', profile_record.full_name,
                        'email', profile_record.college_email,
                        'auth_user_id', v_auth_user_id,
                        'default_password', 'Bonhomie@2026',
                        'note', 'Auth user added retroactively for existing offline profile'
                    )
                );
                
                -- Return success
                profile_id := profile_record.id;
                roll_number := profile_record.roll_number;
                email := profile_record.college_email;
                status := 'CREATED_NEW_AUTH_USER';
                auth_user_id := v_auth_user_id;
                RETURN NEXT;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- Return error
            profile_id := profile_record.id;
            roll_number := profile_record.roll_number;
            email := profile_record.college_email;
            status := 'ERROR: ' || SQLERRM;
            auth_user_id := NULL;
            RETURN NEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_auth_to_existing_offline_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION add_auth_to_existing_offline_profiles TO service_role;

-- ============================================
-- Step 3: Run the function to add auth users
-- ============================================

SELECT * FROM add_auth_to_existing_offline_profiles();

-- Expected output:
-- Shows each profile that was processed with status:
-- - CREATED_NEW_AUTH_USER: New auth user created successfully
-- - LINKED_EXISTING_AUTH_USER: Linked to existing auth user
-- - ERROR: Something went wrong (see message)

-- ============================================
-- Step 4: Verify results
-- ============================================

-- Check all offline profiles now have auth users
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

-- Count results
SELECT 
    COUNT(*) as total_offline,
    COUNT(auth_user_id) as can_login,
    COUNT(*) - COUNT(auth_user_id) as cannot_login
FROM profiles
WHERE is_admin_created = TRUE;

-- Expected: can_login = 3, cannot_login = 0

-- ============================================
-- Step 5: Get login credentials for students
-- ============================================

-- List all offline profiles with their credentials
SELECT 
    roll_number,
    full_name,
    college_email as login_email,
    'Bonhomie@2026' as default_password,
    CASE 
        WHEN auth_user_id IS NOT NULL THEN '✅ Can Login Now'
        ELSE '❌ Cannot Login'
    END as status
FROM profiles
WHERE is_admin_created = TRUE
ORDER BY roll_number;

-- ============================================
-- Step 6: Test login
-- ============================================

-- Try logging in with one of the profiles:
-- 1. Go to your login page
-- 2. Use credentials from the query above
-- 3. Email: (from college_email column)
-- 4. Password: Bonhomie@2026
-- 5. Should login successfully!

-- ============================================
-- Cleanup (Optional)
-- ============================================

-- If you want to remove the function after use:
-- DROP FUNCTION IF EXISTS add_auth_to_existing_offline_profiles();

-- ============================================
-- Important Notes
-- ============================================

-- 📝 What this script does:
--   ✅ Finds all profiles with is_admin_created = TRUE and auth_user_id = NULL
--   ✅ Creates auth.users entries for each
--   ✅ Sets default password: Bonhomie@2026
--   ✅ Links profiles to auth users via auth_user_id
--   ✅ Creates auth.identities entries
--   ✅ Logs to audit_logs table

-- 🔐 Default credentials for all offline profiles:
--   Email: rollnumber@aiktc.ac.in (from profile)
--   Password: Bonhomie@2026 (same for all)

-- ⚠️ Security reminder:
--   Students should change their password after first login!

-- 🎯 After running this script:
--   - All existing offline profiles can now login
--   - New profiles created will automatically have auth users
--   - No more "must register to activate" needed

-- ============================================
-- Success Message
-- ============================================

SELECT '✅ Script completed! Check results above.' as message;
SELECT 'Students can now login with: rollnumber@aiktc.ac.in / Bonhomie@2026' as instructions;
