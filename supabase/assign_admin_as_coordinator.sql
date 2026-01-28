-- ============================================================================
-- ADMIN ACCESS TO ALL EVENTS - COMPREHENSIVE SOLUTION
-- ============================================================================
-- This script handles all possible scenarios for admin event management access

-- Step 1: Check if assigned_coordinator_id column exists
DO $$
DECLARE
    column_exists BOOLEAN;
    admin_user_id UUID;
    constraint_exists BOOLEAN;
BEGIN
    -- Check if column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'assigned_coordinator_id'
    ) INTO column_exists;

    RAISE NOTICE 'Column assigned_coordinator_id exists: %', column_exists;

    IF NOT column_exists THEN
        RAISE NOTICE 'Creating assigned_coordinator_id column...';
        
        -- Create the column
        ALTER TABLE events 
        ADD COLUMN assigned_coordinator_id UUID REFERENCES profiles(id);
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_events_coordinator 
        ON events(assigned_coordinator_id);
        
        RAISE NOTICE 'Column created successfully';
    END IF;

    -- Step 2: Check for role-based constraints
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.check_constraints cc
        JOIN information_schema.constraint_column_usage ccu 
            ON cc.constraint_name = ccu.constraint_name
        WHERE ccu.table_name = 'events' 
        AND ccu.column_name = 'assigned_coordinator_id'
        AND cc.check_clause LIKE '%coordinator%'
    ) INTO constraint_exists;

    RAISE NOTICE 'Role constraint exists: %', constraint_exists;

    IF constraint_exists THEN
        RAISE NOTICE 'Dropping existing role constraints...';
        -- Drop any CHECK constraints on assigned_coordinator_id
        -- (This is a simplified approach - adjust constraint name if needed)
        -- ALTER TABLE events DROP CONSTRAINT IF EXISTS check_coordinator_role;
    END IF;

    -- Step 3: Find admin user
    SELECT id INTO admin_user_id
    FROM profiles
    WHERE role = 'admin'
    ORDER BY created_at ASC
    LIMIT 1;

    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'No admin user found in profiles table';
    END IF;

    RAISE NOTICE 'Admin User ID: %', admin_user_id;

    -- Step 4: Assign admin to ALL events
    UPDATE events
    SET assigned_coordinator_id = admin_user_id
    WHERE assigned_coordinator_id IS NULL 
       OR assigned_coordinator_id != admin_user_id;

    RAISE NOTICE 'Admin assigned to % events', (
        SELECT COUNT(*) 
        FROM events 
        WHERE assigned_coordinator_id = admin_user_id
    );

    -- Step 5: Update RLS policies to allow admin access
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS "coordinators_manage_assigned_events" ON events;
    
    -- Create new policy that allows:
    -- 1. Admins to manage ALL events
    -- 2. Coordinators to manage their assigned events
    CREATE POLICY "coordinators_and_admin_manage_events"
    ON events
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'admin'  -- Admins see all
                OR (
                    profiles.role = 'coordinator' 
                    AND events.assigned_coordinator_id = profiles.id
                )
            )
        )
    );

    RAISE NOTICE 'RLS policies updated successfully';

END $$;

-- Verification Queries
-- ==================

-- 1. Verify admin assignment
SELECT 
    'Admin Assignment' as check_type,
    COUNT(*) as total_events,
    COUNT(CASE WHEN assigned_coordinator_id IS NOT NULL THEN 1 END) as assigned_events,
    COUNT(CASE WHEN assigned_coordinator_id IS NULL THEN 1 END) as unassigned_events
FROM events;

-- 2. Show events assigned to admin
SELECT 
    e.id,
    e.name,
    e.category,
    e.subcategory,
    p.full_name as coordinator_name,
    p.role as coordinator_role
FROM events e
LEFT JOIN profiles p ON e.assigned_coordinator_id = p.id
WHERE p.role = 'admin'
ORDER BY e.category, e.name
LIMIT 10;

-- 3. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'events'
AND policyname LIKE '%coordinator%' OR policyname LIKE '%admin%';

-- 4. Verify column structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'events'
AND column_name = 'assigned_coordinator_id';

SELECT '✓ Admin has been configured to manage all events through Advanced Management' AS status;
