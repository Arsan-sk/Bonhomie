-- Fix global_settings to enforce single-row table
-- Issue: upsert creates new rows instead of updating existing row

-- Step 1: Drop existing table and recreate with proper singleton constraint
DROP TABLE IF EXISTS global_settings CASCADE;

CREATE TABLE global_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Enforce single row
    fest_name TEXT NOT NULL DEFAULT 'Bonhomie 2026',
    fest_start_date DATE NOT NULL,
    fest_duration_days INTEGER NOT NULL CHECK (fest_duration_days > 0 AND fest_duration_days <= 10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE global_settings IS 'Global festival configuration - SINGLETON TABLE (only one row allowed)';
COMMENT ON COLUMN global_settings.id IS 'Always 1 to enforce single row';
COMMENT ON COLUMN global_settings.fest_name IS 'Name of the festival (e.g., Bonhomie 2026)';
COMMENT ON COLUMN global_settings.fest_start_date IS 'Starting date of the festival';
COMMENT ON COLUMN global_settings.fest_duration_days IS 'Total number of days the festival runs';

-- Insert initial/default configuration
INSERT INTO global_settings (id, fest_name, fest_start_date, fest_duration_days)
VALUES (1, 'Bonhomie 2026', '2026-02-15', 3)
ON CONFLICT (id) DO UPDATE SET
    fest_name = EXCLUDED.fest_name,
    fest_start_date = EXCLUDED.fest_start_date,
    fest_duration_days = EXCLUDED.fest_duration_days,
    updated_at = NOW();

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_global_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_global_settings ON global_settings;
CREATE TRIGGER trigger_update_global_settings
    BEFORE UPDATE ON global_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_global_settings_updated_at();
