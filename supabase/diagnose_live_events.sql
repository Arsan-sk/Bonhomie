-- DIAGNOSTIC QUERY FOR LIVE EVENTS
-- Run this in Supabase SQL Editor to check what's happening

-- Step 1: Check if is_live column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND column_name IN ('is_live', 'status', 'live_started_at');

-- Step 2: Check for live events
SELECT 
    id,
    name,
    is_live,
    status,
    live_started_at,
    created_at
FROM events
WHERE is_live = true
ORDER BY live_started_at DESC NULLS LAST;

-- Step 3: Check student registrations for live events
-- Replace 'YOUR_USER_ID' with actual user ID from auth.users
SELECT 
    r.id as registration_id,
    r.profile_id,
    r.status as registration_status,
    e.name as event_name,
    e.is_live,
    e.status as event_status,
    e.live_started_at
FROM registrations r
JOIN events e ON r.event_id = e.id
WHERE e.is_live = true
ORDER BY r.registered_at DESC;

-- Step 4: Count by registration status
SELECT 
    r.status as registration_status,
    e.is_live,
    COUNT(*) as count
FROM registrations r
JOIN events e ON r.event_id = e.id
GROUP BY r.status, e.is_live
ORDER BY e.is_live DESC, r.status;
