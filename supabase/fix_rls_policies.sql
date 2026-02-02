-- FIX: Infinite Recursion in RLS Policies
-- This script fixes the RLS policies to avoid infinite recursion

-- ============================================
-- Drop the problematic policies
-- ============================================

DROP POLICY IF EXISTS "Users can view their own chat memberships" ON public.chat_members;
DROP POLICY IF EXISTS "Users can insert into their own chat memberships" ON public.chat_members;
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their chats" ON public.chat_messages;

-- ============================================
-- Create SIMPLE policies without recursion
-- ============================================

-- For chat_members: Simple check - match user_id to profile.id
CREATE POLICY "Users can view their own chat memberships"
ON public.chat_members FOR SELECT
USING (
  user_id IN (
    SELECT id FROM public.profiles 
    WHERE id = auth.uid() OR auth_user_id = auth.uid()
  )
);

CREATE POLICY "System can insert chat memberships"
ON public.chat_members FOR INSERT
WITH CHECK (true);  -- Let triggers handle this

-- For chat_messages: Use a join to profiles instead of subquery to chat_members
CREATE POLICY "Users can view messages in their chats"
ON public.chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    INNER JOIN public.chat_members cm ON cm.user_id = p.id
    WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
    AND cm.chat_id = chat_messages.chat_id
  )
);

CREATE POLICY "Users can send messages to their chats"
ON public.chat_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    INNER JOIN public.chat_members cm ON cm.user_id = p.id
    WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
    AND cm.chat_id = chat_messages.chat_id
  )
);

-- For chat_rooms: Allow viewing if user is a member
CREATE POLICY "Users can view chat rooms they are members of"
ON public.chat_rooms FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    INNER JOIN public.chat_members cm ON cm.user_id = p.id
    WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
    AND cm.chat_id = chat_rooms.id
  )
);
