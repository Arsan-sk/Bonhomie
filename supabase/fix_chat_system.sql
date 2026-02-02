-- Fix Chat System Foreign Keys and Membership Logic
-- This addresses:
-- 1. Offline profiles (profiles without auth.users entries)
-- 2. Adding coordinators to chat rooms
-- 3. Adding admins to all chat rooms

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
-- 2. Update Sync Function
-- ============================================

CREATE OR REPLACE FUNCTION public.sync_chat_system()
RETURNS void AS $$
DECLARE
  evt record;
  coord_id text;
  admin_profile record;
BEGIN
  -- Step 1: Create chat rooms for all events
  INSERT INTO public.chat_rooms (event_id)
  SELECT id FROM public.events
  ON CONFLICT (event_id) DO NOTHING;

  -- Step 2: Add faculty coordinators to their assigned event chats
  FOR evt IN SELECT id, faculty_coordinators FROM public.events LOOP
    -- Extract coordinator IDs from JSONB array
    FOR coord_id IN 
      SELECT jsonb_array_elements_text(evt.faculty_coordinators::jsonb->'id')
    LOOP
      INSERT INTO public.chat_members (chat_id, user_id, role)
      SELECT cr.id, coord_id::uuid, 'admin'
      FROM public.chat_rooms cr
      WHERE cr.event_id = evt.id
      AND EXISTS (SELECT 1 FROM public.profiles WHERE id = coord_id::uuid)
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Step 3: Add all admin users to ALL chat rooms
  FOR admin_profile IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
    INSERT INTO public.chat_members (chat_id, user_id, role)
    SELECT cr.id, admin_profile.id, 'admin'
    FROM public.chat_rooms cr
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END LOOP;

  -- Step 4: Add confirmed registrations (students) to their event chats
  INSERT INTO public.chat_members (chat_id, user_id, role)
  SELECT cr.id, r.profile_id, 'member'
  FROM public.registrations r
  JOIN public.chat_rooms cr ON cr.event_id = r.event_id
  WHERE r.status = 'confirmed'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = r.profile_id)
  ON CONFLICT (chat_id, user_id) DO NOTHING;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Update Trigger for Future Registrations
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_registration_chat_member()
RETURNS trigger AS $$
DECLARE
  chat_room_id uuid;
BEGIN
  -- Only act if status is confirmed
  IF new.status = 'confirmed' AND (old.status IS NULL OR old.status != 'confirmed') THEN
    -- Find chat room for this event
    SELECT id INTO chat_room_id FROM public.chat_rooms WHERE event_id = new.event_id;
    
    IF chat_room_id IS NOT NULL THEN
      -- Add user to chat members (will only succeed if profile exists)
      INSERT INTO public.chat_members (chat_id, user_id, role)
      VALUES (chat_room_id, new.profile_id, 'member')
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END IF;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Update Trigger for New Events
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_event_chat()
RETURNS trigger AS $$
DECLARE
  new_chat_id uuid;
  coord_id text;
  admin_profile record;
BEGIN
  -- Create chat room
  INSERT INTO public.chat_rooms (event_id)
  VALUES (new.id)
  RETURNING id INTO new_chat_id;
  
  -- Add faculty coordinators
  IF new.faculty_coordinators IS NOT NULL THEN
    FOR coord_id IN 
      SELECT jsonb_array_elements_text(new.faculty_coordinators::jsonb->'id')
    LOOP
      INSERT INTO public.chat_members (chat_id, user_id, role)
      VALUES (new_chat_id, coord_id::uuid, 'admin')
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END LOOP;
  END IF;
  
  -- Add all admins
  FOR admin_profile IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
    INSERT INTO public.chat_members (chat_id, user_id, role)
    VALUES (new_chat_id, admin_profile.id, 'admin')
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END LOOP;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Run Initial Sync
-- ============================================

SELECT public.sync_chat_system();
