-- Enable realtime on chat_members table for instant notification updates
-- Run this in Supabase SQL Editor

-- Add chat_members to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_members;

-- Verify realtime is enabled
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
