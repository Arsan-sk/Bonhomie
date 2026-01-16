-- COMPREHENSIVE FIX FOR USER REGISTRATION
-- Run this ENTIRE script in Supabase SQL Editor
-- This handles everything: enum, trigger, and constraints

-- ============================================
-- STEP 1: Add new enum values if needed
-- ============================================
DO $$ 
BEGIN
    -- Add 'student' to enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'student' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'student';
    END IF;
    
    -- Add 'coordinator' to enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'coordinator' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'coordinator';
    END IF;
END $$;

-- Migrate existing data
UPDATE profiles SET role = 'student' WHERE role = 'user';
UPDATE profiles SET role = 'coordinator' WHERE role = 'faculty';

-- ============================================
-- STEP 2: Drop existing constraints (if any)
-- ============================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_roll_number_unique;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_college_email_unique;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_domain_check;

-- ============================================
-- STEP 3: Fix the user creation trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with all data from user metadata
  INSERT INTO public.profiles (
    id,
    full_name,
    college_email,
    roll_number,
    school,
    department,
    program,
    year_of_study,
    admission_year,
    expected_passout_year,
    phone,
    gender,
    role,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    new.email,
    new.raw_user_meta_data->>'roll_number',
    new.raw_user_meta_data->>'school',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'program',
    new.raw_user_meta_data->>'year_of_study',
    new.raw_user_meta_data->>'admission_year',
    new.raw_user_meta_data->>'expected_passout_year',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'gender',
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    now(),
    now()
  );
  
  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log the error details
    RAISE LOG 'Error in handle_new_user for user %: % %', new.id, SQLERRM, SQLSTATE;
    -- Re-raise the error so it's visible
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 4: Add constraints (with data cleanup first)
-- ============================================

-- Clean up any duplicate roll numbers (keep the most recent one)
WITH duplicates AS (
  SELECT id, roll_number,
         ROW_NUMBER() OVER (PARTITION BY roll_number ORDER BY created_at DESC) as rn
  FROM profiles
  WHERE roll_number IS NOT NULL
)
DELETE FROM profiles 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Clean up any duplicate emails (keep the most recent one)
WITH duplicates AS (
  SELECT id, college_email,
         ROW_NUMBER() OVER (PARTITION BY college_email ORDER BY created_at DESC) as rn
  FROM profiles
  WHERE college_email IS NOT NULL
)
DELETE FROM profiles 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Now add unique constraints
ALTER TABLE profiles 
ADD CONSTRAINT profiles_roll_number_unique UNIQUE (roll_number);

ALTER TABLE profiles 
ADD CONSTRAINT profiles_college_email_unique UNIQUE (college_email);

-- Add email domain validation (allows NULL for backward compatibility)
ALTER TABLE profiles
ADD CONSTRAINT profiles_email_domain_check 
CHECK (
    college_email IS NULL OR
    college_email LIKE '%@aiktc.ac.in' OR 
    college_email LIKE '%@bonhomie.com'
);

-- ============================================
-- VERIFICATION QUERIES (optional - comment out if not needed)
-- ============================================
-- Check enum values
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'user_role'::regtype ORDER BY enumlabel;

-- Check trigger exists
-- SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';

-- Check constraints
-- SELECT constraint_name FROM information_schema.table_constraints 
-- WHERE table_name = 'profiles' AND constraint_type = 'UNIQUE';

-- Registration fix completed successfully!
