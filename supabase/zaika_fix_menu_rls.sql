-- ============================================
-- ZAIKA MENU ITEMS RLS FIX
-- ============================================
-- The INSERT policy was failing because it references zaika_menu_items.stall_id
-- but during INSERT the row doesn't exist yet. Need to use NEW reference pattern.
-- ============================================

-- Drop existing menu item policies
DROP POLICY IF EXISTS "Anyone can view menu items" ON public.zaika_menu_items;
DROP POLICY IF EXISTS "Stall owners can insert menu items" ON public.zaika_menu_items;
DROP POLICY IF EXISTS "Stall owners can update menu items" ON public.zaika_menu_items;
DROP POLICY IF EXISTS "Stall owners can delete menu items" ON public.zaika_menu_items;
DROP POLICY IF EXISTS "Admins can manage all menu items" ON public.zaika_menu_items;

-- ============================================
-- RECREATE POLICIES WITH CORRECT SYNTAX
-- ============================================

-- Anyone can view menu items
CREATE POLICY "Anyone can view menu items"
    ON public.zaika_menu_items FOR SELECT
    USING (true);

-- Admins can do anything with menu items
CREATE POLICY "Admins can manage all menu items"
    ON public.zaika_menu_items FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Stall owners can insert menu items
-- Use a function to check ownership since WITH CHECK can't easily reference the stall
CREATE OR REPLACE FUNCTION check_stall_owner(p_stall_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.zaika_stalls s
        JOIN public.registrations r ON r.id = s.registration_id
        WHERE s.id = p_stall_id
        AND (
            r.profile_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM jsonb_array_elements(r.team_members) AS tm
                WHERE (tm->>'id')::uuid = auth.uid()
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_stall_owner TO authenticated;

-- Insert policy using the function
CREATE POLICY "Stall owners can insert menu items"
    ON public.zaika_menu_items FOR INSERT
    WITH CHECK (
        check_stall_owner(stall_id)
    );

-- Update policy
CREATE POLICY "Stall owners can update menu items"
    ON public.zaika_menu_items FOR UPDATE
    USING (
        check_stall_owner(stall_id)
    )
    WITH CHECK (
        check_stall_owner(stall_id)
    );

-- Delete policy
CREATE POLICY "Stall owners can delete menu items"
    ON public.zaika_menu_items FOR DELETE
    USING (
        check_stall_owner(stall_id)
    );

-- ============================================
-- VERIFY
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Menu items RLS policies fixed!';
    RAISE NOTICE '';
    RAISE NOTICE 'Policies recreated:';
    RAISE NOTICE '  - Anyone can view menu items (SELECT)';
    RAISE NOTICE '  - Admins can manage all menu items (ALL)';
    RAISE NOTICE '  - Stall owners can insert menu items (INSERT)';
    RAISE NOTICE '  - Stall owners can update menu items (UPDATE)';
    RAISE NOTICE '  - Stall owners can delete menu items (DELETE)';
    RAISE NOTICE '';
    RAISE NOTICE 'Helper function created:';
    RAISE NOTICE '  - check_stall_owner(stall_id UUID) -> BOOLEAN';
END $$;

-- Test query (optional) - Run this to check your stall
-- SELECT * FROM get_my_zaika_stall(auth.uid());
