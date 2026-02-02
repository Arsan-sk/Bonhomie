-- FIX: Add Coordinator Assignments to Chat System
-- This fixes coordinators not seeing all their assigned event chats

-- ============================================
-- 1. Update Sync Function to Include event_assignments
-- ============================================

CREATE OR REPLACE FUNCTION public.sync_chat_system()
RETURNS void AS $$
BEGIN
  -- Step 1: Create chat rooms for all events
  INSERT INTO public.chat_rooms (event_id)
  SELECT id FROM public.events
  ON CONFLICT (event_id) DO NOTHING;

  -- Step 2a: Add faculty coordinators from events.faculty_coordinators JSONB
  INSERT INTO public.chat_members (chat_id, user_id, role)
  SELECT DISTINCT cr.id, (elem->>'id')::uuid, 'admin'::chat_member_role
  FROM public.events e
  CROSS JOIN jsonb_array_elements(e.faculty_coordinators) AS elem
  JOIN public.chat_rooms cr ON cr.event_id = e.id
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'id')::uuid)
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  -- Step 2b: Add coordinators from event_assignments table (THIS IS THE MISSING PART!)
  INSERT INTO public.chat_members (chat_id, user_id, role)
  SELECT DISTINCT cr.id, ea.coordinator_id, 'admin'::chat_member_role
  FROM public.event_assignments ea
  JOIN public.chat_rooms cr ON cr.event_id = ea.event_id
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = ea.coordinator_id)
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
-- 2. Update Trigger for New Coordinator Assignments
-- ============================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_chat_on_assignment ON public.event_assignments;

-- Create function to handle new assignments
CREATE OR REPLACE FUNCTION public.handle_new_coordinator_assignment()
RETURNS trigger AS $$
DECLARE
  chat_room_id uuid;
BEGIN
  -- Get the chat room for this event
  SELECT id INTO chat_room_id FROM public.chat_rooms WHERE event_id = NEW.event_id;
  
  -- If chat room exists, add the coordinator
  IF chat_room_id IS NOT NULL THEN
    INSERT INTO public.chat_members (chat_id, user_id, role)
    VALUES (chat_room_id, NEW.coordinator_id, 'admin'::chat_member_role)
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  ELSE
    -- If chat room doesn't exist, create it and add coordinator
    INSERT INTO public.chat_rooms (event_id)
    VALUES (NEW.event_id)
    RETURNING id INTO chat_room_id;
    
    -- Add the coordinator
    INSERT INTO public.chat_members (chat_id, user_id, role)
    VALUES (chat_room_id, NEW.coordinator_id, 'admin'::chat_member_role);
    
    -- Add all admins
    INSERT INTO public.chat_members (chat_id, user_id, role)
    SELECT chat_room_id, id, 'admin'::chat_member_role
    FROM public.profiles
    WHERE role = 'admin';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER sync_chat_on_assignment
  AFTER INSERT ON public.event_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_coordinator_assignment();

-- ============================================
-- 3. Re-run sync to add missing coordinator memberships
-- ============================================

SELECT public.sync_chat_system();

-- ============================================
-- 4. Verify Results
-- ============================================

-- Show total chat members by role
SELECT role, COUNT(*) as count FROM public.chat_members GROUP BY role;

-- Show a sample coordinator's chats (replace with actual coordinator ID to test)
-- SELECT e.name as event_name, cm.role
-- FROM public.chat_members cm
-- JOIN public.chat_rooms cr ON cr.id = cm.chat_id
-- JOIN public.events e ON e.id = cr.event_id
-- WHERE cm.user_id = '<COORDINATOR_PROFILE_ID>'
-- ORDER BY e.name;
