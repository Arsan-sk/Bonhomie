-- Comprehensive schema alignment for events table
-- This ensures all columns exist with correct types

-- Add columns that might be missing from migrations
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS payment_mode TEXT CHECK (payment_mode IN ('cash', 'hybrid', 'online'));

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS upi_id TEXT;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS qr_code_path TEXT;

-- Fix rules column if it's wrong type (should be jsonb in base schema, but text in some instances)
-- Check current type first - if text, convert to jsonb
DO $$
BEGIN
    -- Try to alter if rules is currently text
    ALTER TABLE events ALTER COLUMN rules TYPE jsonb USING 
        CASE 
            WHEN rules IS NULL THEN NULL
            WHEN rules = '' THEN NULL
            ELSE jsonb_build_object('content', rules)
        END;
EXCEPTION
    WHEN others THEN
        -- If column doesn't exist or is already jsonb, just continue
        RAISE NOTICE 'Rules column already correct type or does not exist';
END $$;

-- Add comments for clarity
COMMENT ON COLUMN events.image_url IS 'Alternative image URL (for backward compatibility)';
COMMENT ON COLUMN events.payment_mode IS 'Payment mode: cash, hybrid, or online';
COMMENT ON COLUMN events.upi_id IS 'UPI ID for online payments';
COMMENT ON COLUMN events.qr_code_path IS 'Storage path for payment QR code';
