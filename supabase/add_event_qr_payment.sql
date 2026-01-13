-- Add QR code path column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS qr_code_path TEXT;

-- Add comment
COMMENT ON COLUMN events.qr_code_path IS 'Storage path for payment QR code image';

-- Add payment mode column if not exists (should already exist from earlier migration)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'hybrid' CHECK (payment_mode IN ('cash', 'hybrid', 'online'));

-- Add comment
COMMENT ON COLUMN events.payment_mode IS 'Payment acceptance mode: cash, hybrid (cash+online), or online';
