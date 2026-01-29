-- ============================================================================
-- VERIFY: Check 23EC41's registrations and profile ID
-- Run this to see if registrations exist and why they might not be showing
-- ============================================================================

-- 1. Show profile info for 23EC41
SELECT 
    '1. PROFILE INFO' as step,
    id as profile_id,
    auth_user_id,
    college_email,
    full_name,
    is_admin_created
FROM profiles 
WHERE college_email = '23ec41@aiktc.ac.in';

-- 2. Check registrations by profile_id
SELECT 
    '2. REGISTRATIONS BY PROFILE_ID' as step,
    r.id as registration_id,
    r.profile_id,
    r.event_id,
    e.name as event_name,
    r.status,
    r.registered_at
FROM registrations r
LEFT JOIN events e ON e.id = r.event_id
WHERE r.profile_id = (SELECT id FROM profiles WHERE college_email = '23ec41@aiktc.ac.in');

-- 3. Check registrations by auth_user_id (in case it was stored wrong)
SELECT 
    '3. REGISTRATIONS BY AUTH_USER_ID' as step,
    r.id as registration_id,
    r.profile_id,
    r.event_id,
    e.name as event_name,
    r.status,
    r.registered_at
FROM registrations r
LEFT JOIN events e ON e.id = r.event_id
WHERE r.profile_id = (SELECT auth_user_id FROM profiles WHERE college_email = '23ec41@aiktc.ac.in');

-- 4. Check if user appears in any team_members JSONB arrays
SELECT 
    '4. APPEARS IN TEAM_MEMBERS' as step,
    r.id as registration_id,
    r.profile_id,
    e.name as event_name,
    r.team_members,
    r.status
FROM registrations r
LEFT JOIN events e ON e.id = r.event_id
WHERE r.team_members::text LIKE '%23ec41%'
   OR r.team_members::text LIKE '%23EC41%'
   OR r.team_members::text LIKE '%Maaz%'
   OR r.team_members::text LIKE '%Rakhange%';

-- 5. Show what IDs are stored in registrations table
SELECT 
    '5. ALL REGISTRATIONS WITH PROFILE DETAILS' as step,
    r.id,
    r.profile_id,
    p.college_email,
    p.full_name,
    e.name as event_name,
    r.status
FROM registrations r
LEFT JOIN profiles p ON p.id = r.profile_id
LEFT JOIN events e ON e.id = r.event_id
ORDER BY r.registered_at DESC
LIMIT 20;
