-- Global Fest Settings Table
-- This table stores festival configuration for dynamic date calculation

CREATE TABLE IF NOT EXISTS global_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fest_name TEXT NOT NULL DEFAULT 'Bonhomie 2026',
    fest_start_date DATE NOT NULL,
    fest_duration_days INTEGER NOT NULL CHECK (fest_duration_days > 0 AND fest_duration_days <= 10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE global_settings IS 'Global festival configuration for dynamic date management';
COMMENT ON COLUMN global_settings.fest_name IS 'Name of the festival (e.g., Bonhomie 2026)';
COMMENT ON COLUMN global_settings.fest_start_date IS 'Starting date of the festival';
COMMENT ON COLUMN global_settings.fest_duration_days IS 'Total number of days the festival runs';

-- Insert initial configuration
INSERT INTO global_settings (fest_name, fest_start_date, fest_duration_days)
VALUES ('Bonhomie 2026', '2026-02-15', 3)
ON CONFLICT (id) DO NOTHING;

-- Add day_number column to events table if it doesn't exist
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS day_number INTEGER CHECK (day_number >= 1);

-- Add comment
COMMENT ON COLUMN events.day_number IS 'Day number of the event (1 = first day, 2 = second day, etc.)';

-- Update existing events to have day_number based on day_order (if it exists)
-- This migration assumes day_order currently holds values like 1, 2, 3
UPDATE events 
SET day_number = day_order::INTEGER 
WHERE day_number IS NULL AND day_order IS NOT NULL;

-- If day_order doesn't exist or is text-based, set default to 1
UPDATE events 
SET day_number = 1 
WHERE day_number IS NULL;

-- Add NOT NULL constraint after populating
ALTER TABLE events 
ALTER COLUMN day_number SET NOT NULL;
