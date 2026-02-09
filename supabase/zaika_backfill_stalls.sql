-- ============================================
-- ZAIKA STALLS BACKFILL SCRIPT
-- ============================================
-- This script finds all existing Zaika event registrations
-- that don't have a corresponding stall and creates stalls for them.
-- 
-- Logic: A registration is for Zaika if:
-- 1. The event name contains 'Zaika' (case-insensitive)
-- 2. The registration has team_members (it's a team registration)
-- 3. The registration status is 'confirmed'
-- 4. No stall exists for this registration yet
-- ============================================

-- First, let's see what we're dealing with (preview only)
-- Run this SELECT first to verify before running the INSERT

SELECT 
    r.id as registration_id,
    r.profile_id as lead_profile_id,
    r.team_name,
    r.team_members,
    r.status,
    e.title as event_name,
    p.full_name as lead_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM zaika_stalls zs WHERE zs.registration_id = r.id) 
        THEN 'Already has stall'
        ELSE 'Needs stall'
    END as stall_status
FROM registrations r
JOIN events e ON r.event_id = e.id
JOIN profiles p ON r.profile_id = p.id
WHERE 
    -- Event name contains 'Zaika' (case-insensitive)
    LOWER(e.title) LIKE '%zaika%'
    -- Has team members (team registration)
    AND r.team_members IS NOT NULL 
    AND jsonb_array_length(r.team_members) > 0
    -- Registration is confirmed
    AND r.status = 'confirmed'
ORDER BY r.created_at;

-- ============================================
-- BACKFILL INSERT STATEMENT
-- ============================================
-- Uncomment and run this after verifying the SELECT above

/*
INSERT INTO zaika_stalls (registration_id, stall_name, stall_number, is_active, total_sales)
SELECT 
    r.id as registration_id,
    COALESCE(r.team_name, p.full_name || '''s Stall') as stall_name,
    ROW_NUMBER() OVER (ORDER BY r.created_at) + COALESCE(
        (SELECT MAX(stall_number) FROM zaika_stalls), 0
    ) as stall_number,
    true as is_active,
    0 as total_sales
FROM registrations r
JOIN events e ON r.event_id = e.id
JOIN profiles p ON r.profile_id = p.id
WHERE 
    -- Event name contains 'Zaika' (case-insensitive)
    LOWER(e.title) LIKE '%zaika%'
    -- Has team members (team registration)
    AND r.team_members IS NOT NULL 
    AND jsonb_array_length(r.team_members) > 0
    -- Registration is confirmed
    AND r.status = 'confirmed'
    -- No stall exists yet for this registration
    AND NOT EXISTS (
        SELECT 1 FROM zaika_stalls zs WHERE zs.registration_id = r.id
    )
ORDER BY r.created_at;
*/

-- ============================================
-- ALTERNATIVE: Handle registrations where team_members 
-- contains profile references to other team members
-- ============================================
-- If team_members looks like [{"profile_id": "uuid1"}, {"profile_id": "uuid2"}]
-- we can use this to also identify team leads

/*
-- View team structure
SELECT 
    r.id as registration_id,
    r.profile_id as lead_profile_id,
    r.team_name,
    r.team_members,
    jsonb_array_length(r.team_members) as team_size,
    e.title as event_name
FROM registrations r
JOIN events e ON r.event_id = e.id
WHERE LOWER(e.title) LIKE '%zaika%'
AND r.team_members IS NOT NULL;
*/

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this after the insert to verify stalls were created

/*
SELECT 
    zs.id as stall_id,
    zs.stall_number,
    zs.stall_name,
    zs.is_active,
    zs.total_sales,
    r.team_name,
    p.full_name as lead_name,
    e.title as event_name
FROM zaika_stalls zs
JOIN registrations r ON zs.registration_id = r.id
JOIN events e ON r.event_id = e.id
JOIN profiles p ON r.profile_id = p.id
ORDER BY zs.stall_number;
*/

-- ============================================
-- COUNT SUMMARY
-- ============================================
-- Check counts before and after

SELECT 'Existing stalls' as metric, COUNT(*) as count FROM zaika_stalls
UNION ALL
SELECT 'Zaika registrations (confirmed, with team)' as metric, COUNT(*) as count 
FROM registrations r
JOIN events e ON r.event_id = e.id
WHERE LOWER(e.title) LIKE '%zaika%'
AND r.team_members IS NOT NULL 
AND jsonb_array_length(r.team_members) > 0
AND r.status = 'confirmed'
UNION ALL
SELECT 'Registrations needing stalls' as metric, COUNT(*) as count 
FROM registrations r
JOIN events e ON r.event_id = e.id
WHERE LOWER(e.title) LIKE '%zaika%'
AND r.team_members IS NOT NULL 
AND jsonb_array_length(r.team_members) > 0
AND r.status = 'confirmed'
AND NOT EXISTS (SELECT 1 FROM zaika_stalls zs WHERE zs.registration_id = r.id);
