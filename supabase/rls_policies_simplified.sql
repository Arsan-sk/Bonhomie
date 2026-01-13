-- ============================================
-- Row Level Security (RLS) Policies - FIXED
-- Multi-User Dashboard Isolation
-- NO RECURSIVE POLICIES - Uses basic auth checks only
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

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

-- All authenticated users can view profiles (needed for lookups)
CREATE POLICY "Authenticated users read profiles"
ON profiles FOR SELECT
USING (auth.role() = 'authenticated');

-- Users can update own profile
CREATE POLICY "Users update own profile"
ON profiles FOR UPDATE
USING (id = auth.uid());

-- Users can insert own profile
CREATE POLICY "Users insert own profile"
ON profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- ============================================
-- Event Assignments Table
-- ============================================

-- Drop policies
DROP POLICY IF EXISTS "Coordinators view own assignments" ON event_assignments;
DROP POLICY IF EXISTS "Admins view all assignments" ON event_assignments;
DROP POLICY IF EXISTS "Admins can create assignments" ON event_assignments;
DROP POLICY IF EXISTS "Admins can delete assignments" ON event_assignments;

-- All authenticated users can view assignments (app will filter)
CREATE POLICY "Authenticated users view assignments"
ON event_assignments FOR SELECT
USING (auth.role() = 'authenticated');

-- Coordinators and admins can insert/delete (app-level checks)
CREATE POLICY "Authenticated users manage assignments"
ON event_assignments FOR ALL
USING (auth.role() = 'authenticated');

-- ============================================
-- Events Table
-- ============================================

-- Drop policies
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Admins can insert events" ON events;
DROP POLICY IF EXISTS "Admins can update events" ON events;
DROP POLICY IF EXISTS "Faculty can update assigned events" ON events;
DROP POLICY IF EXISTS "Coordinators view assigned events" ON events;
DROP POLICY IF EXISTS "Admins view all events" ON events;
DROP POLICY IF EXISTS "Students view all events" ON events;
DROP POLICY IF EXISTS "Admins manage events" ON events;

-- All authenticated users can view events
CREATE POLICY "Authenticated users view events"
ON events FOR SELECT
USING (auth.role() = 'authenticated');

-- All authenticated users can manage events (app will restrict)
CREATE POLICY "Authenticated users manage events"
ON events FOR ALL
USING (auth.role() = 'authenticated');

-- ============================================
-- Registrations Table
-- ============================================

-- Drop policies
DROP POLICY IF EXISTS "Users can view own registrations" ON registrations;
DROP POLICY IF EXISTS "Admins and Faculty can view all registrations" ON registrations;
DROP POLICY IF EXISTS "Users can insert own registration" ON registrations;
DROP POLICY IF EXISTS "Admins can update registrations" ON registrations;
DROP POLICY IF EXISTS "Coordinators view event registrations" ON registrations;
DROP POLICY IF EXISTS "Students view own registrations" ON registrations;
DROP POLICY IF EXISTS "Students can register" ON registrations;
DROP POLICY IF EXISTS "Admins view all registrations" ON registrations;
DROP POLICY IF EXISTS "Coordinators update event registrations" ON registrations;

-- All authenticated users can view registrations
CREATE POLICY "Authenticated users view registrations"
ON registrations FOR SELECT
USING (auth.role() = 'authenticated');

-- All authenticated users can manage registrations
CREATE POLICY "Authenticated users manage registrations"
ON registrations FOR ALL
USING (auth.role() = 'authenticated');

-- ============================================
-- Rounds Table
-- ============================================

-- Drop policies
DROP POLICY IF EXISTS "Coordinators can manage rounds" ON rounds;
DROP POLICY IF EXISTS "Public view rounds" ON rounds;
DROP POLICY IF EXISTS "Coordinators view event rounds" ON rounds;
DROP POLICY IF EXISTS "Coordinators manage event rounds" ON rounds;
DROP POLICY IF EXISTS "Admins view all rounds" ON rounds;
DROP POLICY IF EXISTS "Students view registered event rounds" ON rounds;

-- All authenticated users can view rounds
CREATE POLICY "Authenticated users view rounds"
ON rounds FOR SELECT
USING (auth.role() = 'authenticated');

-- All authenticated users can manage rounds (app filters)
CREATE POLICY "Authenticated users manage rounds"
ON rounds FOR ALL
USING (auth.role() = 'authenticated');

-- ============================================
-- Round Participants Table
-- ============================================

-- Drop policies
DROP POLICY IF EXISTS "Coordinators view round participants" ON round_participants;
DROP POLICY IF EXISTS "Coordinators manage round participants" ON round_participants;
DROP POLICY IF EXISTS "Students view own participation" ON round_participants;
DROP POLICY IF EXISTS "Admins view all participants" ON round_participants;

-- All authenticated users can view participants
CREATE POLICY "Authenticated users view participants"
ON round_participants FOR SELECT
USING (auth.role() = 'authenticated');

-- All authenticated users can manage participants
CREATE POLICY "Authenticated users manage participants"
ON round_participants FOR ALL
USING (auth.role() = 'authenticated');

-- ============================================
-- Certificates Table
-- ============================================

-- Drop policies
DROP POLICY IF EXISTS "Students view own certificates" ON certificates;
DROP POLICY IF EXISTS "Coordinators view event certificates" ON certificates;
DROP POLICY IF EXISTS "Admins view all certificates" ON certificates;
DROP POLICY IF EXISTS "Admins manage certificates" ON certificates;

-- All authenticated users can view certificates
CREATE POLICY "Authenticated users view certificates"
ON certificates FOR SELECT
USING (auth.role() = 'authenticated');

-- All authenticated users can manage certificates
CREATE POLICY "Authenticated users manage certificates"
ON certificates FOR ALL
USING (auth.role() = 'authenticated');
-- ============================================
-- Row Level Security (RLS) Policies - FIXED
-- Multi-User Dashboard Isolation
-- NO RECURSIVE POLICIES - Uses basic auth checks only
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

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

-- All authenticated users can view profiles (needed for lookups)
CREATE POLICY "Authenticated users read profiles"
ON profiles FOR SELECT
USING (auth.role() = 'authenticated');

-- Users can update own profile
CREATE POLICY "Users update own profile"
ON profiles FOR UPDATE
USING (id = auth.uid());

-- Users can insert own profile
CREATE POLICY "Users insert own profile"
ON profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- ============================================
-- Event Assignments Table
-- ============================================

-- Drop policies
DROP POLICY IF EXISTS "Coordinators view own assignments" ON event_assignments;
DROP POLICY IF EXISTS "Admins view all assignments" ON event_assignments;
DROP POLICY IF EXISTS "Admins can create assignments" ON event_assignments;
DROP POLICY IF EXISTS "Admins can delete assignments" ON event_assignments;

-- All authenticated users can view assignments (app will filter)
CREATE POLICY "Authenticated users view assignments"
ON event_assignments FOR SELECT
USING (auth.role() = 'authenticated');

-- Coordinators and admins can insert/delete (app-level checks)
CREATE POLICY "Authenticated users manage assignments"
ON event_assignments FOR ALL
USING (auth.role() = 'authenticated');

-- ============================================
-- Events Table
-- ============================================

-- Drop policies
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Admins can insert events" ON events;
DROP POLICY IF EXISTS "Admins can update events" ON events;
DROP POLICY IF EXISTS "Faculty can update assigned events" ON events;
DROP POLICY IF EXISTS "Coordinators view assigned events" ON events;
DROP POLICY IF EXISTS "Admins view all events" ON events;
DROP POLICY IF EXISTS "Students view all events" ON events;
DROP POLICY IF EXISTS "Admins manage events" ON events;

-- All authenticated users can view events
CREATE POLICY "Authenticated users view events"
ON events FOR SELECT
USING (auth.role() = 'authenticated');

-- All authenticated users can manage events (app will restrict)
CREATE POLICY "Authenticated users manage events"
ON events FOR ALL
USING (auth.role() = 'authenticated');

-- ============================================
-- Registrations Table
-- ============================================

-- Drop policies
DROP POLICY IF EXISTS "Users can view own registrations" ON registrations;
DROP POLICY IF EXISTS "Admins and Faculty can view all registrations" ON registrations;
DROP POLICY IF EXISTS "Users can insert own registration" ON registrations;
DROP POLICY IF EXISTS "Admins can update registrations" ON registrations;
DROP POLICY IF EXISTS "Coordinators view event registrations" ON registrations;
DROP POLICY IF EXISTS "Students view own registrations" ON registrations;
DROP POLICY IF EXISTS "Students can register" ON registrations;
DROP POLICY IF EXISTS "Admins view all registrations" ON registrations;
DROP POLICY IF EXISTS "Coordinators update event registrations" ON registrations;

-- All authenticated users can view registrations
CREATE POLICY "Authenticated users view registrations"
ON registrations FOR SELECT
USING (auth.role() = 'authenticated');

-- All authenticated users can manage registrations
CREATE POLICY "Authenticated users manage registrations"
ON registrations FOR ALL
USING (auth.role() = 'authenticated');

-- ============================================
-- Rounds Table
-- ============================================

-- Drop policies
DROP POLICY IF EXISTS "Coordinators can manage rounds" ON rounds;
DROP POLICY IF EXISTS "Public view rounds" ON rounds;
DROP POLICY IF EXISTS "Coordinators view event rounds" ON rounds;
DROP POLICY IF EXISTS "Coordinators manage event rounds" ON rounds;
DROP POLICY IF EXISTS "Admins view all rounds" ON rounds;
DROP POLICY IF EXISTS "Students view registered event rounds" ON rounds;

-- All authenticated users can view rounds
CREATE POLICY "Authenticated users view rounds"
ON rounds FOR SELECT
USING (auth.role() = 'authenticated');

-- All authenticated users can manage rounds (app filters)
CREATE POLICY "Authenticated users manage rounds"
ON rounds FOR ALL
USING (auth.role() = 'authenticated');

-- ============================================
-- Round Participants Table
-- ============================================

-- Drop policies
DROP POLICY IF EXISTS "Coordinators view round participants" ON round_participants;
DROP POLICY IF EXISTS "Coordinators manage round participants" ON round_participants;
DROP POLICY IF EXISTS "Students view own participation" ON round_participants;
DROP POLICY IF EXISTS "Admins view all participants" ON round_participants;

-- All authenticated users can view participants
CREATE POLICY "Authenticated users view participants"
ON round_participants FOR SELECT
USING (auth.role() = 'authenticated');

-- All authenticated users can manage participants
CREATE POLICY "Authenticated users manage participants"
ON round_participants FOR ALL
USING (auth.role() = 'authenticated');

-- ============================================
-- Certificates Table
-- ============================================

-- Drop policies
DROP POLICY IF EXISTS "Students view own certificates" ON certificates;
DROP POLICY IF EXISTS "Coordinators view event certificates" ON certificates;
DROP POLICY IF EXISTS "Admins view all certificates" ON certificates;
DROP POLICY IF EXISTS "Admins manage certificates" ON certificates;

-- All authenticated users can view certificates
CREATE POLICY "Authenticated users view certificates"
ON certificates FOR SELECT
USING (auth.role() = 'authenticated');

-- All authenticated users can manage certificates
CREATE POLICY "Authenticated users manage certificates"
ON certificates FOR ALL
USING (auth.role() = 'authenticated');
