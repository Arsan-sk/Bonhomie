-- FIX FOR DUPLICATE REGISTRATION ERRORS
-- Run this in Supabase SQL Editor to fix the 500 error issue
-- This will check for duplicates BEFORE inserting and return clear error messages

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
    -- Extract values from metadata
    v_roll_number := NEW.raw_user_meta_data->>'roll_number';
    v_email := NEW.email;
    
    -- ========================================
    -- CHECK FOR DUPLICATE ROLL NUMBER
    -- ========================================
    IF v_roll_number IS NOT NULL AND v_roll_number != '' THEN
        SELECT COUNT(*) INTO v_existing_roll_count
        FROM profiles
        WHERE roll_number = v_roll_number;
        
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
    -- INSERT PROFILE (only if no duplicates)
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
        v_roll_number,
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

-- Verify trigger was created
SELECT 'Trigger updated successfully! Test by registering with a duplicate roll number.' AS status;
