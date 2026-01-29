-- Diagnostic queries to identify affected users from recent registrations
-- Run this BEFORE applying fixes to understand the scope of the issue

-- Query 1: Find profiles created since the problematic commit (2026-01-22)
-- with empty or null full_name
SELECT 
    'Profiles with empty/null names' as query_name,
    COUNT(*) as affected_count
FROM profiles p
WHERE p.created_at > '2026-01-22 00:00:00'
    AND (p.full_name IS NULL OR p.full_name = '' OR p.full_name = 'New User');

-- Query 2: Detailed view of last 100 registrations
SELECT 
    p.id as profile_id,
    p.full_name,
    p.roll_number,
    p.school,
    p.department,
    p.college_email,
    p.created_at as profile_created,
    au.email as auth_email,
    au.created_at as auth_created,
    au.raw_user_meta_data->>'full_name' as metadata_full_name,
    au.raw_user_meta_data->>'roll_number' as metadata_roll_number,
    au.raw_user_meta_data->>'school' as metadata_school,
    au.raw_user_meta_data->>'department' as metadata_department,
    CASE 
        WHEN p.full_name IS NULL OR p.full_name = '' THEN 'BROKEN: Empty name'
        WHEN p.roll_number IS NULL THEN 'WARNING: Missing roll number'
        WHEN p.school IS NULL THEN 'WARNING: Missing school'
        ELSE 'OK'
    END as status
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE p.created_at > '2026-01-22 00:00:00'
ORDER BY p.created_at DESC
LIMIT 100;

-- Query 3: Check if any of these users have event registrations
-- (to understand impact on event registration foreign key errors)
SELECT 
    p.id as profile_id,
    p.full_name,
    p.college_email,
    COUNT(r.id) as registration_count,
    ARRAY_AGG(e.name) FILTER (WHERE e.name IS NOT NULL) as registered_events
FROM profiles p
LEFT JOIN registrations r ON p.id = r.profile_id
LEFT JOIN events e ON r.event_id = e.id
WHERE p.created_at > '2026-01-22 00:00:00'
    AND (p.full_name IS NULL OR p.full_name = '' OR p.full_name = 'New User')
GROUP BY p.id, p.full_name, p.college_email
HAVING COUNT(r.id) > 0;

-- Query 4: Sample auth.users metadata to verify data exists
SELECT 
    au.id,
    au.email,
    au.created_at,
    au.raw_user_meta_data
FROM auth.users au
WHERE au.created_at > '2026-01-22 00:00:00'
ORDER BY au.created_at DESC
LIMIT 10;

-- Summary instructions
SELECT 
    '=== DIAGNOSIS COMPLETE ===' as message,
    'Review the results above to understand:' as instructions,
    '1. How many profiles are affected' as step_1,
    '2. What metadata was passed during registration' as step_2,
    '3. Whether users tried to register for events' as step_3,
    'After reviewing, proceed with trigger fix and profile repair' as next_action;
