-- ============================================
-- Fix: Allow Admins to Update User Roles
-- Issue: RLS policy blocks admins from updating other users' profiles
-- Solution: Add policy allowing admins to update any profile
-- ============================================

-- Step 1: Ensure all required enum values exist
DO $$ 
BEGIN
    -- Add 'student' if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'student' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'student';
    END IF;
    
    -- Add 'coordinator' if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'coordinator' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'coordinator';
    END IF;
END $$;

-- Step 2: Normalize existing data (convert old values to new ones)
UPDATE profiles SET role = 'student' WHERE role = 'user';
UPDATE profiles SET role = 'coordinator' WHERE role = 'faculty';

-- Step 3: Drop existing update policies to avoid conflicts
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- Step 4: Users can update their own profile (standard fields)
-- Note: Users CANNOT change their own role
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid() 
    -- Ensure users cannot elevate their own role
    AND (
        -- Role is not being changed
        role = (SELECT role FROM profiles WHERE id = auth.uid())
        OR
        -- Role field is not included in the update (NULL in NEW record means not being updated)
        role IS NULL
    )
);

-- Step 5: Admins can update ANY profile (including roles)
CREATE POLICY "Admins can update any profile"
ON profiles FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- ============================================
-- Verification Queries
-- ============================================

-- Verify enum values
SELECT enumlabel as role_value 
FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- Verify policies are created
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND policyname IN ('Users can update own profile', 'Admins can update any profile')
ORDER BY policyname;

-- Test current user's role (run as admin to verify)
SELECT id, full_name, college_email, role 
FROM profiles 
WHERE id = auth.uid();

-- ============================================
-- Success Message
-- ============================================
DO $$ 
BEGIN
    RAISE NOTICE 'Admin role update permissions have been configured successfully!';
    RAISE NOTICE 'Admins can now promote/demote users between student and coordinator roles.';
END $$;
