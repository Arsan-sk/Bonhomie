-- ============================================
-- ZAIKA BACKFILL STALLS (CORRECTED v2)
-- ============================================
-- Creates stalls for existing confirmed Zaika registrations
-- 
-- Key corrections:
-- 1. No team_name column - use profile.full_name instead
-- 2. Use e.name (not e.title) for event lookup
-- 3. Team leaders identified by non-empty team_members array
-- ============================================

-- First, let's see what we're working with
DO $$
DECLARE
    zaika_event_id UUID;
    zaika_event_name TEXT;
    total_registrations INTEGER;
    team_leader_count INTEGER;
    confirmed_count INTEGER;
BEGIN
    -- Find Zaika event
    SELECT id, name INTO zaika_event_id, zaika_event_name 
    FROM public.events 
    WHERE LOWER(name) LIKE '%zaika%' 
    LIMIT 1;
    
    IF zaika_event_id IS NULL THEN
        RAISE NOTICE '❌ No Zaika event found!';
        RAISE NOTICE 'Please check events table has an event with "Zaika" in the name.';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Found Zaika event: % (ID: %)', zaika_event_name, zaika_event_id;
    
    -- Count registrations
    SELECT COUNT(*) INTO total_registrations 
    FROM public.registrations 
    WHERE event_id = zaika_event_id;
    
    -- Count team leaders (those with non-empty team_members)
    SELECT COUNT(*) INTO team_leader_count 
    FROM public.registrations 
    WHERE event_id = zaika_event_id
    AND team_members IS NOT NULL 
    AND jsonb_array_length(team_members) > 0;
    
    -- Count confirmed team leaders
    SELECT COUNT(*) INTO confirmed_count 
    FROM public.registrations 
    WHERE event_id = zaika_event_id
    AND status = 'confirmed'
    AND team_members IS NOT NULL 
    AND jsonb_array_length(team_members) > 0;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Registration Stats for Zaika:';
    RAISE NOTICE '  - Total registrations: %', total_registrations;
    RAISE NOTICE '  - Team leaders (have team_members): %', team_leader_count;
    RAISE NOTICE '  - Confirmed team leaders: %', confirmed_count;
    RAISE NOTICE '';
END $$;

-- ============================================
-- CREATE STALLS FOR CONFIRMED REGISTRATIONS
-- ============================================
DO $$
DECLARE
    zaika_event_id UUID;
    next_stall_num INTEGER;
    reg RECORD;
    leader_name TEXT;
    new_stall_name TEXT;
    stalls_created INTEGER := 0;
    stalls_skipped INTEGER := 0;
BEGIN
    -- Get Zaika event ID
    SELECT id INTO zaika_event_id 
    FROM public.events 
    WHERE LOWER(name) LIKE '%zaika%' 
    LIMIT 1;
    
    IF zaika_event_id IS NULL THEN
        RAISE NOTICE '❌ No Zaika event found. Skipping backfill.';
        RETURN;
    END IF;
    
    -- Get next stall number
    SELECT COALESCE(MAX(stall_number), 0) INTO next_stall_num FROM public.zaika_stalls;
    
    RAISE NOTICE 'Starting stall creation from stall number: %', next_stall_num + 1;
    
    -- Loop through confirmed team leader registrations
    FOR reg IN 
        SELECT 
            r.id as registration_id,
            r.profile_id,
            p.full_name,
            p.roll_number
        FROM public.registrations r
        JOIN public.profiles p ON p.id = r.profile_id
        WHERE r.event_id = zaika_event_id
        AND r.status = 'confirmed'
        AND r.team_members IS NOT NULL
        AND jsonb_array_length(r.team_members) > 0
        ORDER BY r.registered_at ASC
    LOOP
        -- Check if stall already exists for this registration
        IF EXISTS (SELECT 1 FROM public.zaika_stalls WHERE registration_id = reg.registration_id) THEN
            RAISE NOTICE '  ⏭️  Skipping % - stall already exists', reg.full_name;
            stalls_skipped := stalls_skipped + 1;
            CONTINUE;
        END IF;
        
        -- Increment stall number
        next_stall_num := next_stall_num + 1;
        
        -- Create stall name from leader's name
        leader_name := COALESCE(reg.full_name, 'Team ' || next_stall_num);
        new_stall_name := leader_name || '''s Stall';
        
        -- Insert the stall
        INSERT INTO public.zaika_stalls (
            registration_id,
            stall_number,
            stall_name,
            description,
            is_active,
            total_sales
        ) VALUES (
            reg.registration_id,
            next_stall_num,
            new_stall_name,
            'Stall by ' || leader_name,
            true,
            0
        );
        
        RAISE NOTICE '  ✅ Created stall #% for % (Roll: %)', 
            next_stall_num, 
            reg.full_name, 
            COALESCE(reg.roll_number, 'N/A');
        
        stalls_created := stalls_created + 1;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ BACKFILL COMPLETE';
    RAISE NOTICE '  - Stalls created: %', stalls_created;
    RAISE NOTICE '  - Stalls skipped (already exist): %', stalls_skipped;
    RAISE NOTICE '============================================';
END $$;

-- ============================================
-- VERIFY: Show created stalls
-- ============================================
SELECT 
    s.stall_number,
    s.stall_name,
    p.full_name as leader,
    p.roll_number,
    s.is_active,
    s.total_sales,
    s.created_at
FROM public.zaika_stalls s
JOIN public.registrations r ON r.id = s.registration_id
JOIN public.profiles p ON p.id = r.profile_id
ORDER BY s.stall_number;

-- Show team members for each stall
SELECT 
    s.stall_number,
    s.stall_name,
    p.full_name as leader,
    jsonb_array_length(r.team_members) as team_size,
    r.team_members as team_data
FROM public.zaika_stalls s
JOIN public.registrations r ON r.id = s.registration_id
JOIN public.profiles p ON p.id = r.profile_id
ORDER BY s.stall_number;
