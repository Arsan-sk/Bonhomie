-- ============================================
-- Add Payment Mode Support to Registrations
-- Student Module Enhancement - Phase 2
-- ============================================

-- Add payment_mode column to registrations table
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'hybrid';

-- Add column comments for clarity
COMMENT ON COLUMN registrations.payment_mode IS 'Payment mode: cash, hybrid, or online';
COMMENT ON COLUMN registrations.transaction_id IS 'UPI transaction ID (required for hybrid/online modes)';
COMMENT ON COLUMN registrations.payment_screenshot_path IS 'Storage path for payment proof (hybrid mode only)';

-- Verify the changes
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'registrations'
AND column_name IN ('payment_mode', 'transaction_id', 'payment_screenshot_path', 'status')
ORDER BY ordinal_position;

-- Sample query to check payment modes distribution
SELECT 
    payment_mode,
    status,
    COUNT(*) as count
FROM registrations
GROUP BY payment_mode, status
ORDER BY payment_mode, status;
