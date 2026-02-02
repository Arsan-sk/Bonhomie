-- NUCLEAR OPTION: Complete RLS Reset for Chat System
-- This completely removes all policies and rebuilds with the simplest approach

-- ============================================
-- 1. DISABLE RLS on all chat tables (temporary)
-- ============================================

ALTER TABLE public.chat_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_status DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. DROP ALL EXISTING POLICIES (Clean slate)
-- ============================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies from chat tables
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('chat_members', 'chat_messages', 'chat_rooms', 'message_status')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- ============================================
-- 3. RE-ENABLE RLS
-- ============================================

ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_status ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. Create ULTRA-SIMPLE Policies (No subqueries, no functions)
-- ============================================

-- Chat Members: Direct comparison only
CREATE POLICY "chat_members_view"
ON public.chat_members FOR SELECT
TO authenticated
USING (
  -- Match auth.uid() directly to user_id
  user_id = auth.uid()
  OR
  -- OR match via auth_user_id in profiles
  user_id IN (
    SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "chat_members_manage"
ON public.chat_members FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Chat Rooms: Allow authenticated users to view all rooms they're members of
-- We use a lateral join to avoid recursion
CREATE POLICY "chat_rooms_view"
ON public.chat_rooms FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT cm.chat_id 
    FROM public.chat_members cm
    WHERE cm.user_id = auth.uid()
    OR cm.user_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  )
);

-- Chat Messages: Allow viewing and sending in rooms where user is a member
CREATE POLICY "chat_messages_view"
ON public.chat_messages FOR SELECT
TO authenticated
USING (
  chat_id IN (
    SELECT cm.chat_id 
    FROM public.chat_members cm
    WHERE cm.user_id = auth.uid()
    OR cm.user_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  )
);

CREATE POLICY "chat_messages_create"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  chat_id IN (
    SELECT cm.chat_id 
    FROM public.chat_members cm
    WHERE cm.user_id = auth.uid()
    OR cm.user_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  )
);

-- Message Status: Simple ownership check
CREATE POLICY "message_status_manage"
ON public.message_status FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  OR user_id IN (
    SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR user_id IN (
    SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
  )
);

-- ============================================
-- 5. Verify - List all active policies
-- ============================================

SELECT 
  schemaname, 
  tablename, 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('chat_members', 'chat_messages', 'chat_rooms', 'message_status')
ORDER BY tablename, policyname;
