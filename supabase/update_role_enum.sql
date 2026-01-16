-- Update role enum to student, coordinator, admin
-- This migration changes the user_role enum values

-- Step 1: Add new enum values if they don't exist
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'student';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'coordinator';

-- Step 2: Update existing 'user' roles to 'student'
UPDATE profiles SET role = 'student' WHERE role = 'user';

-- Step 3: Update existing 'faculty' roles to 'coordinator'  
UPDATE profiles SET role = 'coordinator' WHERE role = 'faculty';

-- Note: After running this, you should manually drop old enum values if needed
-- PostgreSQL doesn't allow dropping enum values directly, so if you want to remove 'user' and 'faculty',
-- you'd need to recreate the enum type entirely (more complex operation)

-- For now, the enum will have: 'user', 'faculty', 'admin', 'student', 'coordinator'
-- But we'll only use: 'student', 'coordinator', 'admin'
