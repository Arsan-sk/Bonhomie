-- Migration: Populate allowed_genders column for existing events
-- This script analyzes event names and assigns appropriate gender restrictions

-- Female-only events (traditionally women-oriented events)
UPDATE public.events 
SET allowed_genders = ARRAY['Female']
WHERE name IN (
  'Mehndi',           -- Traditional henna art for women
  'Rangoli',          -- Traditional floor art, typically for women
  'Throw Ball'        -- Women's sport
);

-- Male-only events (strength/traditional men's sports)
UPDATE public.events 
SET allowed_genders = ARRAY['Male']
WHERE name IN (
  'Cricket',          -- Men's team sport (standard format)
  'Football',         -- Men's team sport
  'Arm Wrestling',    -- Strength-based individual sport
  'Push Up',          -- Strength challenge
  'Shot Put',         -- Track and field strength event
  'Discus Throw'      -- Track and field strength event
);

-- Events open to both genders (inclusive events)
UPDATE public.events 
SET allowed_genders = ARRAY['Male', 'Female']
WHERE name IN (
  -- Cultural Events (open to all)
  'Cooking Competition',
  'Qirat',
  'Treasure Hunt',
  'Hamd-O-Naat',
  'Mushaira',
  'Debate',
  'Zaika',
  'Extempore',
  'Short Film',
  'Calligraphy',
  'Pot Painting',
  'Stand-up Comedy',
  'Doodling',
  'Lippan Art',
  'Speed Portrait',
  'Beatboxing',
  'Vlog',
  'Vernacular Speech',
  
  -- Sports Events (open to all)
  'Chess',
  'Carrom',
  'Race 100M',
  'Badminton',
  'Table Tennis',
  'Volleyball',
  'Box Cricket',
  'BGMI',
  'Relay Race',
  'Tug of War',
  'Three-Leg Race',
  'Free Fire',
  'Valorant',
  
  -- Technical Events (open to all)
  'AutoCAD',
  'Sustainable Development Poster'
);

-- For any events not explicitly set above, default to both genders (inclusive approach)
UPDATE public.events 
SET allowed_genders = ARRAY['Male', 'Female']
WHERE allowed_genders IS NULL;

-- Verify the updates
SELECT name, category, subcategory, allowed_genders 
FROM public.events 
ORDER BY category, name;
