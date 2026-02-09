-- ============================================
-- Update get_all_zaika_stalls to include searchable fields
-- Adds team_name, team_leader_roll, and team_member_rolls for search
-- ============================================

CREATE OR REPLACE FUNCTION get_all_zaika_stalls()
RETURNS TABLE (
    stall_id UUID,
    stall_number INTEGER,
    stall_name TEXT,
    description TEXT,
    total_sales NUMERIC,
    is_active BOOLEAN,
    team_name TEXT,
    team_leader_roll TEXT,
    team_member_rolls TEXT[],
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
        p.full_name as team_name,
        p.roll_number as team_leader_roll,
        -- Extract roll numbers from team_members JSONB array
        COALESCE(
            ARRAY(
                SELECT tm->>'roll_number'
                FROM jsonb_array_elements(r.team_members) AS tm
                WHERE tm->>'roll_number' IS NOT NULL
            ),
            ARRAY[]::TEXT[]
        ) as team_member_rolls,
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_all_zaika_stalls TO authenticated;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ get_all_zaika_stalls updated with searchable fields:';
    RAISE NOTICE '   - team_name (team leader full name)';
    RAISE NOTICE '   - team_leader_roll (roll number of team leader)';
    RAISE NOTICE '   - team_member_rolls (array of team member roll numbers)';
END $$;
