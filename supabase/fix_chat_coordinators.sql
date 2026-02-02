-- Fixed Chat System Sync (Corrects Coordinator JSONB Extraction Bug)

-- ============================================
-- 1. Clear existing chat members (to re-sync cleanly)
-- ============================================
TRUNCATE TABLE public.chat_members;

-- ============================================
-- 2. Fixed Sync Function
-- ============================================

CREATE OR REPLACE FUNCTION public.sync_chat_system()
RETURNS void AS $$
BEGIN
  -- Step 1: Create chat rooms for all events
  INSERT INTO public.chat_rooms (event_id)
  SELECT id FROM public.events
  ON CONFLICT (event_id) DO NOTHING;

  -- Step 2: Add faculty coordinators to their assigned event chats
  -- Fixed JSONB extraction: faculty_coordinators is an array of objects like [{"id": "uuid", "name": "..."}]
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
-- 3. Update Trigger for Future Events
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
  
  -- Add faculty coordinators (fixed JSONB extraction)
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

-- ============================================
-- 4. Run the Fixed Sync
-- ============================================

SELECT public.sync_chat_system();

-- ============================================
-- 5. Verify the results
-- ============================================

-- This will show you how many chat rooms were created
SELECT COUNT(*) as total_chat_rooms FROM public.chat_rooms;

-- This will show you how many members were added
SELECT COUNT(*) as total_members FROM public.chat_members;

-- This will show the breakdown by role
SELECT role, COUNT(*) as count 
FROM public.chat_members 
GROUP BY role;
