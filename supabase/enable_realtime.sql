-- Enable Realtime for Chat Tables
-- This ensures real-time subscriptions work for chat messages

-- Enable replication for chat tables
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_members REPLICA IDENTITY FULL;
ALTER TABLE public.chat_rooms REPLICA IDENTITY FULL;

-- Verify realtime is enabled
-- You may need to enable realtime in Supabase Dashboard:
-- Go to Database > Replication > enable realtime for these tables:
-- - chat_messages
-- - chat_members  
-- - chat_rooms

-- Note: This SQL only sets REPLICA IDENTITY
-- You MUST also enable realtime in Supabase Dashboard > Database > Publications
