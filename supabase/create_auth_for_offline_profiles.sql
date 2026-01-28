-- ============================================
-- Create Auth Users for Offline Profiles
-- Allows offline-registered users to login
-- Date: January 29, 2026
-- ============================================

-- PROBLEM:
-- Offline profiles created via "Add Participant" only exist in profiles table
-- They don't have auth.users entries, so they can't login
-- Email: rollnumber@aiktc.ac.in, Password: "password" doesn't work

-- SOLUTION:
-- Create auth.users entries for all offline profiles (is_admin_created = TRUE)
-- with default password "Bonhomie@2026"

-- ============================================
-- IMPORTANT SECURITY NOTE
-- ============================================
-- This uses Supabase admin functions which require SERVICE ROLE KEY
-- DO NOT run this from the frontend (browser)
-- MUST run from Supabase SQL Editor (uses service role automatically)

-- ============================================
-- Step 1: Create auth users for offline profiles
-- ============================================

-- Create a function to create auth users
CREATE OR REPLACE FUNCTION create_auth_for_offline_profiles()
RETURNS TABLE (
    profile_id UUID,
    roll_number TEXT,
    email TEXT,
    status TEXT
) AS $$
DECLARE
    profile_record RECORD;
    auth_user_id UUID;
BEGIN
    -- Loop through all offline profiles without auth users
    FOR profile_record IN 
        SELECT 
            p.id,
            p.roll_number,
            p.college_email,
            p.full_name
        FROM profiles p
        WHERE p.is_admin_created = TRUE
        AND p.auth_user_id IS NULL
    LOOP
        BEGIN
            -- Try to create auth user with default password
            -- Note: This uses the auth.users table directly
            -- Password will be hashed by Supabase
            
            -- Insert into auth.users
            INSERT INTO auth.users (
                id,
                email,
                encrypted_password,
                email_confirmed_at,
                raw_app_meta_data,
                raw_user_meta_data,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                profile_record.college_email,
                crypt('Bonhomie@2026', gen_salt('bf')),  -- Default password
                NOW(),  -- Email already confirmed
                '{"provider":"email","providers":["email"]}'::jsonb,
                jsonb_build_object('full_name', profile_record.full_name),
                NOW(),
                NOW()
            )
            RETURNING id INTO auth_user_id;
            
            -- Link the auth user to the profile
            UPDATE profiles 
            SET auth_user_id = auth_user_id
            WHERE id = profile_record.id;
            
            -- Return success
            profile_id := profile_record.id;
            roll_number := profile_record.roll_number;
            email := profile_record.college_email;
            status := 'SUCCESS';
            RETURN NEXT;
            
        EXCEPTION WHEN OTHERS THEN
            -- Return error
            profile_id := profile_record.id;
            roll_number := profile_record.roll_number;
            email := profile_record.college_email;
            status := 'ERROR: ' || SQLERRM;
            RETURN NEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function
SELECT * FROM create_auth_for_offline_profiles();

-- ============================================
-- Alternative: Manual Auth User Creation
-- ============================================

-- If the function above doesn't work due to permissions,
-- use Supabase Admin API or create users manually:

-- Option 1: Using Supabase Dashboard
-- 1. Go to Authentication -> Users
-- 2. Click "Invite User"
-- 3. Enter email: rollnumber@aiktc.ac.in
-- 4. User will receive email to set password
-- 5. Update profile.auth_user_id with the new auth user id

-- Option 2: Using SQL to link existing auth users
-- If users already signed up independently:
UPDATE profiles p
SET auth_user_id = au.id
FROM auth.users au
WHERE p.college_email = au.email
AND p.is_admin_created = TRUE
AND p.auth_user_id IS NULL;

-- ============================================
-- Verification Queries
-- ============================================

-- Check offline profiles without auth users
SELECT 
    p.id as profile_id,
    p.roll_number,
    p.full_name,
    p.college_email,
    p.is_admin_created,
    p.auth_user_id,
    CASE 
        WHEN p.auth_user_id IS NULL THEN '❌ No Auth User'
        WHEN au.id IS NOT NULL THEN '✅ Auth User Exists'
        ELSE '⚠️ Auth User ID set but invalid'
    END as auth_status
FROM profiles p
LEFT JOIN auth.users au ON au.id::text = p.auth_user_id::text
WHERE p.is_admin_created = TRUE
ORDER BY p.created_at DESC;

-- Count profiles by auth status
SELECT 
    CASE 
        WHEN auth_user_id IS NULL THEN 'No Auth User'
        ELSE 'Has Auth User'
    END as status,
    COUNT(*) as count
FROM profiles
WHERE is_admin_created = TRUE
GROUP BY (auth_user_id IS NULL);

-- ============================================
-- SIMPLER SOLUTION (RECOMMENDED)
-- ============================================

-- Instead of creating auth users in bulk,
-- provide a "Activate Account" flow:

-- 1. Offline profile created (no auth user)
-- 2. Student goes to registration page
-- 3. Enters email (rollnumber@aiktc.ac.in) and creates password
-- 4. System checks if profile exists with that email
-- 5. If exists with is_admin_created=TRUE:
--    - Create auth user with their chosen password
--    - Link auth_user_id to existing profile
--    - Login successful

-- This way:
-- - Students choose their own passwords (more secure)
-- - No default passwords needed
-- - Students "activate" their offline-created profiles

-- ============================================
-- Cleanup Functions
-- ============================================

-- Drop the function if you want to recreate it
DROP FUNCTION IF EXISTS create_auth_for_offline_profiles();

-- ============================================
-- Success Messages
-- ============================================

SELECT '⚠️ NOTE: Creating auth users with default passwords is not recommended' AS warning;
SELECT '✅ BETTER APPROACH: Let students activate their accounts on first login' AS recommendation;
SELECT '📧 Students should register with their email (rollnumber@aiktc.ac.in) to activate' AS instruction;
