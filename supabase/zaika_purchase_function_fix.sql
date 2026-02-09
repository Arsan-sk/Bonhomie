-- ============================================
-- ROBUST FIX: Purchase function for all profile types
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Drop ALL possible versions of the function
DROP FUNCTION IF EXISTS public.create_zaika_purchase(UUID, UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS public.create_zaika_purchase(p_buyer_id UUID, p_stall_id UUID, p_menu_item_id UUID, p_quantity INTEGER);

-- Step 2: Create the function with explicit schema
CREATE OR REPLACE FUNCTION public.create_zaika_purchase(
    p_buyer_id UUID,
    p_stall_id UUID,
    p_menu_item_id UUID,
    p_quantity INTEGER DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    menu_item RECORD;
    wallet_record RECORD;
    total NUMERIC;
    new_transaction_id UUID;
    zaika_event_id UUID;
    buyer_is_stall_owner BOOLEAN;
BEGIN
    -- Validate inputs
    IF p_buyer_id IS NULL THEN
        RAISE EXCEPTION 'Buyer ID is required';
    END IF;
    
    IF p_stall_id IS NULL THEN
        RAISE EXCEPTION 'Stall ID is required';
    END IF;
    
    IF p_menu_item_id IS NULL THEN
        RAISE EXCEPTION 'Menu item ID is required';
    END IF;
    
    IF p_quantity IS NULL OR p_quantity < 1 THEN
        RAISE EXCEPTION 'Quantity must be at least 1';
    END IF;

    -- Check if buyer is trying to buy from their own stall
    SELECT id INTO zaika_event_id FROM public.events WHERE LOWER(name) = 'zaika' LIMIT 1;
    
    SELECT EXISTS (
        SELECT 1 FROM public.zaika_stalls s
        JOIN public.registrations r ON r.id = s.registration_id
        WHERE s.id = p_stall_id
        AND (
            r.profile_id = p_buyer_id
            OR EXISTS (
                SELECT 1 FROM jsonb_array_elements(r.team_members) AS tm
                WHERE (tm->>'id')::uuid = p_buyer_id
            )
        )
    ) INTO buyer_is_stall_owner;
    
    IF buyer_is_stall_owner THEN
        RAISE EXCEPTION 'Cannot purchase from your own stall';
    END IF;
    
    -- Check if buyer is a stall owner (cannot buy from any stall)
    IF public.is_zaika_stall_owner(p_buyer_id) THEN
        RAISE EXCEPTION 'Stall owners cannot make purchases';
    END IF;

    -- Get menu item
    SELECT * INTO menu_item FROM public.zaika_menu_items WHERE id = p_menu_item_id AND is_available = true;
    IF menu_item IS NULL THEN
        RAISE EXCEPTION 'Menu item not found or unavailable';
    END IF;
    
    -- Verify menu item belongs to the stall
    IF menu_item.stall_id != p_stall_id THEN
        RAISE EXCEPTION 'Menu item does not belong to this stall';
    END IF;
    
    -- Calculate total
    total := menu_item.price * p_quantity;
    
    -- Get wallet and check balance
    SELECT * INTO wallet_record FROM public.zaika_wallets WHERE profile_id = p_buyer_id;
    IF wallet_record IS NULL OR wallet_record.balance < total THEN
        RAISE EXCEPTION 'Insufficient balance. Required: %, Available: %', total, COALESCE(wallet_record.balance, 0);
    END IF;
    
    -- Deduct from wallet immediately
    UPDATE public.zaika_wallets
    SET balance = balance - total, updated_at = now()
    WHERE profile_id = p_buyer_id;
    
    -- Create transaction
    INSERT INTO public.zaika_transactions (
        buyer_profile_id, stall_id, menu_item_id,
        item_name, quantity, unit_price, total_amount, status
    )
    VALUES (
        p_buyer_id, p_stall_id, p_menu_item_id,
        menu_item.name, p_quantity, menu_item.price, total, 'pending'
    )
    RETURNING id INTO new_transaction_id;
    
    RETURN new_transaction_id;
END;
$$;

-- Step 3: Grant permissions explicitly
GRANT EXECUTE ON FUNCTION public.create_zaika_purchase(UUID, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_zaika_purchase(UUID, UUID, UUID, INTEGER) TO anon;

-- Step 4: Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

-- Step 5: Verify function exists
SELECT 
    routine_name,
    routine_schema,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'create_zaika_purchase'
AND routine_schema = 'public';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ create_zaika_purchase function created successfully!';
    RAISE NOTICE '✅ SECURITY DEFINER enabled - works with all profile types';
    RAISE NOTICE '✅ Explicit schema (public) set - PostgREST will find it';
    RAISE NOTICE '✅ Permissions granted to authenticated and anon';
    RAISE NOTICE '🔄 Schema cache reload notification sent';
END $$;
