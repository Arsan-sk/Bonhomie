-- ============================================
-- Fix Admin User Role & Verify All Roles
-- ============================================

-- Step 1: Find the admin user
SELECT id, full_name, college_email, role 
FROM profiles 
WHERE college_email = 'admin@bonhomie.com';

-- Step 2: Update admin user to have 'admin' role
UPDATE profiles 
SET role = 'admin'
WHERE college_email = 'admin@bonhomie.com';

-- Step 3: Verify the update
SELECT id, full_name, college_email, role 
FROM profiles 
WHERE college_email = 'admin@bonhomie.com';

-- Step 4: List all users with their roles (for verification)
SELECT id, full_name, college_email, role, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 20;

-- Step 5: Verify coordinator2 exists (if created)
SELECT id, full_name, college_email, role
FROM profiles
WHERE college_email = 'coordinator2@bonhomie.com';
