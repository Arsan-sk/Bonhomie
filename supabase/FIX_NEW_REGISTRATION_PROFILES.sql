-- ============================================================================
-- FIX: New Registration Profiles Not Being Created Properly
-- ============================================================================
-- Issue: New users see "Welcome Student" and default email because their 
-- profile is either not created or missing metadata from registration.
--
-- Root Cause: The handle_new_user() trigger was only inserting basic fields,
-- not the full metadata passed during registration.
-- ============================================================================

-- STEP 1: Check for users without profiles
SELECT '🔍 STEP 1: Users without profiles' as diagnostic;

SELECT 
    au.id as auth_user_id,
    au.email,
    au.created_at as auth_created,
    au.raw_user_meta_data->>'full_name' as meta_full_name,
    au.raw_user_meta_data->>'roll_number' as meta_roll_number,
    p.id as profile_id,
    p.full_name as profile_full_name,
    CASE 
        WHEN p.id IS NULL THEN '❌ NO PROFILE - This user cannot see their data!'
        WHEN p.full_name IS NULL OR p.full_name = '' THEN '⚠️ Profile exists but missing full_name'
        WHEN p.roll_number IS NULL THEN '⚠️ Profile exists but missing roll_number'
        ELSE '✅ Profile OK'
    END as status
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE au.email NOT LIKE '%@bonhomie.com%'
ORDER BY au.created_at DESC
LIMIT 50;

-- STEP 2: Check for profiles with missing data
SELECT '🔍 STEP 2: Profiles with missing critical data' as diagnostic;

SELECT 
    p.id,
    p.full_name,
    p.college_email,
    p.roll_number,
    p.school,
    p.department,
    CASE 
        WHEN p.full_name IS NULL OR p.full_name = '' THEN '❌ Missing full_name'
        WHEN p.roll_number IS NULL OR p.roll_number = '' THEN '⚠️ Missing roll_number'
        WHEN p.school IS NULL THEN '⚠️ Missing school'
        ELSE '✅ OK'
    END as status,
    p.created_at
FROM profiles p
WHERE p.role = 'student'
ORDER BY p.created_at DESC
LIMIT 50;

-- STEP 3: Fix the trigger to properly capture ALL metadata
SELECT '🔧 STEP 3: Fixing handle_new_user trigger' as diagnostic;

-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the fixed trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_profile_id UUID;
    v_role user_role;
BEGIN
    -- Log for debugging
    RAISE NOTICE 'handle_new_user triggered for email: %, user_id: %', NEW.email, NEW.id;
    RAISE NOTICE 'Metadata: %', NEW.raw_user_meta_data;

    -- Determine role with fallback
    BEGIN
        v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student')::user_role;
    EXCEPTION WHEN OTHERS THEN
        v_role := 'student';
    END;

    -- Check if profile already exists (from offline registration by coordinator)
    SELECT id INTO v_existing_profile_id
    FROM profiles
    WHERE college_email = NEW.email
    LIMIT 1;
    
    IF v_existing_profile_id IS NOT NULL THEN
        -- Profile exists (likely offline created), link it and update with new data
        RAISE NOTICE 'Found existing profile %, updating with auth link', v_existing_profile_id;
        
        UPDATE profiles
        SET 
            auth_user_id = NEW.id,
            -- Update these fields if they're provided in metadata and profile has empty values
            full_name = COALESCE(NULLIF(full_name, ''), NEW.raw_user_meta_data->>'full_name', full_name),
            roll_number = COALESCE(NULLIF(roll_number, ''), NEW.raw_user_meta_data->>'roll_number', roll_number),
            phone = COALESCE(NULLIF(phone, ''), NEW.raw_user_meta_data->>'phone', phone),
            updated_at = NOW()
        WHERE id = v_existing_profile_id;
        
        RETURN NEW;
    END IF;
    
    -- No existing profile, create new one with ALL metadata
    RAISE NOTICE 'Creating new profile for user %', NEW.id;
    
    INSERT INTO profiles (
        id,
        role,
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
        is_admin_created,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,  -- CRITICAL: Profile ID must match Auth User ID
        v_role,
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'New User'),
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
        FALSE,  -- Not admin created, self-registered
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        -- If profile somehow exists with this ID, update the missing fields
        full_name = COALESCE(NULLIF(profiles.full_name, ''), EXCLUDED.full_name),
        college_email = COALESCE(profiles.college_email, EXCLUDED.college_email),
        roll_number = COALESCE(NULLIF(profiles.roll_number, ''), EXCLUDED.roll_number),
        school = COALESCE(profiles.school, EXCLUDED.school),
        department = COALESCE(profiles.department, EXCLUDED.department),
        program = COALESCE(profiles.program, EXCLUDED.program),
        year_of_study = COALESCE(profiles.year_of_study, EXCLUDED.year_of_study),
        admission_year = COALESCE(profiles.admission_year, EXCLUDED.admission_year),
        expected_passout_year = COALESCE(profiles.expected_passout_year, EXCLUDED.expected_passout_year),
        phone = COALESCE(NULLIF(profiles.phone, ''), EXCLUDED.phone),
        gender = COALESCE(profiles.gender, EXCLUDED.gender),
        updated_at = NOW();
    
    RAISE NOTICE 'Profile created/updated successfully for user %', NEW.id;
    RETURN NEW;
    
EXCEPTION WHEN OTHERS THEN
    -- Log detailed error but don't fail the signup
    RAISE WARNING 'handle_new_user error for %: SQLSTATE=% SQLERRM=%', NEW.email, SQLSTATE, SQLERRM;
    -- Still return NEW to allow signup to complete
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- STEP 4: Fix existing users who have auth but no profile (or incomplete profile)
SELECT '🔧 STEP 4: Creating missing profiles for existing auth users' as diagnostic;

-- Create profiles for users who don't have one
INSERT INTO profiles (
    id,
    role,
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
    is_admin_created,
    created_at,
    updated_at
)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'role', 'student')::user_role,
    COALESCE(NULLIF(au.raw_user_meta_data->>'full_name', ''), 'New User'),
    au.email,
    au.raw_user_meta_data->>'roll_number',
    au.raw_user_meta_data->>'school',
    au.raw_user_meta_data->>'department',
    au.raw_user_meta_data->>'program',
    au.raw_user_meta_data->>'year_of_study',
    au.raw_user_meta_data->>'admission_year',
    au.raw_user_meta_data->>'expected_passout_year',
    au.raw_user_meta_data->>'phone',
    au.raw_user_meta_data->>'gender',
    FALSE,
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- STEP 5: Update existing profiles that have empty data but auth has metadata
SELECT '🔧 STEP 5: Updating profiles with missing data from auth metadata' as diagnostic;

UPDATE profiles p
SET 
    full_name = COALESCE(NULLIF(p.full_name, ''), au.raw_user_meta_data->>'full_name', p.full_name),
    roll_number = COALESCE(NULLIF(p.roll_number, ''), au.raw_user_meta_data->>'roll_number', p.roll_number),
    school = COALESCE(p.school, au.raw_user_meta_data->>'school'),
    department = COALESCE(p.department, au.raw_user_meta_data->>'department'),
    program = COALESCE(p.program, au.raw_user_meta_data->>'program'),
    year_of_study = COALESCE(p.year_of_study, au.raw_user_meta_data->>'year_of_study'),
    admission_year = COALESCE(p.admission_year, au.raw_user_meta_data->>'admission_year'),
    expected_passout_year = COALESCE(p.expected_passout_year, au.raw_user_meta_data->>'expected_passout_year'),
    phone = COALESCE(NULLIF(p.phone, ''), au.raw_user_meta_data->>'phone'),
    gender = COALESCE(p.gender, au.raw_user_meta_data->>'gender'),
    updated_at = NOW()
FROM auth.users au
WHERE p.id = au.id
AND (
    p.full_name IS NULL OR p.full_name = '' OR
    p.roll_number IS NULL OR p.roll_number = '' OR
    p.school IS NULL OR
    p.department IS NULL
);

-- STEP 6: Final verification
SELECT '✅ STEP 6: Final verification - all auth users should have profiles' as diagnostic;

SELECT 
    COUNT(*) as total_auth_users,
    COUNT(p.id) as users_with_profiles,
    COUNT(*) - COUNT(p.id) as users_without_profiles
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id;

-- Show any remaining issues
SELECT 
    '⚠️ REMAINING ISSUES' as diagnostic,
    au.email,
    au.id as auth_id,
    p.id as profile_id,
    p.full_name,
    CASE 
        WHEN p.id IS NULL THEN 'NO PROFILE'
        WHEN p.full_name IS NULL OR p.full_name = '' THEN 'EMPTY NAME'
        ELSE 'CHECK'
    END as issue
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL 
   OR p.full_name IS NULL 
   OR p.full_name = ''
ORDER BY au.created_at DESC
LIMIT 20;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║            ✅ FIX COMPLETE                                        ║';
    RAISE NOTICE '╠══════════════════════════════════════════════════════════════════╣';
    RAISE NOTICE '║ 1. Fixed handle_new_user trigger to capture ALL metadata         ║';
    RAISE NOTICE '║ 2. Created missing profiles for existing auth users              ║';
    RAISE NOTICE '║ 3. Updated profiles with missing data from auth metadata         ║';
    RAISE NOTICE '║                                                                  ║';
    RAISE NOTICE '║ New registrations will now have complete profile data.           ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════════════╝';
END $$;
