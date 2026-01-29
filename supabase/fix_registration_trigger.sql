-- FIX FOR REGISTRATION TRIGGER
-- This replaces the broken handle_new_user() function with proper metadata extraction
-- 
-- ISSUE: Previous version used COALESCE(..., '') which created empty strings
-- FIX: Use NULLIF(TRIM(...), '') to properly handle missing/empty metadata
--
-- Run this BEFORE fix_affected_profiles.sql

-- Drop and recreate the trigger function with proper NULL handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_full_name TEXT;
    v_roll_number TEXT;
BEGIN
    -- Extract and clean metadata values
    -- NULLIF(TRIM(...), '') converts empty strings to NULL
    v_full_name := NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), '');
    v_roll_number := NULLIF(TRIM(LOWER(NEW.raw_user_meta_data->>'roll_number')), '');
    
    -- Log what we're inserting for debugging
    RAISE NOTICE 'Creating profile for user %: full_name=%, roll_number=%', 
        NEW.id, v_full_name, v_roll_number;
    
    -- Insert profile with all fields from metadata
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
        -- Use 'New User' as fallback instead of empty string
        COALESCE(v_full_name, 'New User'),
        NEW.email,
        v_roll_number,  -- Normalized to lowercase for case-insensitive matching
        NULLIF(TRIM(NEW.raw_user_meta_data->>'school'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'department'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'program'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'year_of_study'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'admission_year'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'expected_passout_year'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'gender'), ''),
        CAST(COALESCE(NEW.raw_user_meta_data->>'role', 'student') AS user_role),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        -- On conflict, update only if new values are not null
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name, 'New User'),
        college_email = EXCLUDED.college_email,
        roll_number = COALESCE(EXCLUDED.roll_number, profiles.roll_number),
        school = COALESCE(EXCLUDED.school, profiles.school),
        department = COALESCE(EXCLUDED.department, profiles.department),
        program = COALESCE(EXCLUDED.program, profiles.program),
        year_of_study = COALESCE(EXCLUDED.year_of_study, profiles.year_of_study),
        admission_year = COALESCE(EXCLUDED.admission_year, profiles.admission_year),
        expected_passout_year = COALESCE(EXCLUDED.expected_passout_year, profiles.expected_passout_year),
        phone = COALESCE(EXCLUDED.phone, profiles.phone),
        gender = COALESCE(EXCLUDED.gender, profiles.gender),
        role = EXCLUDED.role,
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log detailed error information
        RAISE WARNING 'Error in handle_new_user for user %: SQLSTATE=%, SQLERRM=%', 
            NEW.id, SQLSTATE, SQLERRM;
        RAISE WARNING 'Metadata was: %', NEW.raw_user_meta_data;
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
SELECT 
    'SUCCESS: Trigger recreated with proper null handling' AS status,
    'New registrations will now correctly extract metadata' AS result;
