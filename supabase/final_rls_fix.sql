-- FINAL FIX: Eliminate Infinite Recursion with SECURITY DEFINER Functions
-- This script uses helper functions that bypass RLS to avoid recursion

-- ============================================
-- 1. Drop ALL existing problematic policies
-- ============================================

DROP POLICY IF EXISTS "Users can view their own chat memberships" ON public.chat_members;
DROP POLICY IF EXISTS "Users can insert into their own chat memberships" ON public.chat_members;
DROP POLICY IF EXISTS "System can insert chat memberships" ON public.chat_members;
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their chats" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view chat rooms they are members of" ON public.chat_rooms;

-- ============================================
-- 2. Create Helper Functions (SECURITY DEFINER to bypass RLS)
-- ============================================

-- Helper: Get profile ID for current auth user
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS uuid AS $$
DECLARE
  profile_id uuid;
BEGIN
  -- Try direct match first
  SELECT id INTO profile_id FROM public.profiles 
  WHERE id = auth.uid() LIMIT 1;
  
  -- If not found, try auth_user_id
  IF profile_id IS NULL THEN
    SELECT id INTO profile_id FROM public.profiles 
    WHERE auth_user_id = auth.uid() LIMIT 1;
  END IF;
  
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper: Check if user is member of a chat (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_chat_member_internal(p_chat_id uuid, p_profile_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE chat_id = p_chat_id AND user_id = p_profile_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 3. Create NEW Simple Policies (No Recursion)
-- ============================================

-- Chat Members: Simple policy using helper function
CREATE POLICY "chat_members_select_policy"
ON public.chat_members FOR SELECT
USING (
  user_id = public.get_current_profile_id()
);

CREATE POLICY "chat_members_insert_policy"
ON public.chat_members FOR INSERT
WITH CHECK (true);  -- Controlled by application logic and triggers

-- Chat Messages: Use helper function to check membership
CREATE POLICY "chat_messages_select_policy"
ON public.chat_messages FOR SELECT
USING (
  public.is_chat_member_internal(chat_id, public.get_current_profile_id())
);

CREATE POLICY "chat_messages_insert_policy"
ON public.chat_messages FOR INSERT
WITH CHECK (
  public.is_chat_member_internal(chat_id, public.get_current_profile_id())
  AND sender_id = public.get_current_profile_id()
);

-- Chat Rooms: Use helper function
CREATE POLICY "chat_rooms_select_policy"
ON public.chat_rooms FOR SELECT
USING (
  public.is_chat_member_internal(id, public.get_current_profile_id())
);

-- Message Status: Simple check
CREATE POLICY "message_status_select_policy"
ON public.message_status FOR SELECT
USING (
  user_id = public.get_current_profile_id()
);

CREATE POLICY "message_status_insert_policy"
ON public.message_status FOR INSERT
WITH CHECK (
  user_id = public.get_current_profile_id()
);

-- ============================================
-- 4. Grant Execute on Helper Functions
-- ============================================

GRANT EXECUTE ON FUNCTION public.get_current_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_member_internal(uuid, uuid) TO authenticated;

-- ============================================
-- 5. Verify policies are active
-- ============================================

SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('chat_members', 'chat_messages', 'chat_rooms', 'message_status')
ORDER BY tablename, policyname;
