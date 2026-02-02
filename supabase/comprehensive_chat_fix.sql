-- COMPREHENSIVE FIX: Update Foreign Keys + Sync Chat System
-- This script fixes the FK constraints and then syncs all data

-- ============================================
-- 1. Update Foreign Key Constraints
-- ============================================

-- Change chat_members.user_id to reference profiles instead of auth.users
ALTER TABLE public.chat_members
  DROP CONSTRAINT IF EXISTS chat_members_user_id_fkey;

ALTER TABLE public.chat_members
  ADD CONSTRAINT chat_members_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Change chat_messages.sender_id to reference profiles instead of auth.users
ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_sender_id_fkey
  FOREIGN KEY (sender_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- Change message_status.user_id to reference profiles instead of auth.users
ALTER TABLE public.message_status
  DROP CONSTRAINT IF EXISTS message_status_user_id_fkey;

ALTER TABLE public.message_status
  ADD CONSTRAINT message_status_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- ============================================
-- 2. Update RLS Policies to Work with Profiles
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own chat memberships" ON public.chat_members;
DROP POLICY IF EXISTS "Users can insert into their own chat memberships" ON public.chat_members;
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their chats" ON public.chat_messages;

-- Create new policies that work with both auth users and offline profiles
CREATE POLICY "Users can view their own chat memberships"
ON public.chat_members FOR SELECT
USING (
  -- Match by profile ID directly (for both online and offline profiles)
  user_id IN (
    SELECT id FROM public.profiles 
    WHERE id = auth.uid() OR auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert into their own chat memberships"
ON public.chat_members FOR INSERT
WITH CHECK (
  user_id IN (
    SELECT id FROM public.profiles 
    WHERE id = auth.uid() OR auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can view messages in their chats"
ON public.chat_messages FOR SELECT
USING (
  chat_id IN (
    SELECT chat_id FROM public.chat_members 
    WHERE user_id IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can send messages to their chats"
ON public.chat_messages FOR INSERT
WITH CHECK (
  chat_id IN (
    SELECT chat_id FROM public.chat_members 
    WHERE user_id IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
  )
);

-- ============================================
-- 3. Clear existing chat members (to re-sync cleanly)
-- ============================================
TRUNCATE TABLE public.chat_members CASCADE;

-- ============================================
-- 4. Fixed Sync Function
-- ============================================

CREATE OR REPLACE FUNCTION public.sync_chat_system()
RETURNS void AS $$
BEGIN
  -- Step 1: Create chat rooms for all events
  INSERT INTO public.chat_rooms (event_id)
  SELECT id FROM public.events
  ON CONFLICT (event_id) DO NOTHING;

  -- Step 2: Add faculty coordinators to their assigned event chats
  INSERT INTO public.chat_members (chat_id, user_id, role)
  SELECT DISTINCT cr.id, (elem->>'id')::uuid, 'admin'::chat_member_role
  FROM public.events e
  CROSS JOIN jsonb_array_elements(e.faculty_coordinators) AS elem
  JOIN public.chat_rooms cr ON cr.event_id = e.id
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'id')::uuid)
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  -- Step 3: Add all admin users to ALL chat rooms
  INSERT INTO public.chat_members (chat_id, user_id, role)
  SELECT cr.id, p.id, 'admin'::chat_member_role
  FROM public.profiles p
  CROSS JOIN public.chat_rooms cr
  WHERE p.role = 'admin'
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  -- Step 4: Add confirmed registrations (students) to their event chats
  INSERT INTO public.chat_members (chat_id, user_id, role)
  SELECT cr.id, r.profile_id, 'member'::chat_member_role
  FROM public.registrations r
  JOIN public.chat_rooms cr ON cr.event_id = r.event_id
  WHERE r.status = 'confirmed'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = r.profile_id)
  ON CONFLICT (chat_id, user_id) DO NOTHING;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Update Triggers
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_event_chat()
RETURNS trigger AS $$
DECLARE
  new_chat_id uuid;
BEGIN
  -- Create chat room
  INSERT INTO public.chat_rooms (event_id)
  VALUES (new.id)
  RETURNING id INTO new_chat_id;
  
  -- Add faculty coordinators
  IF new.faculty_coordinators IS NOT NULL AND jsonb_array_length(new.faculty_coordinators) > 0 THEN
    INSERT INTO public.chat_members (chat_id, user_id, role)
    SELECT new_chat_id, (elem->>'id')::uuid, 'admin'::chat_member_role
    FROM jsonb_array_elements(new.faculty_coordinators) AS elem
    WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'id')::uuid)
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;
  
  -- Add all admins
  INSERT INTO public.chat_members (chat_id, user_id, role)
  SELECT new_chat_id, id, 'admin'::chat_member_role
  FROM public.profiles
  WHERE role = 'admin'
  ON CONFLICT (chat_id, user_id) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_new_registration_chat_member()
RETURNS trigger AS $$
DECLARE
  chat_room_id uuid;
BEGIN
  IF new.status = 'confirmed' AND (old.status IS NULL OR old.status != 'confirmed') THEN
    SELECT id INTO chat_room_id FROM public.chat_rooms WHERE event_id = new.event_id;
    
    IF chat_room_id IS NOT NULL THEN
      INSERT INTO public.chat_members (chat_id, user_id, role)
      VALUES (chat_room_id, new.profile_id, 'member'::chat_member_role)
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END IF;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Run the Sync
-- ============================================

SELECT public.sync_chat_system();

-- ============================================
-- 7. Verify the results
-- ============================================

SELECT COUNT(*) as total_chat_rooms FROM public.chat_rooms;
SELECT COUNT(*) as total_members FROM public.chat_members;
SELECT role, COUNT(*) as count FROM public.chat_members GROUP BY role;
