-- Auto-create profile when user is created in auth.users
-- This trigger ensures every authenticated user gets a profile entry

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Determine role from user metadata (set during signup)
    -- Default to 'student' if no role specified
    user_role := COALESCE(
        NEW.raw_user_meta_data->>'role',
        'student'
    );

    -- Insert into profiles table
    INSERT INTO public.profiles (
        id,
        role,
        full_name,
        college_email,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        user_role,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
        NEW.email,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        college_email = EXCLUDED.college_email,
        updated_at = NOW();

    RETURN NEW;
END;
$$;

-- Create trigger that fires after user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, anon, authenticated, service_role;
