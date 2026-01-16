-- DEBUG: Check current trigger function and test it
-- Run these queries one by one to diagnose the issue

-- 1. Check what the current trigger function looks like
SELECT pg_get_functiondef('public.handle_new_user()'::regprocedure);

-- 2. Check if trigger exists
SELECT trigger_name, event_manipulation, event_object_table, action_statement 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 3. Check current role enum values
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'user_role'::regtype ORDER BY enumlabel;

-- 4. Check if there are any profiles with NULL required fields
SELECT id, full_name, college_email, roll_number, role 
FROM profiles 
WHERE roll_number IS NULL OR college_email IS NULL
LIMIT 10;

-- 5. Test metadata extraction (this simulates what the trigger does)
-- Replace the sample JSON with actual user metadata if you have an example
SELECT 
    '{"full_name": "Test User", "roll_number": "TEST123", "school": "SOET"}'::jsonb->>'full_name' as full_name,
    '{"full_name": "Test User", "roll_number": "TEST123", "school": "SOET"}'::jsonb->>'roll_number' as roll_number,
    '{"full_name": "Test User", "roll_number": "TEST123", "school": "SOET"}'::jsonb->>'school' as school;

-- 6. Check for any lingering duplicate data
SELECT roll_number, COUNT(*) as count
FROM profiles 
WHERE roll_number IS NOT NULL
GROUP BY roll_number 
HAVING COUNT(*) > 1;

SELECT college_email, COUNT(*) as count
FROM profiles 
WHERE college_email IS NOT NULL
GROUP BY college_email 
HAVING COUNT(*) > 1;
