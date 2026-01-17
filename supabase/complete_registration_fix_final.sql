-- ============================================
-- COMPREHENSIVE REGISTRATION FIX
-- Fixes: Unique constraints, trigger conflicts, RLS issues
-- ============================================

-- STEP 1: Clean up orphaned auth users (email in auth but no profile)
-- These are from failed registration attempts
DO $$
DECLARE
    orphaned_user RECORD;
BEGIN
    FOR orphaned_user IN 
        SELECT au.id, au.email
        FROM auth.users au
        LEFT JOIN public.profiles p ON au.id = p.id
        WHERE p.id IS NULL
    LOOP
        RAISE NOTICE 'Deleting orphaned user: %', orphaned_user.email;
        DELETE FROM auth.users WHERE id = orphaned_user.id;
    END LOOP;
END $$;

-- STEP 2: Update trigger to handle conflicts gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile with conflict handling
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
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'roll_number',
    NEW.raw_user_meta_data->>'school',
    NEW.raw_user_meta_data->>'department',
    NEW.raw_user_meta_data->>'program',
    NEW.raw_user_meta_data->>'year_of_study',
    NEW.raw_user_meta_data->>'admission_year',
    NEW.raw_user_meta_data->>'expected_passout_year',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'gender',
    CAST(COALESCE(NEW.raw_user_meta_data->>'role', 'student') AS user_role),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    college_email = EXCLUDED.college_email,
    roll_number = EXCLUDED.roll_number,
    school = EXCLUDED.school,
    department = EXCLUDED.department,
    program = EXCLUDED.program,
    year_of_study = EXCLUDED.year_of_study,
    admission_year = EXCLUDED.admission_year,
    expected_passout_year = EXCLUDED.expected_passout_year,
    phone = EXCLUDED.phone,
    gender = EXCLUDED.gender,
    role = EXCLUDED.role,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Check which unique constraint was violated
    IF SQLERRM LIKE '%profiles_college_email_unique%' THEN
      DELETE FROM auth.users WHERE id = NEW.id;
      RAISE EXCEPTION 'Email already registered. This email address is already in use. Please use a different email or try logging in.';
    ELSIF SQLERRM LIKE '%profiles_roll_number_unique%' THEN
      DELETE FROM auth.users WHERE id = NEW.id;
      RAISE EXCEPTION 'Roll number already registered. This roll number is already in use. Please check your roll number or contact admin.';
    ELSE
      DELETE FROM auth.users WHERE id = NEW.id;
      RAISE EXCEPTION 'Registration failed: Duplicate data. Email or Roll Number already exists.';
    END IF;
  WHEN check_violation THEN
    -- Email domain validation failed
    DELETE FROM auth.users WHERE id = NEW.id;
    RAISE EXCEPTION 'Invalid email domain. Only @aiktc.ac.in and @bonhomie.com emails are allowed.';
  WHEN not_null_violation THEN
    -- Required field missing
    DELETE FROM auth.users WHERE id = NEW.id;
    RAISE EXCEPTION 'Missing required information. Please fill in all required fields.';
  WHEN others THEN
    -- Generic error with details
    RAISE WARNING 'Error in handle_new_user for user %: SQLSTATE=%, SQLERRM=%', NEW.id, SQLSTATE, SQLERRM;
    DELETE FROM auth.users WHERE id = NEW.id;
    RAISE EXCEPTION 'Registration failed: %. Please try again or contact support.', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- STEP 3: Make unique constraints DEFERRABLE (allows rollback on conflict)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_roll_number_unique;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_college_email_unique;

-- Re-add as deferrable constraints
ALTER TABLE profiles 
ADD CONSTRAINT profiles_roll_number_unique 
UNIQUE (roll_number) 
DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_college_email_unique 
UNIQUE (college_email) 
DEFERRABLE INITIALLY DEFERRED;

-- STEP 4: Relax email domain constraint (allow NULL for flexibility)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_domain_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_email_domain_check 
CHECK (
    college_email IS NULL OR
    college_email LIKE '%@aiktc.ac.in' OR 
    college_email LIKE '%@bonhomie.com'
) NOT VALID;

-- Validate existing data
ALTER TABLE profiles VALIDATE CONSTRAINT profiles_email_domain_check;

-- STEP 5: Grant proper permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- STEP 6: Ensure RLS policies are correct
-- Drop old policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recreate with proper checks
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- STEP 7: Check for duplicate roll numbers and emails
-- This will show if there are conflicts
SELECT 'Duplicate Roll Numbers:' as check_type;
SELECT roll_number, COUNT(*) as count
FROM profiles 
WHERE roll_number IS NOT NULL
GROUP BY roll_number 
HAVING COUNT(*) > 1;

SELECT 'Duplicate Emails:' as check_type;
SELECT college_email, COUNT(*) as count
FROM profiles 
WHERE college_email IS NOT NULL
GROUP BY college_email 
HAVING COUNT(*) > 1;

-- STEP 8: Show orphaned auth users (if any remain)
SELECT 'Orphaned Auth Users:' as check_type;
SELECT au.id, au.email, au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Success message
SELECT 'Registration fix completed! All issues should be resolved.' as status;
