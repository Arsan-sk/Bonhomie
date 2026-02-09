-- ============================================
-- ZAIKA DIGITAL WALLET SYSTEM
-- Migration Script for Supabase
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ZAIKA STALLS TABLE
-- Links team registrations to stalls with additional stall info
-- ============================================
CREATE TABLE IF NOT EXISTS public.zaika_stalls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE NOT NULL,
    stall_number INTEGER NOT NULL,
    stall_name TEXT,
    description TEXT,
    total_sales NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(registration_id),
    UNIQUE(stall_number)
);

-- ============================================
-- 2. ZAIKA MENU ITEMS TABLE
-- Food items listed by each stall
-- ============================================
CREATE TABLE IF NOT EXISTS public.zaika_menu_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    stall_id UUID REFERENCES public.zaika_stalls(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL CHECK (price > 0),
    image_url TEXT,
    description TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- 3. ZAIKA WALLETS TABLE
-- Buyer wallets with balance
-- ============================================
CREATE TABLE IF NOT EXISTS public.zaika_wallets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    balance NUMERIC DEFAULT 0 CHECK (balance >= 0),
    total_spent NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(profile_id)
);

-- ============================================
-- 4. ZAIKA TOP-UP REQUESTS TABLE
-- Requests to add money to wallet
-- ============================================
CREATE TABLE IF NOT EXISTS public.zaika_topup_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 50),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- 5. ZAIKA TRANSACTIONS TABLE
-- All payment transactions between buyers and stalls
-- ============================================
CREATE TABLE IF NOT EXISTS public.zaika_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    buyer_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    stall_id UUID REFERENCES public.zaika_stalls(id) ON DELETE CASCADE NOT NULL,
    menu_item_id UUID REFERENCES public.zaika_menu_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'rejected')),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_zaika_stalls_registration ON public.zaika_stalls(registration_id);
CREATE INDEX IF NOT EXISTS idx_zaika_menu_stall ON public.zaika_menu_items(stall_id);
CREATE INDEX IF NOT EXISTS idx_zaika_wallets_profile ON public.zaika_wallets(profile_id);
CREATE INDEX IF NOT EXISTS idx_zaika_topup_profile ON public.zaika_topup_requests(profile_id);
CREATE INDEX IF NOT EXISTS idx_zaika_topup_status ON public.zaika_topup_requests(status);
CREATE INDEX IF NOT EXISTS idx_zaika_transactions_buyer ON public.zaika_transactions(buyer_profile_id);
CREATE INDEX IF NOT EXISTS idx_zaika_transactions_stall ON public.zaika_transactions(stall_id);
CREATE INDEX IF NOT EXISTS idx_zaika_transactions_status ON public.zaika_transactions(status);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.zaika_stalls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zaika_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zaika_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zaika_topup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zaika_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: ZAIKA_STALLS
-- ============================================
CREATE POLICY "Anyone can view active stalls"
    ON public.zaika_stalls FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage all stalls"
    ON public.zaika_stalls FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Stall owners can update their stall"
    ON public.zaika_stalls FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.registrations r
            WHERE r.id = zaika_stalls.registration_id
            AND (
                r.profile_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM jsonb_array_elements(r.team_members) AS tm
                    WHERE (tm->>'id')::uuid = auth.uid()
                )
            )
        )
    );

-- ============================================
-- RLS POLICIES: ZAIKA_MENU_ITEMS
-- ============================================
CREATE POLICY "Anyone can view menu items"
    ON public.zaika_menu_items FOR SELECT
    USING (true);

CREATE POLICY "Stall owners can insert menu items"
    ON public.zaika_menu_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.zaika_stalls s
            JOIN public.registrations r ON r.id = s.registration_id
            WHERE s.id = zaika_menu_items.stall_id
            AND (
                r.profile_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM jsonb_array_elements(r.team_members) AS tm
                    WHERE (tm->>'id')::uuid = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Stall owners can update menu items"
    ON public.zaika_menu_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.zaika_stalls s
            JOIN public.registrations r ON r.id = s.registration_id
            WHERE s.id = zaika_menu_items.stall_id
            AND (
                r.profile_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM jsonb_array_elements(r.team_members) AS tm
                    WHERE (tm->>'id')::uuid = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Stall owners can delete menu items"
    ON public.zaika_menu_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.zaika_stalls s
            JOIN public.registrations r ON r.id = s.registration_id
            WHERE s.id = zaika_menu_items.stall_id
            AND (
                r.profile_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM jsonb_array_elements(r.team_members) AS tm
                    WHERE (tm->>'id')::uuid = auth.uid()
                )
            )
        )
    );

-- ============================================
-- RLS POLICIES: ZAIKA_WALLETS
-- ============================================
CREATE POLICY "Users can view own wallet"
    ON public.zaika_wallets FOR SELECT
    USING (profile_id = auth.uid());

CREATE POLICY "Users can create own wallet"
    ON public.zaika_wallets FOR INSERT
    WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admins can view all wallets"
    ON public.zaika_wallets FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty'))
    );

CREATE POLICY "System can update wallet balance"
    ON public.zaika_wallets FOR UPDATE
    USING (
        profile_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty'))
    );

-- ============================================
-- RLS POLICIES: ZAIKA_TOPUP_REQUESTS
-- ============================================
CREATE POLICY "Users can view own topup requests"
    ON public.zaika_topup_requests FOR SELECT
    USING (profile_id = auth.uid());

CREATE POLICY "Admin/Coordinator can view all topup requests"
    ON public.zaika_topup_requests FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty'))
    );

CREATE POLICY "Users can create topup requests"
    ON public.zaika_topup_requests FOR INSERT
    WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admin/Coordinator can update requests"
    ON public.zaika_topup_requests FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty'))
    );

-- ============================================
-- RLS POLICIES: ZAIKA_TRANSACTIONS
-- ============================================
CREATE POLICY "Buyers can view own transactions"
    ON public.zaika_transactions FOR SELECT
    USING (buyer_profile_id = auth.uid());

CREATE POLICY "Stall owners can view their stall transactions"
    ON public.zaika_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.zaika_stalls s
            JOIN public.registrations r ON r.id = s.registration_id
            WHERE s.id = zaika_transactions.stall_id
            AND (
                r.profile_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM jsonb_array_elements(r.team_members) AS tm
                    WHERE (tm->>'id')::uuid = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Admin can view all transactions"
    ON public.zaika_transactions FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty'))
    );

CREATE POLICY "Buyers can create transactions"
    ON public.zaika_transactions FOR INSERT
    WITH CHECK (buyer_profile_id = auth.uid());

CREATE POLICY "Buyers can cancel pending transactions"
    ON public.zaika_transactions FOR UPDATE
    USING (
        buyer_profile_id = auth.uid()
        AND status = 'pending'
    );

CREATE POLICY "Stall owners can update transaction status"
    ON public.zaika_transactions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.zaika_stalls s
            JOIN public.registrations r ON r.id = s.registration_id
            WHERE s.id = zaika_transactions.stall_id
            AND (
                r.profile_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM jsonb_array_elements(r.team_members) AS tm
                    WHERE (tm->>'id')::uuid = auth.uid()
                )
            )
        )
    );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if user is a Zaika stall owner
CREATE OR REPLACE FUNCTION is_zaika_stall_owner(user_profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    zaika_event_id UUID;
BEGIN
    -- Get Zaika event ID (event named 'Zaika')
    SELECT id INTO zaika_event_id FROM public.events WHERE LOWER(name) = 'zaika' LIMIT 1;
    
    IF zaika_event_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user is registered (as leader or team member) for Zaika
    RETURN EXISTS (
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
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's stall (if they are owner)
CREATE OR REPLACE FUNCTION get_my_zaika_stall(user_profile_id UUID)
RETURNS TABLE (
    stall_id UUID,
    stall_number INTEGER,
    stall_name TEXT,
    description TEXT,
    total_sales NUMERIC,
    registration_id UUID,
    is_active BOOLEAN
) AS $$
DECLARE
    zaika_event_id UUID;
BEGIN
    -- Get Zaika event ID
    SELECT id INTO zaika_event_id FROM public.events WHERE LOWER(name) = 'zaika' LIMIT 1;
    
    RETURN QUERY
    SELECT 
        s.id as stall_id,
        s.stall_number,
        s.stall_name,
        s.description,
        s.total_sales,
        s.registration_id,
        s.is_active
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

-- Function to get or create wallet for a user
CREATE OR REPLACE FUNCTION get_or_create_zaika_wallet(user_profile_id UUID)
RETURNS public.zaika_wallets AS $$
DECLARE
    wallet_record public.zaika_wallets;
BEGIN
    -- Try to get existing wallet
    SELECT * INTO wallet_record FROM public.zaika_wallets WHERE profile_id = user_profile_id;
    
    -- If not found, create one
    IF wallet_record IS NULL THEN
        INSERT INTO public.zaika_wallets (profile_id, balance)
        VALUES (user_profile_id, 0)
        RETURNING * INTO wallet_record;
    END IF;
    
    RETURN wallet_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve topup request
CREATE OR REPLACE FUNCTION approve_zaika_topup(request_id UUID, approver_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    req RECORD;
BEGIN
    -- Get the request
    SELECT * INTO req FROM public.zaika_topup_requests WHERE id = request_id AND status = 'pending';
    
    IF req IS NULL THEN
        RAISE EXCEPTION 'Request not found or already processed';
    END IF;
    
    -- Update request status
    UPDATE public.zaika_topup_requests
    SET status = 'approved', approved_by = approver_id, approved_at = now()
    WHERE id = request_id;
    
    -- Add balance to wallet (create if doesn't exist)
    INSERT INTO public.zaika_wallets (profile_id, balance)
    VALUES (req.profile_id, req.amount)
    ON CONFLICT (profile_id) DO UPDATE
    SET balance = zaika_wallets.balance + req.amount,
        updated_at = now();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject topup request
CREATE OR REPLACE FUNCTION reject_zaika_topup(request_id UUID, rejector_id UUID, reason TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.zaika_topup_requests
    SET status = 'rejected', 
        approved_by = rejector_id, 
        approved_at = now(),
        rejection_reason = reason
    WHERE id = request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or already processed';
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a food purchase transaction
CREATE OR REPLACE FUNCTION create_zaika_purchase(
    p_buyer_id UUID,
    p_stall_id UUID,
    p_menu_item_id UUID,
    p_quantity INTEGER
)
RETURNS UUID AS $$
DECLARE
    menu_item RECORD;
    wallet_record RECORD;
    total NUMERIC;
    new_transaction_id UUID;
    zaika_event_id UUID;
    buyer_is_stall_owner BOOLEAN;
BEGIN
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
    IF is_zaika_stall_owner(p_buyer_id) THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept/complete a transaction
CREATE OR REPLACE FUNCTION complete_zaika_transaction(p_transaction_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    txn RECORD;
BEGIN
    -- Get transaction
    SELECT * INTO txn FROM public.zaika_transactions WHERE id = p_transaction_id AND status = 'pending';
    IF txn IS NULL THEN
        RAISE EXCEPTION 'Transaction not found or not pending';
    END IF;
    
    -- Mark as completed
    UPDATE public.zaika_transactions
    SET status = 'completed', completed_at = now()
    WHERE id = p_transaction_id;
    
    -- Add to stall's total sales
    UPDATE public.zaika_stalls
    SET total_sales = total_sales + txn.total_amount, updated_at = now()
    WHERE id = txn.stall_id;
    
    -- Update buyer's total spent
    UPDATE public.zaika_wallets
    SET total_spent = total_spent + txn.total_amount
    WHERE profile_id = txn.buyer_profile_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel a transaction (by buyer) - refund
CREATE OR REPLACE FUNCTION cancel_zaika_transaction(p_transaction_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    txn RECORD;
BEGIN
    -- Get transaction
    SELECT * INTO txn FROM public.zaika_transactions WHERE id = p_transaction_id AND status = 'pending';
    IF txn IS NULL THEN
        RAISE EXCEPTION 'Transaction not found or not pending';
    END IF;
    
    -- Mark as cancelled
    UPDATE public.zaika_transactions
    SET status = 'cancelled'
    WHERE id = p_transaction_id;
    
    -- Refund to buyer's wallet
    UPDATE public.zaika_wallets
    SET balance = balance + txn.total_amount, updated_at = now()
    WHERE profile_id = txn.buyer_profile_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject a transaction (by stall) - refund
CREATE OR REPLACE FUNCTION reject_zaika_transaction(p_transaction_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    txn RECORD;
BEGIN
    -- Get transaction
    SELECT * INTO txn FROM public.zaika_transactions WHERE id = p_transaction_id AND status = 'pending';
    IF txn IS NULL THEN
        RAISE EXCEPTION 'Transaction not found or not pending';
    END IF;
    
    -- Mark as rejected
    UPDATE public.zaika_transactions
    SET status = 'rejected'
    WHERE id = p_transaction_id;
    
    -- Refund to buyer's wallet
    UPDATE public.zaika_wallets
    SET balance = balance + txn.total_amount, updated_at = now()
    WHERE profile_id = txn.buyer_profile_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get stall leaderboard
CREATE OR REPLACE FUNCTION get_zaika_leaderboard()
RETURNS TABLE (
    rank BIGINT,
    stall_id UUID,
    stall_number INTEGER,
    stall_name TEXT,
    leader_name TEXT,
    leader_roll_number TEXT,
    total_sales NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY s.total_sales DESC) as rank,
        s.id as stall_id,
        s.stall_number,
        COALESCE(s.stall_name, p.full_name || '''s Stall') as stall_name,
        p.full_name as leader_name,
        p.roll_number as leader_roll_number,
        s.total_sales
    FROM public.zaika_stalls s
    JOIN public.registrations r ON r.id = s.registration_id
    JOIN public.profiles p ON p.id = r.profile_id
    WHERE s.is_active = true
    ORDER BY s.total_sales DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all stalls with details (for buyers to browse)
CREATE OR REPLACE FUNCTION get_all_zaika_stalls()
RETURNS TABLE (
    stall_id UUID,
    stall_number INTEGER,
    stall_name TEXT,
    description TEXT,
    leader_name TEXT,
    menu_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as stall_id,
        s.stall_number,
        COALESCE(s.stall_name, p.full_name || '''s Stall') as stall_name,
        s.description,
        p.full_name as leader_name,
        (SELECT COUNT(*) FROM public.zaika_menu_items m WHERE m.stall_id = s.id AND m.is_available = true) as menu_count
    FROM public.zaika_stalls s
    JOIN public.registrations r ON r.id = s.registration_id
    JOIN public.profiles p ON p.id = r.profile_id
    WHERE s.is_active = true
    ORDER BY s.stall_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Auto-create stalls for Zaika registrations
-- ============================================

CREATE OR REPLACE FUNCTION auto_create_zaika_stall()
RETURNS TRIGGER AS $$
DECLARE
    zaika_event_id UUID;
    next_stall_number INTEGER;
    leader_name TEXT;
BEGIN
    -- Only proceed if status changed to 'confirmed'
    IF NEW.status != 'confirmed' THEN
        RETURN NEW;
    END IF;
    
    -- Check if this is a Zaika event registration
    SELECT id INTO zaika_event_id FROM public.events WHERE LOWER(name) = 'zaika' LIMIT 1;
    
    IF zaika_event_id IS NULL OR NEW.event_id != zaika_event_id THEN
        RETURN NEW;
    END IF;
    
    -- Only create stall for team leaders (those with team_members array)
    IF NEW.team_members IS NULL OR jsonb_array_length(NEW.team_members) = 0 THEN
        RETURN NEW;
    END IF;
    
    -- Check if stall already exists
    IF EXISTS (SELECT 1 FROM public.zaika_stalls WHERE registration_id = NEW.id) THEN
        RETURN NEW;
    END IF;
    
    -- Get next stall number
    SELECT COALESCE(MAX(stall_number), 0) + 1 INTO next_stall_number FROM public.zaika_stalls;
    
    -- Get leader name for default stall name
    SELECT full_name INTO leader_name FROM public.profiles WHERE id = NEW.profile_id;
    
    -- Create stall
    INSERT INTO public.zaika_stalls (registration_id, stall_number, stall_name)
    VALUES (NEW.id, next_stall_number, leader_name || '''s Stall');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_zaika_registration_confirmed ON public.registrations;

CREATE TRIGGER on_zaika_registration_confirmed
    AFTER INSERT OR UPDATE ON public.registrations
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_zaika_stall();

-- ============================================
-- ENABLE REALTIME FOR ZAIKA TABLES
-- ============================================
-- Note: Run these in Supabase Dashboard > Database > Replication
-- Or use the following:

ALTER PUBLICATION supabase_realtime ADD TABLE public.zaika_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.zaika_topup_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.zaika_wallets;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT ALL ON public.zaika_stalls TO authenticated;
GRANT ALL ON public.zaika_menu_items TO authenticated;
GRANT ALL ON public.zaika_wallets TO authenticated;
GRANT ALL ON public.zaika_topup_requests TO authenticated;
GRANT ALL ON public.zaika_transactions TO authenticated;

GRANT EXECUTE ON FUNCTION is_zaika_stall_owner TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_zaika_stall TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_zaika_wallet TO authenticated;
GRANT EXECUTE ON FUNCTION approve_zaika_topup TO authenticated;
GRANT EXECUTE ON FUNCTION reject_zaika_topup TO authenticated;
GRANT EXECUTE ON FUNCTION create_zaika_purchase TO authenticated;
GRANT EXECUTE ON FUNCTION complete_zaika_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_zaika_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION reject_zaika_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION get_zaika_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_zaika_stalls TO authenticated;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Zaika schema created successfully!';
    RAISE NOTICE 'Tables: zaika_stalls, zaika_menu_items, zaika_wallets, zaika_topup_requests, zaika_transactions';
    RAISE NOTICE 'Functions: is_zaika_stall_owner, get_my_zaika_stall, get_or_create_zaika_wallet, etc.';
    RAISE NOTICE 'Trigger: auto_create_zaika_stall (creates stall when Zaika registration is confirmed)';
END $$;
