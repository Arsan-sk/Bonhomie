-- FINAL FIX: Simple trigger that handles NULL values properly
-- This version is more robust and won't fail on missing data

-- Drop and recreate the trigger function with better NULL handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile with NULL-safe data extraction
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
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log detailed error
    RAISE WARNING 'Error in handle_new_user for user %: SQLSTATE=%, SQLERRM=%', NEW.id, SQLSTATE, SQLERRM;
    -- Re-raise to prevent user creation without profile
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger is properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verify the trigger was created
SELECT 'Trigger created successfully' AS status;
