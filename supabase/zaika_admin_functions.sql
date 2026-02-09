-- ============================================
-- ZAIKA ADMIN FUNCTIONS - BYPASS RLS ISSUES
-- ============================================
-- Create SECURITY DEFINER functions for admin operations
-- These bypass RLS and do their own permission checks
-- ============================================

-- ============================================
-- 1. Function to get all pending topup requests (for admin)
-- ============================================
CREATE OR REPLACE FUNCTION get_pending_zaika_topups()
RETURNS TABLE (
    id UUID,
    profile_id UUID,
    amount NUMERIC,
    status TEXT,
    created_at TIMESTAMPTZ,
    profile_full_name TEXT,
    profile_roll_number TEXT,
    profile_college_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID;
    v_role TEXT;
BEGIN
    -- Get current user's profile (support both auth patterns)
    SELECT p.id, p.role INTO v_profile_id, v_role
    FROM public.profiles p
    WHERE p.id = auth.uid() OR p.auth_user_id = auth.uid()
    LIMIT 1;
    
    -- Check if user is admin
    IF v_role NOT IN ('admin', 'faculty', 'coordinator') THEN
        RAISE EXCEPTION 'Permission denied: Admin role required';
    END IF;
    
    -- Return pending topups with profile info
    RETURN QUERY
    SELECT 
        t.id,
        t.profile_id,
        t.amount,
        t.status,
        t.created_at,
        p.full_name as profile_full_name,
        p.roll_number as profile_roll_number,
        p.college_email as profile_college_email
    FROM public.zaika_topup_requests t
    LEFT JOIN public.profiles p ON p.id = t.profile_id
    WHERE t.status = 'pending'
    ORDER BY t.created_at DESC;
END;
$$;

-- ============================================
-- 2. Function to get all transactions (for admin)
-- ============================================
CREATE OR REPLACE FUNCTION get_all_zaika_transactions(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
    id UUID,
    buyer_profile_id UUID,
    stall_id UUID,
    menu_item_id UUID,
    item_name TEXT,
    quantity INTEGER,
    amount NUMERIC,
    status TEXT,
    created_at TIMESTAMPTZ,
    buyer_name TEXT,
    buyer_roll TEXT,
    stall_name TEXT,
    stall_number INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID;
    v_role TEXT;
BEGIN
    -- Get current user's profile
    SELECT p.id, p.role INTO v_profile_id, v_role
    FROM public.profiles p
    WHERE p.id = auth.uid() OR p.auth_user_id = auth.uid()
    LIMIT 1;
    
    -- Check if user is admin
    IF v_role NOT IN ('admin', 'faculty') THEN
        RAISE EXCEPTION 'Permission denied: Admin role required';
    END IF;
    
    -- Return transactions with details
    RETURN QUERY
    SELECT 
        t.id,
        t.buyer_profile_id,
        t.stall_id,
        t.menu_item_id,
        t.item_name,
        t.quantity,
        t.amount,
        t.status,
        t.created_at,
        bp.full_name as buyer_name,
        bp.roll_number as buyer_roll,
        s.stall_name,
        s.stall_number
    FROM public.zaika_transactions t
    LEFT JOIN public.profiles bp ON bp.id = t.buyer_profile_id
    LEFT JOIN public.zaika_stalls s ON s.id = t.stall_id
    ORDER BY t.created_at DESC
    LIMIT p_limit;
END;
$$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION get_pending_zaika_topups() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_zaika_transactions(INTEGER) TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- ============================================
-- VERIFY
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ ZAIKA ADMIN FUNCTIONS CREATED';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions:';
    RAISE NOTICE '  • get_pending_zaika_topups() - Returns pending topups with user info';
    RAISE NOTICE '  • get_all_zaika_transactions(limit) - Returns all transactions';
    RAISE NOTICE '';
    RAISE NOTICE 'These functions bypass RLS and check admin role internally.';
    RAISE NOTICE '==========================================';
END $$;

-- Test the function (uncomment to test)
-- SELECT * FROM get_pending_zaika_topups();
