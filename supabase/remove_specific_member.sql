-- ============================================================================
-- REMOVE SPECIFIC MEMBER FROM TEAM LEADER'S TEAM_MEMBERS ARRAY
-- Event: Free Fire
-- Team Leader Roll Number: 25ai110
-- Member to Remove Roll Number: 23ec59
-- ============================================================================

-- Step 1: VERIFY - Check current state before removal
-- This shows the team leader and their current team_members array
SELECT 
    r.id as registration_id,
    p.full_name as leader_name,
    p.roll_number as leader_roll,
    e.name as event_name,
    r.team_members,
    jsonb_array_length(r.team_members) as current_team_size
FROM registrations r
JOIN profiles p ON r.profile_id = p.id
JOIN events e ON r.event_id = e.id
WHERE e.name = 'Free Fire'
    AND p.roll_number = '25ai110'
    AND r.team_members IS NOT NULL
    AND jsonb_array_length(r.team_members) > 0;

-- Step 2: CHECK - Find if member with roll number 23ec59 exists in the array
-- This confirms the member is actually in the team_members array
SELECT 
    r.id as registration_id,
    p.full_name as leader_name,
    p.roll_number as leader_roll,
    member->>'roll_number' as member_roll,
    member->>'full_name' as member_name,
    member->>'id' as member_profile_id
FROM registrations r
JOIN profiles p ON r.profile_id = p.id
JOIN events e ON r.event_id = e.id
CROSS JOIN LATERAL jsonb_array_elements(r.team_members) AS member
WHERE e.name = 'Free Fire'
    AND p.roll_number = '25ai110'
    AND member->>'roll_number' = '23ec59';

-- Step 3: REMOVE - Delete the member from team_members array
-- This filters out the member with roll_number = 23ec59
UPDATE registrations r
SET 
    team_members = (
        SELECT jsonb_agg(member)
        FROM jsonb_array_elements(r.team_members) AS member
        WHERE member->>'roll_number' != '23ec59'
    )
FROM profiles p, events e
WHERE r.profile_id = p.id
    AND r.event_id = e.id
    AND e.name = 'Free Fire'
    AND p.roll_number = '25ai110'
    AND r.team_members IS NOT NULL;

-- Step 4: VERIFY - Check final state after removal
-- This confirms the member has been removed
SELECT 
    r.id as registration_id,
    p.full_name as leader_name,
    p.roll_number as leader_roll,
    e.name as event_name,
    r.team_members,
    jsonb_array_length(r.team_members) as new_team_size,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(r.team_members) AS member 
            WHERE member->>'roll_number' = '23ec59'
        ) THEN '✗ STILL EXISTS'
        ELSE '✓ REMOVED'
    END as removal_status
FROM registrations r
JOIN profiles p ON r.profile_id = p.id
JOIN events e ON r.event_id = e.id
WHERE e.name = 'Free Fire'
    AND p.roll_number = '25ai110'
    AND r.team_members IS NOT NULL;

-- Step 5: LIST ALL MEMBERS - Show remaining team members
SELECT 
    p.full_name as leader_name,
    p.roll_number as leader_roll,
    member->>'full_name' as member_name,
    member->>'roll_number' as member_roll,
    member->>'id' as member_profile_id
FROM registrations r
JOIN profiles p ON r.profile_id = p.id
JOIN events e ON r.event_id = e.id
CROSS JOIN LATERAL jsonb_array_elements(r.team_members) AS member
WHERE e.name = 'Free Fire'
    AND p.roll_number = '25ai110'
ORDER BY member->>'roll_number';

SELECT 'Member with roll number 23ec59 has been removed from team leader 25ai110 in Free Fire event.' AS status;
