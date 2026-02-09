-- ============================================
-- ZAIKA TOPUP REQUESTS RLS FIX
-- ============================================
-- Problem: Admin can't see pending topup requests because RLS policy
-- only checks profile.id = auth.uid() but admins may have 
-- profile.auth_user_id = auth.uid() (admin-created profiles)
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own topup requests" ON public.zaika_topup_requests;
DROP POLICY IF EXISTS "Admin/Coordinator can view all topup requests" ON public.zaika_topup_requests;
DROP POLICY IF EXISTS "Users can create topup requests" ON public.zaika_topup_requests;
DROP POLICY IF EXISTS "Admin/Coordinator can update requests" ON public.zaika_topup_requests;

-- Also fix wallet policies
DROP POLICY IF EXISTS "Users can view own wallet" ON public.zaika_wallets;
DROP POLICY IF EXISTS "Users can create own wallet" ON public.zaika_wallets;
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.zaika_wallets;
DROP POLICY IF EXISTS "System can update wallet balance" ON public.zaika_wallets;

-- ============================================
-- RECREATE TOPUP REQUEST POLICIES
-- ============================================

-- Users can view own topup requests (support both profile types)
CREATE POLICY "Users can view own topup requests"
    ON public.zaika_topup_requests FOR SELECT
    USING (
        profile_id IN (
            SELECT id FROM public.profiles 
            WHERE id = auth.uid() OR auth_user_id = auth.uid()
        )
    );

-- Admin/Coordinator can view ALL topup requests (support both profile types)
CREATE POLICY "Admin/Coordinator can view all topup requests"
    ON public.zaika_topup_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (id = auth.uid() OR auth_user_id = auth.uid()) 
            AND role IN ('admin', 'faculty', 'coordinator')
        )
    );

-- Users can create topup requests (support both profile types)
CREATE POLICY "Users can create topup requests"
    ON public.zaika_topup_requests FOR INSERT
    WITH CHECK (
        profile_id IN (
            SELECT id FROM public.profiles 
            WHERE id = auth.uid() OR auth_user_id = auth.uid()
        )
    );

-- Admin/Coordinator can update requests (support both profile types)
CREATE POLICY "Admin/Coordinator can update requests"
    ON public.zaika_topup_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (id = auth.uid() OR auth_user_id = auth.uid()) 
            AND role IN ('admin', 'faculty', 'coordinator')
        )
    );

-- ============================================
-- RECREATE WALLET POLICIES
-- ============================================

-- Users can view own wallet (support both profile types)
CREATE POLICY "Users can view own wallet"
    ON public.zaika_wallets FOR SELECT
    USING (
        profile_id IN (
            SELECT id FROM public.profiles 
            WHERE id = auth.uid() OR auth_user_id = auth.uid()
        )
    );

-- Users can create own wallet (support both profile types)
CREATE POLICY "Users can create own wallet"
    ON public.zaika_wallets FOR INSERT
    WITH CHECK (
        profile_id IN (
            SELECT id FROM public.profiles 
            WHERE id = auth.uid() OR auth_user_id = auth.uid()
        )
    );

-- Admins can view all wallets (support both profile types)
CREATE POLICY "Admins can view all wallets"
    ON public.zaika_wallets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (id = auth.uid() OR auth_user_id = auth.uid()) 
            AND role IN ('admin', 'faculty')
        )
    );

-- System can update wallet balance (support both profile types)
CREATE POLICY "System can update wallet balance"
    ON public.zaika_wallets FOR UPDATE
    USING (
        profile_id IN (
            SELECT id FROM public.profiles 
            WHERE id = auth.uid() OR auth_user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (id = auth.uid() OR auth_user_id = auth.uid()) 
            AND role IN ('admin', 'faculty')
        )
    );

-- ============================================
-- FIX TRANSACTIONS POLICIES TOO
-- ============================================
DROP POLICY IF EXISTS "Buyers can view own transactions" ON public.zaika_transactions;
DROP POLICY IF EXISTS "Admin can view all transactions" ON public.zaika_transactions;

-- Buyers can view own transactions (support both profile types)
CREATE POLICY "Buyers can view own transactions"
    ON public.zaika_transactions FOR SELECT
    USING (
        buyer_profile_id IN (
            SELECT id FROM public.profiles 
            WHERE id = auth.uid() OR auth_user_id = auth.uid()
        )
    );

-- Admin can view all transactions
CREATE POLICY "Admin can view all transactions"
    ON public.zaika_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (id = auth.uid() OR auth_user_id = auth.uid()) 
            AND role IN ('admin', 'faculty')
        )
    );

-- ============================================
-- VERIFY
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ ZAIKA RLS POLICIES FIXED';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Updated policies for:';
    RAISE NOTICE '  • zaika_topup_requests (4 policies)';
    RAISE NOTICE '  • zaika_wallets (4 policies)';
    RAISE NOTICE '  • zaika_transactions (2 policies)';
    RAISE NOTICE '';
    RAISE NOTICE 'Now supports both profile types:';
    RAISE NOTICE '  • Self-registered: profile.id = auth.uid()';
    RAISE NOTICE '  • Admin-created: profile.auth_user_id = auth.uid()';
    RAISE NOTICE '==========================================';
END $$;

-- Test query: Check if policies allow access (run as admin)
-- SELECT COUNT(*) FROM zaika_topup_requests WHERE status = 'pending';
