-- ============================================
-- Test Coordinator Seed Data
-- Create coordinator2 for multi-user testing
-- ============================================

-- Note: This script assumes coordinator2@bonhomie.com user
-- has been created via Supabase Auth Dashboard or signup

-- Step 1: Create user via Supabase Auth (run this in Supabase SQL Editor)
-- You'll need to create the user manually in Supabase Dashboard → Authentication → Add User
-- Email: coordinator2@bonhomie.com
-- Password: password123
-- After creation, get the user UUID and replace <COORDINATOR2_UUID> below

-- Step 2: Insert profile for coordinator2
-- Replace <COORDINATOR2_UUID> with the actual UUID from Supabase Auth
INSERT INTO profiles (
    id,
    full_name,
    college_email,
    phone_number,
    role,
    created_at
) VALUES (
    '<COORDINATOR2_UUID>', -- Replace with actual UUID
    'Test Coordinator 2',
    'coordinator2@bonhomie.com',
    '9876543210',
    'coordinator',
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = 'coordinator';

-- Step 3: Assign some events to coordinator2
-- This assumes you have existing events in the events table
-- We'll assign 1-2 different events than coordinator1 has

-- Get event IDs first (uncomment to see available events)
-- SELECT id, name FROM events ORDER BY created_at DESC LIMIT 5;

-- Example: Assign specific events to coordinator2
-- Replace event UUIDs with actual event IDs from your database
INSERT INTO event_assignments (
    coordinator_id,
    event_id,
    created_at
) VALUES
    ('<COORDINATOR2_UUID>', (SELECT id FROM events ORDER BY created_at DESC LIMIT 1 OFFSET 1), NOW()),
    ('<COORDINATOR2_UUID>', (SELECT id FROM events ORDER BY created_at DESC LIMIT 1 OFFSET 2), NOW())
ON CONFLICT DO NOTHING;

-- Verify assignments
SELECT 
    p.full_name as coordinator,
    e.name as event_name,
    ea.created_at as assigned_at
FROM event_assignments ea
JOIN profiles p ON p.id = ea.coordinator_id
JOIN events e ON e.id = ea.event_id
WHERE ea.coordinator_id = '<COORDINATOR2_UUID>';
