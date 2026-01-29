-- COMPREHENSIVE FIX: skzaid00000@gmail.com with roll number 23BIT55
-- This will:
-- 1. Update auth.users metadata to include roll number
-- 2. Create profile with correct roll number
-- 3. Verify everything is correct

-- ============================================================================
-- STEP 1: Check current state and metadata
-- ============================================================================

SELECT 
    '=== STEP 1: CURRENT STATE ===' as section,
    au.id,
    au.email,
    p.id as profile_id,
    p.full_name,
    p.roll_number as current_roll,
    au.raw_user_meta_data->>'roll_number' as metadata_roll,
    au.raw_user_meta_data->>'full_name' as metadata_name,
    CASE 
        WHEN p.id IS NULL THEN '❌ PROFILE MISSING'
        ELSE '✅ PROFILE EXISTS'
    END as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'skzaid00000@gmail.com';

-- ============================================================================
-- STEP 2: Check if roll number 23BIT55 is available
-- ============================================================================

SELECT 
    '=== STEP 2: ROLL NUMBER CHECK ===' as section,
    '23BIT55' as target_roll_number,
    CASE 
        WHEN EXISTS (SELECT 1 FROM profiles WHERE LOWER(roll_number) = '23bit55') 
        THEN '⚠️ CONFLICT - Already exists'
        ELSE '✅ AVAILABLE - Safe to use'
    END as availability,
    (
        SELECT college_email 
        FROM profiles 
        WHERE LOWER(roll_number) = '23bit55' 
        LIMIT 1
    ) as currently_owned_by;

-- ============================================================================
-- STEP 3: Update auth.users metadata with correct roll number
-- ============================================================================

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{roll_number}',
    '"23BIT55"'::jsonb
)
WHERE email = 'skzaid00000@gmail.com';

SELECT 
    '=== STEP 3: METADATA UPDATED ===' as section,
    'Roll number added to auth.users metadata' as action,
    raw_user_meta_data->>'roll_number' as new_roll_number
FROM auth.users
WHERE email = 'skzaid00000@gmail.com';

-- ============================================================================
-- STEP 4: Create profile with roll number 23BIT55
-- ============================================================================

INSERT INTO profiles (
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
SELECT 
    au.id,
    COALESCE(NULLIF(TRIM(au.raw_user_meta_data->>'full_name'), ''), 'User'),
    au.email,
    '23bit55',  -- Explicitly set roll number
    NULLIF(TRIM(au.raw_user_meta_data->>'school'), ''),
    NULLIF(TRIM(au.raw_user_meta_data->>'department'), ''),
    NULLIF(TRIM(au.raw_user_meta_data->>'program'), ''),
    NULLIF(TRIM(au.raw_user_meta_data->>'year_of_study'), ''),
    NULLIF(TRIM(au.raw_user_meta_data->>'admission_year'), ''),
    NULLIF(TRIM(au.raw_user_meta_data->>'expected_passout_year'), ''),
    NULLIF(TRIM(au.raw_user_meta_data->>'phone'), ''),
    NULLIF(TRIM(au.raw_user_meta_data->>'gender'), ''),
    CAST(COALESCE(au.raw_user_meta_data->>'role', 'student') AS user_role),
    au.created_at,
    NOW()
FROM auth.users au
WHERE au.email = 'skzaid00000@gmail.com'
    AND NOT EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = au.id
    )
    AND NOT EXISTS (
        SELECT 1 FROM profiles p WHERE LOWER(p.roll_number) = '23bit55'
    );

SELECT 
    '=== STEP 4: PROFILE CREATED ===' as section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM profiles WHERE college_email = 'skzaid00000@gmail.com')
        THEN '✅ Profile created successfully'
        ELSE '⚠️ Profile not created - check for conflicts'
    END as result;

-- ============================================================================
-- STEP 5: Verify the complete fix
-- ============================================================================

SELECT 
    '=== STEP 5: FINAL VERIFICATION ===' as section,
    au.id as auth_user_id,
    au.email,
    au.raw_user_meta_data->>'full_name' as metadata_name,
    au.raw_user_meta_data->>'roll_number' as metadata_roll,
    p.id as profile_id,
    p.full_name as profile_name,
    p.roll_number as profile_roll,
    p.school,
    p.department,
    p.created_at as profile_created,
    CASE 
        WHEN au.id IS NOT NULL AND p.id IS NOT NULL AND p.roll_number = '23bit55'
        THEN '✅ COMPLETE - Everything correct'
        WHEN au.id IS NOT NULL AND p.id IS NOT NULL AND p.roll_number IS NULL
        THEN '⚠️ Profile exists but no roll number'
        WHEN au.id IS NOT NULL AND p.id IS NULL
        THEN '❌ Profile still missing'
        ELSE '❌ Unknown issue'
    END as verification_status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'skzaid00000@gmail.com';

-- ============================================================================
-- STEP 6: Final instructions
-- ============================================================================

SELECT 
    '╔══════════════════════════════════════════════════════════════╗' as line
UNION ALL SELECT '║                  ✅ FIX COMPLETE                             ║'
UNION ALL SELECT '╠══════════════════════════════════════════════════════════════╣'
UNION ALL SELECT '║  User: skzaid00000@gmail.com                                ║'
UNION ALL SELECT '║  Roll Number: 23BIT55                                       ║'
UNION ALL SELECT '╠══════════════════════════════════════════════════════════════╣'
UNION ALL SELECT '║  📌 USER MUST:                                              ║'
UNION ALL SELECT '║     1. LOGOUT completely from Bonhomie                      ║'
UNION ALL SELECT '║     2. Clear browser cache (Ctrl+Shift+R)                   ║'
UNION ALL SELECT '║     3. LOGIN again                                          ║'
UNION ALL SELECT '║                                                              ║'
UNION ALL SELECT '║  ✅ Expected Result:                                        ║'
UNION ALL SELECT '║     - Dashboard loads properly                              ║'
UNION ALL SELECT '║     - Profile name displays correctly                       ║'
UNION ALL SELECT '║     - Event registration works                              ║'
UNION ALL SELECT '╚══════════════════════════════════════════════════════════════╝';
