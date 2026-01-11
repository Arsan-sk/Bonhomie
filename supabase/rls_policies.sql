-- ============================================
-- Row Level Security (RLS) Policies
-- Multi-User Dashboard Isolation
-- Safe to run multiple times (idempotent)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Profiles Table
-- ============================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- CRITICAL: Simple policies only - NO RECURSIVE CHECKS
-- Allow all authenticated users to read any profile (for lookups)
CREATE POLICY "Authenticated users can view profiles"
ON profiles FOR SELECT
USING (auth.role() = 'authenticated');

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- ============================================
-- Event Assignments Table
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Coordinators view own assignments" ON event_assignments;
DROP POLICY IF EXISTS "Admins view all assignments" ON event_assignments;
DROP POLICY IF EXISTS "Admins can create assignments" ON event_assignments;
DROP POLICY IF EXISTS "Admins can delete assignments" ON event_assignments;

-- Coordinators can view only their assignments
CREATE POLICY "Coordinators view own assignments"
ON event_assignments FOR SELECT
USING (coordinator_id = auth.uid());

-- Admins can view all assignments
CREATE POLICY "Admins view all assignments"
ON event_assignments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Admins can insert assignments
CREATE POLICY "Admins can create assignments"
ON event_assignments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Admins can delete assignments
CREATE POLICY "Admins can delete assignments"
ON event_assignments FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- ============================================
-- Events Table
-- ============================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Admins can insert events" ON events;
DROP POLICY IF EXISTS "Admins can update events" ON events;
DROP POLICY IF EXISTS "Faculty can update assigned events" ON events;
DROP POLICY IF EXISTS "Coordinators view assigned events" ON events;
DROP POLICY IF EXISTS "Admins view all events" ON events;
DROP POLICY IF EXISTS "Students view all events" ON events;
DROP POLICY IF EXISTS "Admins manage events" ON events;

-- Coordinators can view only their assigned events
CREATE POLICY "Coordinators view assigned events"
ON events FOR SELECT
USING (
    id IN (
        SELECT event_id FROM event_assignments
        WHERE coordinator_id = auth.uid()
    )
);

-- Admins can view all events
CREATE POLICY "Admins view all events"
ON events FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Students can view all events (public)
CREATE POLICY "Students view all events"
ON events FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'student'
    )
);

-- Admins can insert/update/delete events
CREATE POLICY "Admins manage events"
ON events FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- ============================================
-- Registrations Table
-- ============================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can view own registrations" ON registrations;
DROP POLICY IF EXISTS "Admins and Faculty can view all registrations" ON registrations;
DROP POLICY IF EXISTS "Users can insert own registration" ON registrations;
DROP POLICY IF EXISTS "Admins can update registrations" ON registrations;
DROP POLICY IF EXISTS "Coordinators view event registrations" ON registrations;
DROP POLICY IF EXISTS "Students view own registrations" ON registrations;
DROP POLICY IF EXISTS "Students can register" ON registrations;
DROP POLICY IF EXISTS "Admins view all registrations" ON registrations;
DROP POLICY IF EXISTS "Coordinators update event registrations" ON registrations;

-- Coordinators can view registrations for their events
CREATE POLICY "Coordinators view event registrations"
ON registrations FOR SELECT
USING (
    event_id IN (
        SELECT event_id FROM event_assignments
        WHERE coordinator_id = auth.uid()
    )
);

-- Students can view their own registrations (profile_id = auth.uid())
CREATE POLICY "Students view own registrations"
ON registrations FOR SELECT
USING (profile_id = auth.uid());

-- Students can insert their own registrations
CREATE POLICY "Students can register"
ON registrations FOR INSERT
WITH CHECK (profile_id = auth.uid());

-- Admins can view all registrations
CREATE POLICY "Admins view all registrations"
ON registrations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Coordinators can update registrations for their events
CREATE POLICY "Coordinators update event registrations"
ON registrations FOR UPDATE
USING (
    event_id IN (
        SELECT event_id FROM event_assignments
        WHERE coordinator_id = auth.uid()
    )
);

-- Admins can update registrations
CREATE POLICY "Admins can update registrations"
ON registrations FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- ============================================
-- Rounds Table
-- ============================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Coordinators can manage rounds" ON rounds;
DROP POLICY IF EXISTS "Public view rounds" ON rounds;
DROP POLICY IF EXISTS "Coordinators view event rounds" ON rounds;
DROP POLICY IF EXISTS "Coordinators manage event rounds" ON rounds;
DROP POLICY IF EXISTS "Admins view all rounds" ON rounds;
DROP POLICY IF EXISTS "Students view registered event rounds" ON rounds;

-- Coordinators can view rounds for their events
CREATE POLICY "Coordinators view event rounds"
ON rounds FOR SELECT
USING (
    event_id IN (
        SELECT event_id FROM event_assignments
        WHERE coordinator_id = auth.uid()
    )
);

-- Coordinators can manage rounds for their events
CREATE POLICY "Coordinators manage event rounds"
ON rounds FOR ALL
USING (
    event_id IN (
        SELECT event_id FROM event_assignments
        WHERE coordinator_id = auth.uid()
    )
);

-- Admins can view all rounds
CREATE POLICY "Admins view all rounds"
ON rounds FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Students can view rounds for events they're registered in (using profile_id)
CREATE POLICY "Students view registered event rounds"
ON rounds FOR SELECT
USING (
    event_id IN (
        SELECT event_id FROM registrations
        WHERE profile_id = auth.uid()
    )
);

-- ============================================
-- Round Participants Table
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Coordinators view round participants" ON round_participants;
DROP POLICY IF EXISTS "Coordinators manage round participants" ON round_participants;
DROP POLICY IF EXISTS "Students view own participation" ON round_participants;
DROP POLICY IF EXISTS "Admins view all participants" ON round_participants;

-- Coordinators can view participants for their event rounds
CREATE POLICY "Coordinators view round participants"
ON round_participants FOR SELECT
USING (
    round_id IN (
        SELECT id FROM rounds
        WHERE event_id IN (
            SELECT event_id FROM event_assignments
            WHERE coordinator_id = auth.uid()
        )
    )
);

-- Coordinators can manage participants for their event rounds
CREATE POLICY "Coordinators manage round participants"
ON round_participants FOR ALL
USING (
    round_id IN (
        SELECT id FROM rounds
        WHERE event_id IN (
            SELECT event_id FROM event_assignments
            WHERE coordinator_id = auth.uid()
        )
    )
);

-- Students can view their own participation (via registration_id)
CREATE POLICY "Students view own participation"
ON round_participants FOR SELECT
USING (
    registration_id IN (
        SELECT id FROM registrations
        WHERE profile_id = auth.uid()
    )
);

-- Admins can view all participants
CREATE POLICY "Admins view all participants"
ON round_participants FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- ============================================
-- Certificates Table
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Students view own certificates" ON certificates;
DROP POLICY IF EXISTS "Coordinators view event certificates" ON certificates;
DROP POLICY IF EXISTS "Admins view all certificates" ON certificates;
DROP POLICY IF EXISTS "Admins manage certificates" ON certificates;

-- Students can view their own certificates (user_id exists in this table)
CREATE POLICY "Students view own certificates"
ON certificates FOR SELECT
USING (user_id = auth.uid());

-- Coordinators can view certificates for their events
CREATE POLICY "Coordinators view event certificates"
ON certificates FOR SELECT
USING (
    event_id IN (
        SELECT event_id FROM event_assignments
        WHERE coordinator_id = auth.uid()
    )
);

-- Admins can view all certificates
CREATE POLICY "Admins view all certificates"
ON certificates FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Admins can manage all certificates
CREATE POLICY "Admins manage certificates"
ON certificates FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);
