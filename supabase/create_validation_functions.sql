-- CREATE HELPER FUNCTIONS FOR FRONTEND VALIDATION
-- These functions allow frontend to check for duplicates before registration

-- Function 1: Check if email exists in auth.users
CREATE OR REPLACE FUNCTION check_email_exists(p_email TEXT)
RETURNS TABLE(email_exists BOOLEAN, user_id UUID) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(SELECT 1 FROM auth.users WHERE email = p_email) as email_exists,
        (SELECT id FROM auth.users WHERE email = p_email LIMIT 1) as user_id;
END;
$$;

-- Function 2: Check if roll number exists in auth.users metadata
CREATE OR REPLACE FUNCTION check_roll_number_exists(p_roll_number TEXT)
RETURNS TABLE(roll_exists BOOLEAN, user_email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(
            SELECT 1 FROM auth.users 
            WHERE LOWER(NULLIF(TRIM(raw_user_meta_data->>'roll_number'), '')) = LOWER(p_roll_number)
        ) as roll_exists,
        (
            SELECT email FROM auth.users 
            WHERE LOWER(NULLIF(TRIM(raw_user_meta_data->>'roll_number'), '')) = LOWER(p_roll_number)
            LIMIT 1
        ) as user_email;
END;
$$;

-- Verify functions were created
SELECT 
    '=== FUNCTIONS CREATED ===' as section,
    'check_email_exists' as function_1,
    'check_roll_number_exists' as function_2,
    'Frontend can now validate before registration' as status;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_roll_number_exists(TEXT) TO authenticated, anon;

SELECT '=== PERMISSIONS GRANTED ===' as section,
       'Authenticated and anonymous users can now call these functions' as status;
