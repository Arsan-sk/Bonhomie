-- DIAGNOSTIC: Find all profiles created TODAY (2026-01-29) and their registration status
-- This will help us understand the scope of affected users

-- Query 1: Count of profiles created today
SELECT 
    '=== PROFILES CREATED TODAY (2026-01-29) ===' as section,
    COUNT(*) as total_profiles_today,
    COUNT(CASE WHEN full_name IS NULL OR full_name = '' OR full_name = 'New User' THEN 1 END) as broken_profiles,
    COUNT(CASE WHEN full_name IS NOT NULL AND full_name != '' AND full_name != 'New User' THEN 1 END) as good_profiles
FROM profiles
WHERE DATE(created_at) = '2026-01-29';

-- Query 2: Detailed list of profiles created today with their status
SELECT 
    p.id,
    p.full_name,
    p.roll_number,
    p.school,
    p.department,
    p.college_email,
    p.created_at,
    COUNT(r.id) as event_registration_count,
    CASE 
        WHEN p.full_name IS NULL OR p.full_name = '' THEN 'BROKEN: Empty name'
        WHEN p.full_name = 'New User' THEN 'BROKEN: Default name'
        WHEN p.roll_number IS NULL THEN 'WARNING: Missing roll number'
        ELSE 'OK'
    END as profile_status
FROM profiles p
LEFT JOIN registrations r ON p.id = r.profile_id
WHERE DATE(p.created_at) = '2026-01-29'
GROUP BY p.id, p.full_name, p.roll_number, p.school, p.department, p.college_email, p.created_at
ORDER BY p.created_at DESC;

-- Query 3: Profiles created today WITHOUT any event registrations
SELECT 
    '=== PROFILES WITHOUT EVENT REGISTRATIONS ===' as section,
    p.id,
    p.full_name,
    p.roll_number,
    p.college_email,
    p.created_at,
    au.raw_user_meta_data->>'full_name' as metadata_has_name,
    au.raw_user_meta_data->>'roll_number' as metadata_has_roll,
    CASE 
        WHEN p.full_name IS NULL OR p.full_name = '' OR p.full_name = 'New User' THEN 'NEEDS_FIX'
        ELSE 'OK'
    END as needs_repair
FROM profiles p
LEFT JOIN registrations r ON p.id = r.profile_id
LEFT JOIN auth.users au ON p.id = au.id
WHERE DATE(p.created_at) = '2026-01-29'
    AND r.id IS NULL  -- No event registrations
GROUP BY p.id, p.full_name, p.roll_number, p.college_email, p.created_at, au.raw_user_meta_data
ORDER BY p.created_at DESC;

-- Query 4: Count summary
SELECT 
    '=== SUMMARY FOR TODAY ===' as section,
    (SELECT COUNT(*) FROM profiles WHERE DATE(created_at) = '2026-01-29') as total_today,
    (SELECT COUNT(DISTINCT p.id) 
     FROM profiles p 
     LEFT JOIN registrations r ON p.id = r.profile_id 
     WHERE DATE(p.created_at) = '2026-01-29' AND r.id IS NULL) as no_event_registrations,
    (SELECT COUNT(*) 
     FROM profiles 
     WHERE DATE(created_at) = '2026-01-29' 
     AND (full_name IS NULL OR full_name = '' OR full_name = 'New User')) as broken_profiles_today;

-- Query 5: Check auth.users metadata for today's profiles
SELECT 
    '=== METADATA CHECK ===' as section,
    au.id,
    au.email,
    au.created_at,
    au.raw_user_meta_data->>'full_name' as meta_full_name,
    au.raw_user_meta_data->>'roll_number' as meta_roll_number,
    p.full_name as current_profile_name,
    CASE 
        WHEN au.raw_user_meta_data->>'full_name' IS NOT NULL AND au.raw_user_meta_data->>'full_name' != '' 
        THEN 'CAN_REPAIR'
        ELSE 'NO_METADATA'
    END as repairability
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29'
ORDER BY au.created_at DESC;
