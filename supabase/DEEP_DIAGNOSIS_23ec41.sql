-- ============================================================================
-- DEEP DIAGNOSIS: Why 23ec41@aiktc.ac.in shows "Database error querying schema"
-- Compare EVERY column with working users
-- ============================================================================

-- 1. Show ALL columns from auth.users for the problem user
SELECT 
    '1. PROBLEM USER - ALL COLUMNS' as info,
    *
FROM auth.users
WHERE email = '23ec41@aiktc.ac.in';

-- 2. Show ALL columns from auth.users for a WORKING user
SELECT 
    '2. WORKING USER - ALL COLUMNS' as info,
    *
FROM auth.users
WHERE email = '23ec14@aiktc.ac.in';

-- 3. Show ALL columns from auth.identities for problem user
SELECT 
    '3. PROBLEM USER IDENTITY - ALL COLUMNS' as info,
    *
FROM auth.identities
WHERE user_id = (SELECT id FROM auth.users WHERE email = '23ec41@aiktc.ac.in');

-- 4. Show ALL columns from auth.identities for working user
SELECT 
    '4. WORKING USER IDENTITY - ALL COLUMNS' as info,
    *
FROM auth.identities
WHERE user_id = (SELECT id FROM auth.users WHERE email = '23ec14@aiktc.ac.in');

-- 5. Check if there are triggers on profiles that might cause errors
SELECT 
    '5. TRIGGERS ON PROFILES' as info,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles';

-- 6. Check for duplicate profiles
SELECT 
    '6. DUPLICATE PROFILES CHECK' as info,
    college_email,
    COUNT(*) as cnt
FROM profiles
WHERE college_email = '23ec41@aiktc.ac.in'
GROUP BY college_email;

-- 7. Check RLS policies on profiles
SELECT 
    '7. RLS POLICIES ON PROFILES' as info,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'profiles';

-- 8. Check if profile exists and its state
SELECT 
    '8. PROFILE STATE' as info,
    id,
    college_email,
    full_name,
    auth_user_id,
    is_admin_created,
    role
FROM profiles
WHERE college_email = '23ec41@aiktc.ac.in';
