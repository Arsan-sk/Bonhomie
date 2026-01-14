-- Fix RLS with proper WITH CHECK for INSERT
-- The 401 error suggests authentication issue, but let's ensure RLS is correct

-- Drop all existing event policies
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Admins can insert events" ON events;
DROP POLICY IF EXISTS "Admins can update events" ON events;
DROP POLICY IF EXISTS "Admins can delete events" ON events;
DROP POLICY IF EXISTS "Faculty can insert events" ON events;
DROP POLICY IF EXISTS "Faculty can update assigned events" ON events;

-- PUBLIC SELECT - everyone can view
CREATE POLICY "Events are viewable by everyone"
ON events FOR SELECT
USING (true);

-- ADMIN FULL CONTROL - Use WITH CHECK for INSERT
CREATE POLICY "Admins can insert events"
ON events FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

CREATE POLICY "Admins can update events"
ON events FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

CREATE POLICY "Admins can delete events"
ON events FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- FACULTY/COORDINATOR INSERT
CREATE POLICY "Faculty can insert events"
ON events FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('faculty', 'coordinator')
    )
);

-- FACULTY UPDATE (assigned events only)
CREATE POLICY "Faculty can update assigned events"
ON events FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM event_assignments
        WHERE event_assignments.event_id = events.id
        AND event_assignments.coordinator_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM event_assignments
        WHERE event_assignments.event_id = events.id
        AND event_assignments.coordinator_id = auth.uid()
    )
);

-- EVENT_ASSIGNMENTS RLS
DROP POLICY IF EXISTS "Anyone can view assignments" ON event_assignments;
DROP POLICY IF EXISTS "Admins can insert assignments" ON event_assignments;
DROP POLICY IF EXISTS "Admins can delete assignments" ON event_assignments;
DROP POLICY IF EXISTS "Admins can manage assignments" ON event_assignments;

-- PUBLIC SELECT
CREATE POLICY "Anyone can view assignments"
ON event_assignments FOR SELECT
USING (true);

-- ADMIN INSERT
CREATE POLICY "Admins can insert assignments"
ON event_assignments FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- ADMIN DELETE
CREATE POLICY "Admins can delete assignments"
ON event_assignments FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Test query to verify admin can see their profile
SELECT 
    auth.uid() as current_user_id,
    profiles.id,
    profiles.role,
    profiles.full_name
FROM profiles
WHERE profiles.id = auth.uid();

-- Show all policies
SELECT 
    schemaname,
    tablename, 
    policyname, 
    cmd as operation,
    roles
FROM pg_policies
WHERE tablename IN ('events', 'event_assignments')
ORDER BY tablename, policyname;
