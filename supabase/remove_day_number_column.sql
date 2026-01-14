-- Remove redundant day_number column from events table
-- Keep only day_order column (which stores the numeric day value)

-- Step 1: Check if day_number column exists and drop it
DO $$
BEGIN
    -- Check if column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'day_number'
    ) THEN
        -- Drop the redundant column
        ALTER TABLE events DROP COLUMN day_number;
        RAISE NOTICE 'Successfully dropped day_number column';
    ELSE
        RAISE NOTICE 'day_number column does not exist - nothing to drop';
    END IF;
END $$;

-- Step 2: Ensure day_order column exists and has correct constraints
ALTER TABLE events 
ALTER COLUMN day_order SET NOT NULL;

-- Step 3: Verify the schema
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'events'
AND column_name IN ('day', 'day_order')
ORDER BY column_name;

-- Expected result:
-- day        | text    | NO  | (stores 'Day 1', 'Day 2', etc.)
-- day_order  | integer | NO  | (stores 1, 2, 3, etc.)

COMMENT ON COLUMN events.day IS 'Festival day label (e.g., Day 1, Day 2)';
COMMENT ON COLUMN events.day_order IS 'Numeric day order for sorting (1, 2, 3, etc.)';
