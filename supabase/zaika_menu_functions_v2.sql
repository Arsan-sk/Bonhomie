-- ============================================
-- ZAIKA MENU FUNCTIONS - SIMPLIFIED VERSION
-- ============================================
-- Run this in Supabase SQL Editor
-- After running, click "Reload" in the API docs or wait 1-2 minutes
-- ============================================

-- Drop existing functions first (clean slate)
DROP FUNCTION IF EXISTS get_current_profile_id();
DROP FUNCTION IF EXISTS user_owns_zaika_stall(UUID);
DROP FUNCTION IF EXISTS zaika_add_menu_item(UUID, TEXT, NUMERIC, TEXT, TEXT);
DROP FUNCTION IF EXISTS zaika_update_menu_item(UUID, TEXT, NUMERIC, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS zaika_delete_menu_item(UUID);
DROP FUNCTION IF EXISTS zaika_toggle_menu_item_availability(UUID);
DROP FUNCTION IF EXISTS check_stall_owner(UUID);

-- ============================================
-- 1. Get current user's profile ID
-- ============================================
CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    -- Try: profile.id = auth.uid() (self-registered users)
    SELECT id INTO v_profile_id FROM public.profiles WHERE id = auth.uid();
    
    IF v_profile_id IS NOT NULL THEN
        RETURN v_profile_id;
    END IF;
    
    -- Try: profile.auth_user_id = auth.uid() (admin-created profiles)
    SELECT id INTO v_profile_id FROM public.profiles WHERE auth_user_id = auth.uid();
    
    RETURN v_profile_id;
END;
$$;

-- ============================================
-- 2. Check if user owns a stall
-- ============================================
CREATE OR REPLACE FUNCTION user_owns_zaika_stall(p_stall_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_profile_id UUID;
    v_is_owner BOOLEAN := false;
BEGIN
    v_profile_id := get_current_profile_id();
    
    IF v_profile_id IS NULL THEN
        RETURN false;
    END IF;
    
    SELECT EXISTS (
        SELECT 1 FROM public.zaika_stalls s
        JOIN public.registrations r ON r.id = s.registration_id
        WHERE s.id = p_stall_id
        AND (
            r.profile_id = v_profile_id
            OR EXISTS (
                SELECT 1 FROM jsonb_array_elements(r.team_members) AS tm
                WHERE (tm->>'id')::uuid = v_profile_id
            )
        )
    ) INTO v_is_owner;
    
    RETURN v_is_owner;
END;
$$;

-- ============================================
-- 3. ADD MENU ITEM
-- ============================================
CREATE OR REPLACE FUNCTION zaika_add_menu_item(
    p_stall_id UUID,
    p_name TEXT,
    p_price NUMERIC,
    p_description TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item_id UUID;
BEGIN
    -- Check ownership
    IF NOT user_owns_zaika_stall(p_stall_id) THEN
        RAISE EXCEPTION 'Permission denied: You do not own this stall';
    END IF;
    
    -- Validate
    IF p_name IS NULL OR trim(p_name) = '' THEN
        RAISE EXCEPTION 'Item name is required';
    END IF;
    
    IF p_price IS NULL OR p_price <= 0 THEN
        RAISE EXCEPTION 'Price must be greater than 0';
    END IF;
    
    -- Insert
    INSERT INTO public.zaika_menu_items (stall_id, name, price, description, image_url, is_available)
    VALUES (p_stall_id, trim(p_name), p_price, p_description, p_image_url, true)
    RETURNING id INTO v_item_id;
    
    RETURN v_item_id;
END;
$$;

-- ============================================
-- 4. UPDATE MENU ITEM
-- ============================================
CREATE OR REPLACE FUNCTION zaika_update_menu_item(
    p_item_id UUID,
    p_name TEXT DEFAULT NULL,
    p_price NUMERIC DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL,
    p_is_available BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stall_id UUID;
BEGIN
    -- Get stall_id
    SELECT stall_id INTO v_stall_id FROM public.zaika_menu_items WHERE id = p_item_id;
    
    IF v_stall_id IS NULL THEN
        RAISE EXCEPTION 'Menu item not found';
    END IF;
    
    -- Check ownership
    IF NOT user_owns_zaika_stall(v_stall_id) THEN
        RAISE EXCEPTION 'Permission denied: You do not own this stall';
    END IF;
    
    -- Update
    UPDATE public.zaika_menu_items
    SET 
        name = COALESCE(p_name, name),
        price = COALESCE(p_price, price),
        description = COALESCE(p_description, description),
        image_url = COALESCE(p_image_url, image_url),
        is_available = COALESCE(p_is_available, is_available),
        updated_at = NOW()
    WHERE id = p_item_id;
    
    RETURN true;
END;
$$;

-- ============================================
-- 5. DELETE MENU ITEM
-- ============================================
CREATE OR REPLACE FUNCTION zaika_delete_menu_item(p_item_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stall_id UUID;
BEGIN
    -- Get stall_id
    SELECT stall_id INTO v_stall_id FROM public.zaika_menu_items WHERE id = p_item_id;
    
    IF v_stall_id IS NULL THEN
        RAISE EXCEPTION 'Menu item not found';
    END IF;
    
    -- Check ownership
    IF NOT user_owns_zaika_stall(v_stall_id) THEN
        RAISE EXCEPTION 'Permission denied: You do not own this stall';
    END IF;
    
    -- Delete
    DELETE FROM public.zaika_menu_items WHERE id = p_item_id;
    
    RETURN true;
END;
$$;

-- ============================================
-- 6. TOGGLE AVAILABILITY
-- ============================================
CREATE OR REPLACE FUNCTION zaika_toggle_menu_item_availability(p_item_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stall_id UUID;
    v_new_status BOOLEAN;
BEGIN
    -- Get stall_id
    SELECT stall_id INTO v_stall_id FROM public.zaika_menu_items WHERE id = p_item_id;
    
    IF v_stall_id IS NULL THEN
        RAISE EXCEPTION 'Menu item not found';
    END IF;
    
    -- Check ownership
    IF NOT user_owns_zaika_stall(v_stall_id) THEN
        RAISE EXCEPTION 'Permission denied: You do not own this stall';
    END IF;
    
    -- Toggle
    UPDATE public.zaika_menu_items
    SET is_available = NOT is_available, updated_at = NOW()
    WHERE id = p_item_id
    RETURNING is_available INTO v_new_status;
    
    RETURN v_new_status;
END;
$$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION get_current_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION user_owns_zaika_stall(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION zaika_add_menu_item(UUID, TEXT, NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION zaika_update_menu_item(UUID, TEXT, NUMERIC, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION zaika_delete_menu_item(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION zaika_toggle_menu_item_availability(UUID) TO authenticated;

-- Also grant to anon for testing (remove in production if not needed)
GRANT EXECUTE ON FUNCTION get_current_profile_id() TO anon;

-- ============================================
-- NOTIFY POSTGREST TO RELOAD SCHEMA
-- ============================================
NOTIFY pgrst, 'reload schema';

-- ============================================
-- VERIFY FUNCTIONS EXIST
-- ============================================
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'get_current_profile_id',
        'user_owns_zaika_stall',
        'zaika_add_menu_item',
        'zaika_update_menu_item',
        'zaika_delete_menu_item',
        'zaika_toggle_menu_item_availability'
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ ZAIKA MENU FUNCTIONS INSTALLED: %/6', v_count;
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions available:';
    RAISE NOTICE '  • zaika_add_menu_item(stall_id, name, price, description, image_url)';
    RAISE NOTICE '  • zaika_update_menu_item(item_id, name, price, description, image_url, is_available)';
    RAISE NOTICE '  • zaika_delete_menu_item(item_id)';
    RAISE NOTICE '  • zaika_toggle_menu_item_availability(item_id)';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: If you still get 404 errors, do ONE of these:';
    RAISE NOTICE '    1. Wait 1-2 minutes for schema cache to refresh';
    RAISE NOTICE '    2. Go to Supabase Dashboard > API > Click "Reload"';
    RAISE NOTICE '    3. Or refresh your browser and try again';
    RAISE NOTICE '==========================================';
END $$;

-- Quick test query to verify functions are accessible
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname LIKE 'zaika_%'
ORDER BY p.proname;
