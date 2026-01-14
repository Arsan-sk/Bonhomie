-- Enable RLS and create policies for events table
-- This ensures admins can see all events

-- Enable RLS on events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Admins can manage all events" ON events;
DROP POLICY IF EXISTS "Coordinators can create events" ON events;

-- Policy 1: Everyone can VIEW events (public access)
CREATE POLICY "Events are viewable by everyone"
ON events FOR SELECT
USING (true);

-- Policy 2: Admins can do EVERYTHING (insert, update, delete)
CREATE POLICY "Admins can manage all events"
ON events FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Policy 3: Coordinators can CREATE and UPDATE their own events
CREATE POLICY "Coordinators can create events"
ON events FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('faculty', 'coordinator')
    )
);

-- Policy 4: Coordinators can UPDATE events they're assigned to
CREATE POLICY "Coordinators can update assigned events"
ON events FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM event_assignments
        WHERE event_assignments.event_id = events.id
        AND event_assignments.coordinator_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Verify policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd as operation,
    qual as using_expression
FROM pg_policies
WHERE tablename = 'events'
ORDER BY policyname;
