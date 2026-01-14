-- Update all RLS policies to use 'coordinator' instead of 'faculty'
-- This matches the actual role being used in the application

-- ============================================
-- EVENTS TABLE - Update Policies
-- ============================================

DROP POLICY IF EXISTS "Faculty can insert events" ON events;
DROP POLICY IF EXISTS "Faculty can update assigned events" ON events;

-- Coordinators can INSERT events
CREATE POLICY "Coordinators can insert events"
ON events FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'coordinator'
    )
);

-- Coordinators can UPDATE events they're assigned to
CREATE POLICY "Coordinators can update assigned events"
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

-- Verify the fix
SELECT 
    policyname, 
    cmd as operation
FROM pg_policies
WHERE tablename = 'events'
AND policyname LIKE '%oordinator%'
ORDER BY policyname;
