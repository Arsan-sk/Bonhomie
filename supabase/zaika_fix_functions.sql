-- ============================================
-- FIX ZAIKA FUNCTIONS TO USE LIKE MATCHING
-- ============================================
-- This fixes the SQL functions to use LIKE '%zaika%' instead of exact match
-- Run this AFTER the main zaika_schema.sql

-- Fix is_zaika_stall_owner function
CREATE OR REPLACE FUNCTION is_zaika_stall_owner(user_profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    zaika_event_id UUID;
    is_owner BOOLEAN;
BEGIN
    -- Get Zaika event ID (case-insensitive search)
    SELECT id INTO zaika_event_id FROM public.events WHERE LOWER(name) LIKE '%zaika%' LIMIT 1;
    
    IF zaika_event_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if user has a confirmed registration for Zaika event
    SELECT EXISTS(
        SELECT 1 FROM public.registrations r
        WHERE r.event_id = zaika_event_id
        AND r.status = 'confirmed'
        AND (
            r.profile_id = user_profile_id
            OR EXISTS (
                SELECT 1 FROM jsonb_array_elements(r.team_members) AS tm
                WHERE (tm->>'id')::uuid = user_profile_id
            )
        )
    ) INTO is_owner;
    
    RETURN is_owner;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix get_my_zaika_stall function
CREATE OR REPLACE FUNCTION get_my_zaika_stall(user_profile_id UUID)
RETURNS TABLE (
    stall_id UUID,
    stall_number INTEGER,
    stall_name TEXT,
    description TEXT,
    total_sales NUMERIC,
    registration_id UUID,
    is_active BOOLEAN,
    team_name TEXT
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
        r.team_name
    FROM public.zaika_stalls s
    JOIN public.registrations r ON r.id = s.registration_id
    WHERE r.event_id = zaika_event_id
    AND r.status = 'confirmed'
    AND (
        r.profile_id = user_profile_id
        OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(r.team_members) AS tm
            WHERE (tm->>'id')::uuid = user_profile_id
        )
    )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix get_all_zaika_stalls function
CREATE OR REPLACE FUNCTION get_all_zaika_stalls()
RETURNS TABLE (
    stall_id UUID,
    stall_number INTEGER,
    stall_name TEXT,
    description TEXT,
    total_sales NUMERIC,
    is_active BOOLEAN,
    team_name TEXT,
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
        r.team_name,
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
    WHERE r.event_id = zaika_event_id
    AND s.is_active = true
    ORDER BY s.stall_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix get_zaika_leaderboard function
CREATE OR REPLACE FUNCTION get_zaika_leaderboard()
RETURNS TABLE (
    stall_id UUID,
    stall_number INTEGER,
    stall_name TEXT,
    team_name TEXT,
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
        r.team_name,
        s.total_sales,
        s.is_active,
        ROW_NUMBER() OVER (ORDER BY s.total_sales DESC) as rank
    FROM public.zaika_stalls s
    JOIN public.registrations r ON r.id = s.registration_id
    WHERE r.event_id = zaika_event_id
    ORDER BY s.total_sales DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger to also use LIKE matching
CREATE OR REPLACE FUNCTION on_zaika_registration_confirmed()
RETURNS TRIGGER AS $$
DECLARE
    zaika_event_id UUID;
    next_stall_number INTEGER;
    new_stall_name TEXT;
BEGIN
    -- Only proceed if status changed to 'confirmed'
    IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
        -- Check if this is a Zaika registration (case-insensitive)
        SELECT id INTO zaika_event_id FROM public.events WHERE LOWER(name) LIKE '%zaika%' LIMIT 1;
        
        IF NEW.event_id = zaika_event_id THEN
            -- Get next stall number
            SELECT COALESCE(MAX(stall_number), 0) + 1 INTO next_stall_number FROM public.zaika_stalls;
            
            -- Use team name or create default name
            new_stall_name := COALESCE(NEW.team_name, 'Stall #' || next_stall_number);
            
            -- Check if stall already exists for this registration
            IF NOT EXISTS (SELECT 1 FROM public.zaika_stalls WHERE registration_id = NEW.id) THEN
                -- Create stall for this registration
                INSERT INTO public.zaika_stalls (registration_id, stall_number, stall_name, is_active, total_sales)
                VALUES (NEW.id, next_stall_number, new_stall_name, true, 0);
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_zaika_registration ON public.registrations;
CREATE TRIGGER on_zaika_registration
    AFTER INSERT OR UPDATE OF status ON public.registrations
    FOR EACH ROW
    EXECUTE FUNCTION on_zaika_registration_confirmed();

-- ============================================
-- VERIFY THE FIX
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Zaika functions fixed to use LIKE matching';
    RAISE NOTICE 'Now run zaika_backfill_stalls.sql to create stalls for existing registrations';
END $$;
