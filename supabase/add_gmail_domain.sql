-- ADD @GMAIL.COM TO ALLOWED EMAIL DOMAINS
-- This updates the email domain constraint to allow @gmail.com, @aiktc.ac.in, and @bonhomie.com

-- Drop the existing email domain constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_domain_check;

-- Add the new constraint with @gmail.com included
ALTER TABLE profiles
ADD CONSTRAINT profiles_email_domain_check 
CHECK (
    college_email IS NULL OR
    college_email LIKE '%@aiktc.ac.in' OR 
    college_email LIKE '%@bonhomie.com' OR
    college_email LIKE '%@gmail.com'
);

-- Verify the constraint was updated
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'profiles_email_domain_check';

-- Success message
SELECT 'Email domain constraint updated! @gmail.com is now allowed.' AS status;
