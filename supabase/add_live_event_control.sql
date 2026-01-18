-- ============================================
-- Live Event Control System - Database Migration
-- ============================================

-- Phase 1: Add Live Event Tracking to Events Table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS live_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS live_ended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS event_status VARCHAR(20) DEFAULT 'upcoming';

-- Add constraint for event_status
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'events_event_status_check'
    ) THEN
        ALTER TABLE public.events 
        ADD CONSTRAINT events_event_status_check 
        CHECK (event_status IN ('upcoming', 'live', 'completed', 'cancelled'));
    END IF;
END $$;

-- Phase 2: Add Result Tracking Columns
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS second_runnerup_profile_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS results_announced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS results_announced_at TIMESTAMP WITH TIME ZONE;

-- Phase 3: Enhance Profiles with Win Statistics
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS win_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_place_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS second_place_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS third_place_count INTEGER DEFAULT 0;

-- Phase 4: Create Event Results Table
CREATE TABLE IF NOT EXISTS public.event_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE NOT NULL,
    position INTEGER NOT NULL CHECK (position IN (1, 2, 3)),
    team_members JSONB DEFAULT '[]'::jsonb,
    announced_by UUID REFERENCES public.profiles(id),
    announced_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add unique constraints
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'event_results_event_position_key'
    ) THEN
        ALTER TABLE public.event_results 
        ADD CONSTRAINT event_results_event_position_key UNIQUE(event_id, position);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'event_results_event_registration_key'
    ) THEN
        ALTER TABLE public.event_results 
        ADD CONSTRAINT event_results_event_registration_key UNIQUE(event_id, registration_id);
    END IF;
END $$;

-- Phase 5: Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_events_is_live ON public.events(is_live) WHERE is_live = TRUE;
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(event_status);
CREATE INDEX IF NOT EXISTS idx_event_results_event ON public.event_results(event_id);
CREATE INDEX IF NOT EXISTS idx_event_results_registration ON public.event_results(registration_id);

-- Phase 6: Create Function to Increment Win Counts
CREATE OR REPLACE FUNCTION increment_win_count(
    profile_ids UUID[],
    position INTEGER
)
RETURNS VOID AS $$
BEGIN
    -- Increment win counts for all profiles
    UPDATE public.profiles
    SET 
        win_count = win_count + 1,
        first_place_count = CASE WHEN position = 1 THEN first_place_count + 1 ELSE first_place_count END,
        second_place_count = CASE WHEN position = 2 THEN second_place_count + 1 ELSE second_place_count END,
        third_place_count = CASE WHEN position = 3 THEN third_place_count + 1 ELSE third_place_count END
    WHERE id = ANY(profile_ids);
    
    RAISE NOTICE 'Updated win counts for % profiles at position %', array_length(profile_ids, 1), position;
END;
$$ LANGUAGE plpgsql;

-- Phase 7: RLS Policies for event_results
ALTER TABLE public.event_results ENABLE ROW LEVEL SECURITY;

-- Allow public to view announced results
CREATE POLICY "Public can view announced results"
ON public.event_results FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.events
        WHERE events.id = event_results.event_id
        AND events.results_announced = TRUE
    )
);

-- Allow coordinators and admins to insert/update results
CREATE POLICY "Coordinators and admins can manage results"
ON public.event_results FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('coordinator', 'admin')
    )
);

-- Phase 8: Create View for Live Events (Optional but useful)
CREATE OR REPLACE VIEW public.live_events_view AS
SELECT 
    e.*,
    COUNT(r.id) as participant_count,
    json_agg(
        json_build_object(
            'coordinator_id', p.id,
            'coordinator_name', p.full_name,
            'coordinator_phone', p.phone
        )
    ) FILTER (WHERE p.id IS NOT NULL) as coordinators
FROM public.events e
LEFT JOIN public.registrations r ON r.event_id = e.id AND r.status = 'confirmed'
LEFT JOIN public.event_assignments ea ON ea.event_id = e.id
LEFT JOIN public.profiles p ON p.id = ea.coordinator_id
WHERE e.is_live = TRUE
GROUP BY e.id
ORDER BY e.live_started_at DESC;

-- Grant access to view
GRANT SELECT ON public.live_events_view TO authenticated;
GRANT SELECT ON public.live_events_view TO anon;

-- Phase 9: Verification Queries
-- Run these to verify everything is set up correctly

-- Check if columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name IN ('is_live', 'event_status', 'results_announced', 'live_started_at')
ORDER BY column_name;

-- Check event_results table
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'event_results'
ORDER BY ordinal_position;

-- Check profiles win columns
SELECT 
    column_name, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name LIKE '%count%'
ORDER BY column_name;

-- Test increment_win_count function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'increment_win_count';

-- ============================================
-- Migration Complete!
-- ============================================

COMMENT ON TABLE public.event_results IS 'Stores event winner details and positions';
COMMENT ON COLUMN public.events.is_live IS 'Indicates if event is currently happening (visible in Happening Now)';
COMMENT ON COLUMN public.events.event_status IS 'Event lifecycle status: upcoming, live, completed, cancelled';
COMMENT ON FUNCTION increment_win_count IS 'Increments win counts for profile(s) based on position (1st, 2nd, 3rd)';
