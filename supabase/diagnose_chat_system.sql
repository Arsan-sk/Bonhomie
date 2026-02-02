-- ============================================
-- DIAGNOSTIC: Check Chat System State
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Check if chat_rooms exist
SELECT 'chat_rooms' as table_name, COUNT(*) as count FROM public.chat_rooms;

-- 2. Check if chat_members exist
SELECT 'chat_members' as table_name, COUNT(*) as count FROM public.chat_members;

-- 3. Check if chat_messages exist
SELECT 'chat_messages' as table_name, COUNT(*) as count FROM public.chat_messages;

-- 4. Check chat_members breakdown by role
SELECT 
  role, 
  COUNT(*) as count 
FROM public.chat_members 
GROUP BY role;

-- 5. Check a sample of chat_members with profile info
SELECT 
  cm.id as member_id,
  cm.user_id as profile_id,
  p.full_name,
  p.role as profile_role,
  cm.last_read_at,
  cr.event_id
FROM public.chat_members cm
JOIN public.profiles p ON p.id = cm.user_id
JOIN public.chat_rooms cr ON cr.id = cm.chat_id
LIMIT 10;

-- 6. Check if profiles have auth_user_id set (for offline profiles)
SELECT 
  id,
  full_name,
  role,
  auth_user_id,
  CASE 
    WHEN auth_user_id IS NOT NULL THEN 'Has auth link'
    ELSE 'No auth link (self-registered or offline without login)'
  END as auth_status
FROM public.profiles
LIMIT 20;

-- 7. Test the get_current_profile_id function
-- (This will return NULL if run as service role, but will show if function exists)
SELECT public.get_current_profile_id() as current_profile_id;

-- 8. Check recent messages with unread potential
SELECT 
  m.id,
  m.chat_id,
  m.content,
  m.created_at,
  e.name as event_name
FROM public.chat_messages m
JOIN public.chat_rooms cr ON cr.id = m.chat_id
JOIN public.events e ON e.id = cr.event_id
ORDER BY m.created_at DESC
LIMIT 10;

-- 9. Check members' last_read_at vs latest messages
SELECT 
  cm.user_id as profile_id,
  p.full_name,
  cm.chat_id,
  cm.last_read_at,
  MAX(msg.created_at) as latest_message,
  COUNT(msg.id) FILTER (WHERE msg.created_at > COALESCE(cm.last_read_at, '1970-01-01')) as unread_count
FROM public.chat_members cm
JOIN public.profiles p ON p.id = cm.user_id
LEFT JOIN public.chat_messages msg ON msg.chat_id = cm.chat_id
GROUP BY cm.user_id, p.full_name, cm.chat_id, cm.last_read_at
HAVING COUNT(msg.id) FILTER (WHERE msg.created_at > COALESCE(cm.last_read_at, '1970-01-01')) > 0
LIMIT 20;
