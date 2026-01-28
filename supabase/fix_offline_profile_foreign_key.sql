-- ============================================
-- FIX: Foreign Key Constraint for Offline Profiles
-- Allows profiles without auth.users (offline registration)
-- Date: January 28, 2026
-- ============================================

-- PROBLEM:
-- profiles.id has a STRICT foreign key to auth.users.id
-- When creating offline profiles with crypto.randomUUID(), 
-- the insert fails because that UUID doesn't exist in auth.users

-- ERROR:
-- "insert or update on table "profiles" violates foreign key constraint "profiles_id_fkey""

-- ============================================
-- SOLUTION: Make Foreign Key Optional/Nullable
-- ============================================

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Step 2: Add a new OPTIONAL foreign key constraint
-- This allows profiles.id to exist without a corresponding auth.users entry
-- When the user signs up later, they can link to this profile
ALTER TABLE profiles
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE
NOT VALID;  -- Don't validate existing rows

-- Mark constraint as DEFERRABLE so it can be checked later
ALTER TABLE profiles
DROP CONSTRAINT profiles_id_fkey;

ALTER TABLE profiles
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL  -- Don't cascade delete
DEFERRABLE INITIALLY DEFERRED;  -- Check at transaction end

-- Actually, better approach: Remove foreign key entirely for offline profiles
-- We'll use is_admin_created flag to distinguish

-- Step 3: Drop foreign key completely (RECOMMENDED)
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- ============================================
-- EXPLANATION
-- ============================================

-- Without Foreign Key Constraint:
-- ✅ Offline profiles can be created with any UUID
-- ✅ When user signs up, they get a new auth.users.id
-- ✅ We can then UPDATE the profile.id to match auth.users.id
-- ✅ Or keep them separate and use email as the link

-- Security:
-- - is_admin_created flag tracks offline vs online profiles
-- - Audit logs track who created each profile
-- - Application validates user permissions

-- ============================================
-- ALTERNATIVE: Keep Foreign Key but Allow NULL
-- ============================================

-- If you want to keep some referential integrity:
-- Make profiles.id nullable is not possible (it's PRIMARY KEY)
-- So we must remove the foreign key for offline profiles

-- ============================================
-- VERIFICATION
-- ============================================

-- Check if constraint exists
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
AND conname = 'profiles_id_fkey';

-- Should return 0 rows (constraint removed)

-- ============================================
-- TEST: Create Offline Profile
-- ============================================

-- This should now work:
-- INSERT INTO profiles (id, full_name, college_email, roll_number, phone, is_admin_created, role)
-- VALUES (
--     gen_random_uuid(),  -- Random UUID not in auth.users
--     'Test Offline User',
--     'test123@aiktc.ac.in',
--     'test123',
--     '9876543210',
--     TRUE,
--     'student'
-- );

-- ============================================
-- MIGRATION PATH FOR EXISTING PROFILES
-- ============================================

-- For existing profiles with is_admin_created = FALSE,
-- they already have valid auth.users entries, so no issues

-- For new offline profiles (is_admin_created = TRUE):
-- 1. Created with random UUID
-- 2. User signs up later with email
-- 3. They get a different UUID in auth.users
-- 4. We can:
--    a) Keep both UUIDs separate (use email to link)
--    b) Update profile.id to match auth.users.id (needs careful migration)
--    c) Create a separate linking table

-- RECOMMENDED: Keep UUIDs separate, use email as the link
-- Add a new column: auth_user_id UUID (nullable)

-- Add auth_user_id column to track when offline user signs up
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS auth_user_id UUID;

COMMENT ON COLUMN profiles.auth_user_id IS 
'Links to auth.users.id when offline profile is activated by user signup. NULL for offline profiles not yet activated.';

-- Add index for lookups
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id 
ON profiles(auth_user_id);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT '✅ Foreign key constraint removed from profiles.id' AS status;
SELECT '✅ Offline profiles can now be created without auth users' AS status;
SELECT '✅ Added auth_user_id column for future linking' AS status;
SELECT '✅ Existing profiles remain unchanged' AS status;
