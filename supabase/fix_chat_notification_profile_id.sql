-- ============================================
-- FIX: Chat Notification Functions to use Profile ID
-- ============================================
-- Problem: Functions use auth.uid() directly to query chat_members,
-- but chat_members.user_id stores profiles.id
-- For offline profiles: profile.id ≠ auth.uid() (linked via auth_user_id)
-- ============================================

-- Helper function to get current user's profile ID
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_id uuid;
BEGIN
  -- First try: profile.id = auth.uid() (self-registered users)
  SELECT id INTO profile_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- If not found, try: profile.auth_user_id = auth.uid() (offline profiles with auth)
  IF profile_id IS NULL THEN
    SELECT id INTO profile_id
    FROM public.profiles
    WHERE auth_user_id = auth.uid();
  END IF;
  
  RETURN profile_id;
END;
$$;

-- ============================================
-- FIXED: get_my_chats_summary
-- ============================================
DROP FUNCTION IF EXISTS public.get_my_chats_summary();

CREATE OR REPLACE FUNCTION public.get_my_chats_summary()
RETURNS TABLE (
  chat_id uuid,
  event_id uuid,
  event_name text,
  event_category text,
  unread_count bigint,
  last_message_content text,
  last_message_time timestamp with time zone
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  current_profile_id uuid;
BEGIN
  -- Get the current user's profile ID
  current_profile_id := public.get_current_profile_id();
  
  -- If no profile found, return empty
  IF current_profile_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH user_chats AS (
    SELECT 
      cm.chat_id, 
      COALESCE(cm.last_read_at, '1970-01-01'::timestamptz) AS last_read
    FROM public.chat_members cm
    WHERE cm.user_id = current_profile_id
  ),
  chat_stats AS (
    SELECT 
      m.chat_id,
      COUNT(*) AS unread
    FROM public.chat_messages m
    JOIN user_chats uc ON m.chat_id = uc.chat_id
    WHERE m.created_at > uc.last_read
      AND m.sender_id != current_profile_id  -- Exclude own messages from unread count
    GROUP BY m.chat_id
  ),
  last_msgs AS (
    SELECT DISTINCT ON (m.chat_id) 
      m.chat_id, 
      m.content, 
      m.created_at
    FROM public.chat_messages m
    JOIN user_chats uc ON m.chat_id = uc.chat_id
    ORDER BY m.chat_id, m.created_at DESC
  )
  SELECT 
    cr.id AS chat_id,
    e.id AS event_id,
    e.name::text AS event_name,
    e.category::text AS event_category,
    COALESCE(cs.unread, 0)::bigint AS unread_count,
    COALESCE(lm.content, '')::text AS last_message_content,
    lm.created_at AS last_message_time
  FROM public.chat_rooms cr
  JOIN public.events e ON cr.event_id = e.id
  JOIN user_chats uc ON cr.id = uc.chat_id
  LEFT JOIN chat_stats cs ON cr.id = cs.chat_id
  LEFT JOIN last_msgs lm ON cr.id = lm.chat_id
  ORDER BY lm.created_at DESC NULLS LAST;
END;
$$;

-- ============================================
-- FIXED: mark_chat_read
-- ============================================
DROP FUNCTION IF EXISTS public.mark_chat_read(uuid);

CREATE OR REPLACE FUNCTION public.mark_chat_read(p_chat_id uuid)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  current_profile_id uuid;
BEGIN
  -- Get the current user's profile ID
  current_profile_id := public.get_current_profile_id();
  
  IF current_profile_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.chat_members
  SET last_read_at = NOW()
  WHERE chat_id = p_chat_id
  AND user_id = current_profile_id;
END;
$$;

-- ============================================
-- Grant Execute Permissions
-- ============================================
GRANT EXECUTE ON FUNCTION public.get_current_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_chats_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_chat_read(uuid) TO authenticated;

-- ============================================
-- Verify the fix
-- ============================================
-- Run this to test (replace with actual auth.uid if testing):
-- SELECT * FROM public.get_my_chats_summary();
