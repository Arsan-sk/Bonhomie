-- Create ROUNDS table
CREATE TABLE IF NOT EXISTS public.rounds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. "Round 1", "Semi-Final", "Coding Round"
    sequence_order INTEGER NOT NULL DEFAULT 1, -- 1, 2, 3...
    type TEXT DEFAULT 'elimination', -- 'elimination', 'scoring', 'final'
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'live', 'completed'
    advancement_count INTEGER DEFAULT 0, -- How many go to next round
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;

-- Create ROUND_PARTICIPANTS table (Track progress per round)
CREATE TABLE IF NOT EXISTS public.round_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE,
    registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE,
    score DECIMAL DEFAULT 0,
    status TEXT DEFAULT 'pending', -- 'pending', 'qualified', 'eliminated'
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(round_id, registration_id)
);

-- Enable RLS
ALTER TABLE public.round_participants ENABLE ROW LEVEL SECURITY;

-- Create CERTIFICATES table (if not exists)
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    certificate_type TEXT NOT NULL, -- 'participation', 'merit', 'winner'
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    template_url TEXT,
    unique_code TEXT UNIQUE NOT NULL
);

-- Enable RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- POLICIES
-- Coordinators can manage rounds for their events
CREATE POLICY "Coordinators can manage rounds" 
ON public.rounds 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.event_assignments 
        WHERE event_assignments.event_id = rounds.event_id 
        AND event_assignments.coordinator_id = auth.uid()
    )
    OR 
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

CREATE POLICY "Public view rounds" ON public.rounds FOR SELECT USING (true);
