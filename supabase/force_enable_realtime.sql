-- ENFORCE Realtime Replication for Chat Messages
-- This is critical for the "no refresh needed" functionality

BEGIN;

-- 1. Ensure the publication exists (Supabase usually has 'supabase_realtime')
-- If not, create it. If it exists, we'll add tables to it.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
    END IF;
END
$$;

-- 2. Add chat tables to the publication (if not already added via "ALL TABLES")
-- Explicitly alerting replica identity to FULL is best practice for realtime
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_members REPLICA IDENTITY FULL;
ALTER TABLE public.chat_rooms REPLICA IDENTITY FULL;

-- 3. Explicitly add to publication if publication was not created as "FOR ALL TABLES"
-- (Safe to run even if already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;

COMMIT;
