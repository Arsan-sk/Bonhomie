-- Add is_restricted column to chat_rooms
-- Default false (everyone can chat). If true, only admins/coordinators can send.

ALTER TABLE public.chat_rooms 
ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN DEFAULT FALSE;

-- Update RLS or Policy? 
-- Actually, we can handle the "can send" logic in the UI and maybe a trigger/policy, 
-- but for now, UI enforcement is the primary request to "reduce load".
-- A robust app would also add an RLS policy preventing INSERT to chat_messages if restricted AND user is not admin.
-- Let's do that for safety.

CREATE OR REPLACE FUNCTION check_chat_restriction() 
RETURNS TRIGGER AS $$
DECLARE
    v_is_restricted BOOLEAN;
    v_user_role TEXT; -- 'admin' or 'faculty'/'coordinator'
BEGIN
    -- Check if chat is restricted
    SELECT is_restricted INTO v_is_restricted FROM public.chat_rooms WHERE id = NEW.chat_id;
    
    IF v_is_restricted THEN
        -- Check sender role
        -- We need to join profiles.
        SELECT role INTO v_user_role FROM public.profiles WHERE id = NEW.sender_id;
        
        -- If not admin or coordinator, BLOCK
        IF v_user_role NOT IN ('admin', 'faculty', 'coordinator') THEN
            RAISE EXCEPTION 'This chat is currently restricted to Admins and Coordinators only.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger before insert on chat_messages
DROP TRIGGER IF EXISTS check_chat_restriction_trigger ON public.chat_messages;

CREATE TRIGGER check_chat_restriction_trigger
BEFORE INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION check_chat_restriction();
