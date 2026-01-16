-- Fix user registration trigger to handle all profile fields correctly
-- This replaces the existing handle_new_user() function

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
    new.raw_user_meta_data->>'full_name',
    new.email, -- Use the auth email as college_email
    new.raw_user_meta_data->>'roll_number',
    new.raw_user_meta_data->>'school',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'program',
    new.raw_user_meta_data->>'year_of_study',
    new.raw_user_meta_data->>'admission_year',
    new.raw_user_meta_data->>'expected_passout_year',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'gender',
    COALESCE(new.raw_user_meta_data->>'role', 'student'), -- Default to 'student' for registrations
    now(),
    now()
  );
  
  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log the error and re-raise it
    RAISE LOG 'Error in handle_new_user: % %', SQLERRM, SQLSTATE;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger to ensure it's using the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
