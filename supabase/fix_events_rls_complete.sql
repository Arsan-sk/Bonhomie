-- Fix ALL RLS issues for events and event_assignments

-- ============================================
-- EVENTS TABLE RLS POLICIES
-- ============================================

-- Drop all existing event policies
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Admins can insert events" ON events;
DROP POLICY IF EXISTS "Admins can update events" ON events;
DROP POLICY IF EXISTS "Admins can delete events" ON events;
DROP POLICY IF EXISTS "Admins can manage all events" ON events;
DROP POLICY IF EXISTS "Faculty can update assigned events" ON events;
DROP POLICY IF EXISTS "Coordinators can create events" ON events;
DROP POLICY IF EXISTS "Coordinators can update assigned events" ON events;

-- Policy 1: Everyone can SELECT (view) events
CREATE POLICY "Events are viewable by everyone"
ON events FOR SELECT
USING (true);

-- Policy 2: Admins can INSERT events
CREATE POLICY "Admins can insert events"
ON events FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Policy 3: Admins can UPDATE all events
CREATE POLICY "Admins can update events"
ON events FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Policy 4: Admins can DELETE all events
CREATE POLICY "Admins can delete events"
ON events FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Policy 5: Faculty/Coordinators can INSERT events
CREATE POLICY "Faculty can insert events"
ON events FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('faculty', 'coordinator')
    )
);

-- Policy 6: Faculty can UPDATE events they're assigned to
CREATE POLICY "Faculty can update assigned events"
ON events FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM event_assignments
        WHERE event_assignments.event_id = events.id
        AND event_assignments.coordinator_id = auth.uid()
    )
);

-- ============================================
-- EVENT_ASSIGNMENTS TABLE RLS POLICIES
-- ============================================

-- Enable RLS on event_assignments if not already enabled
ALTER TABLE event_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view assignments" ON event_assignments;
DROP POLICY IF EXISTS "Admins can manage assignments" ON event_assignments;
DROP POLICY IF EXISTS "Coordinators can view own assignments" ON event_assignments;
DROP POLICY IF EXISTS "Admins can insert assignments" ON event_assignments;
DROP POLICY IF EXISTS "Admins can delete assignments" ON event_assignments;

-- Policy 1: Everyone can SELECT (view) assignments
CREATE POLICY "Anyone can view assignments"
ON event_assignments FOR SELECT
USING (true);

-- Policy 2: Admins can INSERT assignments
CREATE POLICY "Admins can insert assignments"
ON event_assignments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Policy 3: Admins can DELETE assignments
CREATE POLICY "Admins can delete assignments"
ON event_assignments FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Verify policies
SELECT 
    tablename, 
    policyname, 
    cmd as operation
FROM pg_policies
WHERE tablename IN ('events', 'event_assignments')
ORDER BY tablename, policyname;
