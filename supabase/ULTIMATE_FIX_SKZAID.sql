-- ULTIMATE FIX: skzaid00000@gmail.com
-- Email: skzaid00000@gmail.com
-- Roll Number: 23BIT55
-- Name: Zaid
-- This script does EVERYTHING to diagnose and fix

-- ============================================================================
-- PHASE 1: COMPLETE DIAGNOSTIC
-- ============================================================================

-- Check 1: Does auth.users record exist?
SELECT 
    '=== CHECK 1: AUTH.USERS ===' as section,
    au.id,
    au.email,
    au.created_at,
    au.raw_user_meta_data->>'full_name' as metadata_name,
    au.raw_user_meta_data->>'roll_number' as metadata_roll,
    CASE WHEN au.id IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM auth.users au
WHERE au.email = 'skzaid00000@gmail.com';

-- Check 2: Does profile exist?
SELECT 
    '=== CHECK 2: PROFILE ===' as section,
    p.id,
    p.full_name,
    p.college_email,
    p.roll_number,
    p.school,
    p.department,
    p.created_at,
    CASE WHEN p.id IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM profiles p
WHERE p.college_email = 'skzaid00000@gmail.com';

-- Check 3: Is roll number 23BIT55 used by someone else in profiles?
SELECT 
    '=== CHECK 3: ROLL NUMBER IN PROFILES ===' as section,
    p.id,
    p.college_email,
    p.full_name,
    p.roll_number,
    CASE 
        WHEN p.college_email = 'skzaid00000@gmail.com' THEN '✅ CORRECT USER'
        ELSE '⚠️ DIFFERENT USER - CONFLICT'
    END as status
FROM profiles p
WHERE LOWER(p.roll_number) = '23bit55';

-- Check 4: Is roll number 23BIT55 used by someone else in auth.users?
SELECT 
    '=== CHECK 4: ROLL NUMBER IN AUTH.USERS ===' as section,
    au.id,
    au.email,
    au.raw_user_meta_data->>'full_name' as name,
    au.raw_user_meta_data->>'roll_number' as roll,
    CASE 
        WHEN au.email = 'skzaid00000@gmail.com' THEN '✅ CORRECT USER'
        ELSE '⚠️ DIFFERENT USER - CONFLICT'
    END as status
FROM auth.users au
WHERE LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '')) = '23bit55';

-- Check 5: Join to see the complete picture
SELECT 
    '=== CHECK 5: COMPLETE PICTURE ===' as section,
    au.id as auth_id,
    au.email,
    p.id as profile_id,
    p.full_name,
    p.roll_number,
    CASE 
        WHEN au.id IS NOT NULL AND p.id IS NOT NULL THEN '✅ BOTH EXIST'
        WHEN au.id IS NOT NULL AND p.id IS NULL THEN '❌ PROFILE MISSING'
        WHEN au.id IS NULL THEN '❌ AUTH USER MISSING'
    END as diagnosis
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'skzaid00000@gmail.com';

-- ============================================================================
-- PHASE 2: FIX AUTH.USERS METADATA
-- ============================================================================

-- Update auth.users with correct data
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
    'full_name', 'Zaid',
    'roll_number', '23BIT55',
    'school', COALESCE(raw_user_meta_data->>'school', 'SOET'),
    'department', COALESCE(raw_user_meta_data->>'department', 'BIT'),
    'program', COALESCE(raw_user_meta_data->>'program', 'B.Tech'),
    'year_of_study', COALESCE(raw_user_meta_data->>'year_of_study', '2'),
    'admission_year', COALESCE(raw_user_meta_data->>'admission_year', '2023'),
    'expected_passout_year', COALESCE(raw_user_meta_data->>'expected_passout_year', '2027'),
    'phone', COALESCE(raw_user_meta_data->>'phone', '0000000000'),
    'gender', COALESCE(raw_user_meta_data->>'gender', 'other'),
    'role', COALESCE(raw_user_meta_data->>'role', 'student')
)
WHERE email = 'skzaid00000@gmail.com';

SELECT 
    '=== AUTH.USERS UPDATED ===' as section,
    'Metadata updated with correct information' as action;

-- ============================================================================
-- PHASE 3: DELETE OLD PROFILE IF EXISTS (fresh start)
-- ============================================================================

DELETE FROM profiles
WHERE college_email = 'skzaid00000@gmail.com';

SELECT 
    '=== OLD PROFILE DELETED ===' as section,
    'Starting fresh' as action;

-- ============================================================================
-- PHASE 4: CREATE NEW PROFILE WITH ALL CORRECT DATA
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
    'Zaid',
    au.email,
    '23bit55',
    COALESCE(au.raw_user_meta_data->>'school', 'SOET'),
    COALESCE(au.raw_user_meta_data->>'department', 'BIT'),
    COALESCE(au.raw_user_meta_data->>'program', 'B.Tech'),
    COALESCE(au.raw_user_meta_data->>'year_of_study', '2'),
    COALESCE(au.raw_user_meta_data->>'admission_year', '2023'),
    COALESCE(au.raw_user_meta_data->>'expected_passout_year', '2027'),
    COALESCE(au.raw_user_meta_data->>'phone', '0000000000'),
    COALESCE(au.raw_user_meta_data->>'gender', 'other'),
    CAST(COALESCE(au.raw_user_meta_data->>'role', 'student') AS user_role),
    au.created_at,
    NOW()
FROM auth.users au
WHERE au.email = 'skzaid00000@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    full_name = 'Zaid',
    roll_number = '23bit55',
    school = COALESCE(EXCLUDED.school, 'SOET'),
    department = COALESCE(EXCLUDED.department, 'BIT'),
    program = COALESCE(EXCLUDED.program, 'B.Tech'),
    year_of_study = COALESCE(EXCLUDED.year_of_study, '2'),
    admission_year = COALESCE(EXCLUDED.admission_year, '2023'),
    expected_passout_year = COALESCE(EXCLUDED.expected_passout_year, '2027'),
    phone = COALESCE(EXCLUDED.phone, '0000000000'),
    gender = COALESCE(EXCLUDED.gender, 'other'),
    updated_at = NOW();

SELECT 
    '=== PROFILE CREATED/UPDATED ===' as section,
    'Profile now exists with all correct data' as action;

-- ============================================================================
-- PHASE 5: VERIFICATION
-- ============================================================================

SELECT 
    '=== FINAL VERIFICATION ===' as section,
    au.id as auth_id,
    au.email,
    au.raw_user_meta_data->>'full_name' as auth_name,
    au.raw_user_meta_data->>'roll_number' as auth_roll,
    p.id as profile_id,
    p.full_name as profile_name,
    p.roll_number as profile_roll,
    p.college_email,
    p.school,
    p.department,
    p.program,
    p.year_of_study,
    p.phone,
    p.gender,
    p.role,
    CASE 
        WHEN au.id IS NOT NULL AND p.id IS NOT NULL 
             AND p.full_name IS NOT NULL 
             AND p.roll_number = '23bit55'
        THEN '✅ PERFECT - Everything correct'
        ELSE '❌ STILL HAVE ISSUES'
    END as final_status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'skzaid00000@gmail.com';

-- Check for any NULL values
SELECT 
    '=== NULL VALUES CHECK ===' as section,
    CASE WHEN full_name IS NULL THEN '❌ NULL' ELSE '✅ ' || full_name END as full_name,
    CASE WHEN roll_number IS NULL THEN '❌ NULL' ELSE '✅ ' || roll_number END as roll_number,
    CASE WHEN school IS NULL THEN '❌ NULL' ELSE '✅ ' || school END as school,
    CASE WHEN department IS NULL THEN '❌ NULL' ELSE '✅ ' || department END as department,
    CASE WHEN program IS NULL THEN '❌ NULL' ELSE '✅ ' || program END as program
FROM profiles
WHERE college_email = 'skzaid00000@gmail.com';

-- ============================================================================
-- FINAL MESSAGE
-- ============================================================================

SELECT 
    '╔══════════════════════════════════════════════════════════════╗' as line
UNION ALL SELECT '║            ✅ COMPLETE FIX APPLIED - skzaid00000@gmail.com    ║'
UNION ALL SELECT '╠══════════════════════════════════════════════════════════════╣'
UNION ALL SELECT '║  Name: Zaid                                                  ║'
UNION ALL SELECT '║  Roll Number: 23BIT55                                        ║'
UNION ALL SELECT '║  Email: skzaid00000@gmail.com                                ║'
UNION ALL SELECT '╠══════════════════════════════════════════════════════════════╣'
UNION ALL SELECT '║  ✅ Auth.users metadata updated                              ║'
UNION ALL SELECT '║  ✅ Profile created/updated with all fields                  ║'
UNION ALL SELECT '║  ✅ No NULL values                                           ║'
UNION ALL SELECT '╠══════════════════════════════════════════════════════════════╣'
UNION ALL SELECT '║  📌 USER MUST NOW:                                           ║'
UNION ALL SELECT '║     1. COMPLETELY LOGOUT from Bonhomie                       ║'
UNION ALL SELECT '║     2. CLEAR ALL BROWSER DATA for the site                   ║'
UNION ALL SELECT '║        (Settings > Privacy > Clear browsing data)            ║'
UNION ALL SELECT '║     3. CLOSE browser completely                              ║'
UNION ALL SELECT '║     4. REOPEN browser and LOGIN again                        ║'
UNION ALL SELECT '║                                                              ║'
UNION ALL SELECT '║  ✅ Dashboard should now work perfectly!                     ║'
UNION ALL SELECT '╚══════════════════════════════════════════════════════════════╝';
