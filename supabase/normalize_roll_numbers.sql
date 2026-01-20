-- FIX FOR ROLL NUMBER CASE SENSITIVITY
-- This script will:
-- 1. Convert all existing roll numbers to lowercase
-- 2. Update the trigger to always store roll numbers in lowercase
-- 3. Update duplicate checking to be case-insensitive

-- ============================================
-- STEP 1: Convert all existing roll numbers to lowercase
-- ============================================
UPDATE profiles
SET roll_number = LOWER(roll_number)
WHERE roll_number IS NOT NULL
  AND roll_number != LOWER(roll_number);

SELECT 'Existing roll numbers converted to lowercase' AS status;

-- ============================================
-- STEP 2: Update the registration trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_roll_number TEXT;
    v_email TEXT;
    v_existing_roll_count INT;
    v_existing_email_count INT;
BEGIN
    -- Extract values from metadata and normalize roll number to lowercase
    v_roll_number := LOWER(NEW.raw_user_meta_data->>'roll_number');
    v_email := NEW.email;
    
    -- ========================================
    -- CHECK FOR DUPLICATE ROLL NUMBER (case-insensitive)
    -- ========================================
    IF v_roll_number IS NOT NULL AND v_roll_number != '' THEN
        SELECT COUNT(*) INTO v_existing_roll_count
        FROM profiles
        WHERE LOWER(roll_number) = v_roll_number;
        
        IF v_existing_roll_count > 0 THEN
            -- Return a clear error message that frontend can catch
            RAISE EXCEPTION 'Roll number % is already registered. Please use a different roll number or contact support if this is your roll number.'
                , v_roll_number
                USING ERRCODE = '23505';  -- unique_violation error code
        END IF;
    END IF;
    
    -- ========================================
    -- CHECK FOR DUPLICATE EMAIL
    -- ========================================
    SELECT COUNT(*) INTO v_existing_email_count
    FROM profiles
    WHERE college_email = v_email;
    
    IF v_existing_email_count > 0 THEN
        -- Return a clear error message
        RAISE EXCEPTION 'Email % is already registered. Please login instead or use a different email.'
            , v_email
            USING ERRCODE = '23505';  -- unique_violation error code
    END IF;
    
    -- ========================================
    -- INSERT PROFILE (with lowercase roll number)
    -- ========================================
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
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
        NEW.email,
        v_roll_number,  -- Already converted to lowercase above
        NEW.raw_user_meta_data->>'school',
        NEW.raw_user_meta_data->>'department',
        NEW.raw_user_meta_data->>'program',
        NEW.raw_user_meta_data->>'year_of_study',
        NEW.raw_user_meta_data->>'admission_year',
        NEW.raw_user_meta_data->>'expected_passout_year',
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'gender',
        COALESCE(NEW.raw_user_meta_data->>'role', 'student')::user_role,
        NOW(),
        NOW()
    );
    
    RETURN NEW;
    
EXCEPTION
    WHEN unique_violation THEN
        -- If somehow a unique violation still occurs, provide clear message
        IF SQLERRM LIKE '%roll_number%' THEN
            RAISE EXCEPTION 'Roll number is already registered. Please use a different roll number.';
        ELSIF SQLERRM LIKE '%email%' THEN
            RAISE EXCEPTION 'Email is already registered. Please login instead.';
        ELSE
            RAISE EXCEPTION 'Duplicate registration detected: %', SQLERRM;
        END IF;
    WHEN OTHERS THEN
        -- Log the error for debugging
        RAISE LOG 'Registration error for user %: SQLSTATE=%, SQLERRM=%', 
            NEW.id, SQLSTATE, SQLERRM;
        -- Re-raise with context
        RAISE EXCEPTION 'Registration failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
    'Roll number normalization complete!' AS status,
    COUNT(*) AS total_profiles,
    COUNT(CASE WHEN roll_number ~ '[A-Z]' THEN 1 END) AS still_has_uppercase
FROM profiles;
