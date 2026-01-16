-- Migration: Add unique constraints and email validation to profiles table
-- Purpose: 
-- 1. Ensure roll_number is unique
-- 2. Ensure college_email is unique
-- 3. Add constraint to only allow emails ending with @aiktc.ac.in or @bonhomie.com

-- Step 1: Add unique constraints
ALTER TABLE profiles 
ADD CONSTRAINT profiles_roll_number_unique UNIQUE (roll_number);

ALTER TABLE profiles 
ADD CONSTRAINT profiles_college_email_unique UNIQUE (college_email);

-- Step 2: Add email domain validation constraint
ALTER TABLE profiles
ADD CONSTRAINT profiles_email_domain_check 
CHECK (
    college_email LIKE '%@aiktc.ac.in' OR 
    college_email LIKE '%@bonhomie.com'
);

-- Note: If there are existing duplicate roll_numbers or college_emails, 
-- you need to clean them up first before running this migration.
-- To find duplicates, run:
-- SELECT roll_number, COUNT(*) FROM profiles GROUP BY roll_number HAVING COUNT(*) > 1;
-- SELECT college_email, COUNT(*) FROM profiles GROUP BY college_email HAVING COUNT(*) > 1;
