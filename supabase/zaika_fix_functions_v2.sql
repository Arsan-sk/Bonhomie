-- ============================================
-- ZAIKA FUNCTIONS FIX (CORRECTED)
-- ============================================
-- Run this FIRST to fix the function signature issues
-- 
-- Key corrections:
-- 1. DROP functions first before recreating with different return types
-- 2. Remove team_name since registrations table doesn't have it
-- 3. Get team info from profiles table instead
-- ============================================

-- ============================================
-- DROP EXISTING FUNCTIONS FIRST
-- ============================================
DROP FUNCTION IF EXISTS is_zaika_stall_owner(UUID);
DROP FUNCTION IF EXISTS get_my_zaika_stall(UUID);
DROP FUNCTION IF EXISTS get_all_zaika_stalls();
DROP FUNCTION IF EXISTS get_zaika_leaderboard();
DROP FUNCTION IF EXISTS on_zaika_registration_confirmed();

-- ============================================
-- RECREATE FIXED FUNCTIONS
-- ============================================

-- Function to check if user is a stall owner
CREATE OR REPLACE FUNCTION is_zaika_stall_owner(user_profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    zaika_event_id UUID;
    is_owner BOOLEAN;
BEGIN
    -- Get Zaika event ID (case-insensitive search using LIKE)
    SELECT id INTO zaika_event_id FROM public.events WHERE LOWER(name) LIKE '%zaika%' LIMIT 1;
    
    IF zaika_event_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if user is a team LEADER with a stall
    -- (Leader = has non-empty team_members array)
    SELECT EXISTS(
        SELECT 1 FROM public.zaika_stalls zs
        JOIN public.registrations r ON r.id = zs.registration_id
        WHERE r.event_id = zaika_event_id
        AND r.status = 'confirmed'
        AND r.team_members IS NOT NULL
        AND jsonb_array_length(r.team_members) > 0
        AND (
            -- User is the registration owner (team leader)
            r.profile_id = user_profile_id
            -- OR User is in the team_members array
            OR EXISTS (
                SELECT 1 FROM jsonb_array_elements(r.team_members) AS tm
                WHERE (tm->>'id')::uuid = user_profile_id
            )
        )
    ) INTO is_owner;
    
    RETURN is_owner;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's stall (if they are owner or team member)
CREATE OR REPLACE FUNCTION get_my_zaika_stall(user_profile_id UUID)
RETURNS TABLE (
    stall_id UUID,
    stall_number INTEGER,
    stall_name TEXT,
    description TEXT,
    total_sales NUMERIC,
    registration_id UUID,
    is_active BOOLEAN,
    leader_name TEXT,
    leader_roll_number TEXT
) AS $$
DECLARE
    zaika_event_id UUID;
BEGIN
    -- Get Zaika event ID (case-insensitive search)
    SELECT id INTO zaika_event_id FROM public.events WHERE LOWER(name) LIKE '%zaika%' LIMIT 1;
    
    RETURN QUERY
    SELECT 
        s.id as stall_id,
        s.stall_number,
        s.stall_name,
        s.description,
        s.total_sales,
        s.registration_id,
        s.is_active,
        p.full_name as leader_name,
        p.roll_number as leader_roll_number
    FROM public.zaika_stalls s
    JOIN public.registrations r ON r.id = s.registration_id
    JOIN public.profiles p ON p.id = r.profile_id
    WHERE r.event_id = zaika_event_id
    AND r.status = 'confirmed'
    AND (
        -- User is the team leader
        r.profile_id = user_profile_id
        -- OR User is in the team_members array
        OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(r.team_members) AS tm
            WHERE (tm->>'id')::uuid = user_profile_id
        )
    )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all active stalls for buyers to browse
CREATE OR REPLACE FUNCTION get_all_zaika_stalls()
RETURNS TABLE (
    stall_id UUID,
    stall_number INTEGER,
    stall_name TEXT,
    description TEXT,
    total_sales NUMERIC,
    is_active BOOLEAN,
    leader_name TEXT,
    menu_items JSONB
) AS $$
DECLARE
    zaika_event_id UUID;
BEGIN
    -- Get Zaika event ID (case-insensitive search)
    SELECT id INTO zaika_event_id FROM public.events WHERE LOWER(name) LIKE '%zaika%' LIMIT 1;
    
    RETURN QUERY
    SELECT 
        s.id as stall_id,
        s.stall_number,
        s.stall_name,
        s.description,
        s.total_sales,
        s.is_active,
        p.full_name as leader_name,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', mi.id,
                        'name', mi.name,
                        'price', mi.price,
                        'description', mi.description,
                        'is_available', mi.is_available
                    )
                )
                FROM public.zaika_menu_items mi
                WHERE mi.stall_id = s.id AND mi.is_available = true
            ),
            '[]'::jsonb
        ) as menu_items
    FROM public.zaika_stalls s
    JOIN public.registrations r ON r.id = s.registration_id
    JOIN public.profiles p ON p.id = r.profile_id
    WHERE r.event_id = zaika_event_id
    AND s.is_active = true
    ORDER BY s.stall_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get leaderboard
CREATE OR REPLACE FUNCTION get_zaika_leaderboard()
RETURNS TABLE (
    stall_id UUID,
    stall_number INTEGER,
    stall_name TEXT,
    leader_name TEXT,
    total_sales NUMERIC,
    is_active BOOLEAN,
    rank BIGINT
) AS $$
DECLARE
    zaika_event_id UUID;
BEGIN
    -- Get Zaika event ID (case-insensitive search)
    SELECT id INTO zaika_event_id FROM public.events WHERE LOWER(name) LIKE '%zaika%' LIMIT 1;
    
    RETURN QUERY
    SELECT 
        s.id as stall_id,
        s.stall_number,
        s.stall_name,
        p.full_name as leader_name,
        s.total_sales,
        s.is_active,
        ROW_NUMBER() OVER (ORDER BY s.total_sales DESC) as rank
    FROM public.zaika_stalls s
    JOIN public.registrations r ON r.id = s.registration_id
    JOIN public.profiles p ON p.id = r.profile_id
    WHERE r.event_id = zaika_event_id
    ORDER BY s.total_sales DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for auto-creating stall when Zaika registration is confirmed
CREATE OR REPLACE FUNCTION on_zaika_registration_confirmed()
RETURNS TRIGGER AS $$
DECLARE
    zaika_event_id UUID;
    next_stall_number INTEGER;
    new_stall_name TEXT;
    leader_name TEXT;
BEGIN
    -- Only proceed if status changed to 'confirmed'
    IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
        -- Check if this is a Zaika registration (case-insensitive)
        SELECT id INTO zaika_event_id FROM public.events WHERE LOWER(name) LIKE '%zaika%' LIMIT 1;
        
        IF NEW.event_id = zaika_event_id THEN
            -- Only create stall for TEAM LEADERS (has team_members with data)
            IF NEW.team_members IS NOT NULL AND jsonb_array_length(NEW.team_members) > 0 THEN
                -- Get leader's name from profiles
                SELECT full_name INTO leader_name FROM public.profiles WHERE id = NEW.profile_id;
                
                -- Get next stall number
                SELECT COALESCE(MAX(stall_number), 0) + 1 INTO next_stall_number FROM public.zaika_stalls;
                
                -- Use leader name for stall name
                new_stall_name := COALESCE(leader_name, 'Team') || '''s Stall';
                
                -- Check if stall already exists for this registration
                IF NOT EXISTS (SELECT 1 FROM public.zaika_stalls WHERE registration_id = NEW.id) THEN
                    -- Create stall for this registration
                    INSERT INTO public.zaika_stalls (registration_id, stall_number, stall_name, is_active, total_sales)
                    VALUES (NEW.id, next_stall_number, new_stall_name, true, 0);
                END IF;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_zaika_registration ON public.registrations;
CREATE TRIGGER on_zaika_registration
    AFTER INSERT OR UPDATE OF status ON public.registrations
    FOR EACH ROW
    EXECUTE FUNCTION on_zaika_registration_confirmed();

-- Grant permissions
GRANT EXECUTE ON FUNCTION is_zaika_stall_owner TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_zaika_stall TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_zaika_stalls TO authenticated;
GRANT EXECUTE ON FUNCTION get_zaika_leaderboard TO authenticated;

-- ============================================
-- VERIFY
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Zaika functions fixed successfully!';
    RAISE NOTICE 'Functions recreated:';
    RAISE NOTICE '  - is_zaika_stall_owner(UUID)';
    RAISE NOTICE '  - get_my_zaika_stall(UUID)';
    RAISE NOTICE '  - get_all_zaika_stalls()';
    RAISE NOTICE '  - get_zaika_leaderboard()';
    RAISE NOTICE '  - on_zaika_registration_confirmed() trigger';
    RAISE NOTICE '';
    RAISE NOTICE 'Now run zaika_backfill_stalls_v2.sql to create stalls for existing registrations';
END $$;
