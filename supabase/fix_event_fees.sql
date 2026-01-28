-- ============================================================================
-- FIX EVENT FEES BASED ON SUBCATEGORY
-- Individual events should have fee = 30
-- Group events should have fee = 60
-- ============================================================================

-- Step 1: Check current fee distribution
-- This query shows which events have incorrect fees
SELECT 
    name,
    category,
    subcategory,
    fee,
    CASE 
        WHEN subcategory = 'Individual' THEN 30
        WHEN subcategory = 'Group' THEN 60
    END as expected_fee,
    CASE 
        WHEN subcategory = 'Individual' AND fee != 30 THEN 'INCORRECT'
        WHEN subcategory = 'Group' AND fee != 60 THEN 'INCORRECT'
        ELSE 'CORRECT'
    END as fee_status
FROM public.events
ORDER BY category, subcategory, name;

-- Step 2: Count events with incorrect fees
SELECT 
    subcategory,
    COUNT(*) as total_events,
    COUNT(CASE WHEN subcategory = 'Individual' AND fee != 30 THEN 1 END) as individual_incorrect,
    COUNT(CASE WHEN subcategory = 'Group' AND fee != 60 THEN 1 END) as group_incorrect
FROM public.events
GROUP BY subcategory;

-- Step 3: Update Individual events to fee = 30
UPDATE public.events
SET fee = 30, updated_at = NOW()
WHERE subcategory = 'Individual' AND fee != 30;

-- Step 4: Update Group events to fee = 60
UPDATE public.events
SET fee = 60, updated_at = NOW()
WHERE subcategory = 'Group' AND fee != 60;

-- Step 5: Verify all fees are now correct
SELECT 
    category,
    subcategory,
    COUNT(*) as event_count,
    MIN(fee) as min_fee,
    MAX(fee) as max_fee,
    CASE 
        WHEN subcategory = 'Individual' AND MIN(fee) = 30 AND MAX(fee) = 30 THEN '✓ CORRECT'
        WHEN subcategory = 'Group' AND MIN(fee) = 60 AND MAX(fee) = 60 THEN '✓ CORRECT'
        ELSE '✗ INCORRECT'
    END as status
FROM public.events
GROUP BY category, subcategory
ORDER BY category, subcategory;

-- Step 6: Final verification - List all events with their fees
SELECT 
    id,
    name,
    category,
    subcategory,
    fee,
    CASE 
        WHEN subcategory = 'Individual' AND fee = 30 THEN '✓'
        WHEN subcategory = 'Group' AND fee = 60 THEN '✓'
        ELSE '✗'
    END as correct
FROM public.events
ORDER BY category, subcategory, name;

-- ============================================================================
-- ADD TEAM LEADER/CAPTAIN RULE TO ALL GROUP EVENTS
-- ============================================================================

-- Step 7: Check current rules for Group events
SELECT 
    name,
    category,
    subcategory,
    rules,
    CASE 
        WHEN rules::text LIKE '%person registering%' OR rules::text LIKE '%team leader%' OR rules::text LIKE '%captain%' THEN 'HAS RULE'
        ELSE 'MISSING RULE'
    END as leader_rule_status
FROM public.events
WHERE subcategory = 'Group'
ORDER BY category, name;

-- Step 8: Add team leader rule to all Group events that don't have it
-- The rule will be added to the beginning of the rules array
UPDATE public.events
SET 
    rules = CASE 
        -- If rules is null or empty array, create new array with the rule
        WHEN rules IS NULL OR rules::text = '[]' THEN 
            jsonb_build_array('The person registering the team will be considered the Team Leader/Captain and will be the primary point of contact for all event communications.')
        -- If rules exists and doesn't already mention team leader/captain
        WHEN rules::text NOT LIKE '%person registering%' 
            AND rules::text NOT LIKE '%team leader%' 
            AND rules::text NOT LIKE '%captain%' THEN
            jsonb_build_array('The person registering the team will be considered the Team Leader/Captain and will be the primary point of contact for all event communications.') || rules
        -- Otherwise keep rules as is
        ELSE rules
    END,
    updated_at = NOW()
WHERE subcategory = 'Group';

-- Step 9: Verify team leader rule was added to all Group events
SELECT 
    name,
    category,
    subcategory,
    rules,
    CASE 
        WHEN rules::text LIKE '%person registering%' OR rules::text LIKE '%team leader%' OR rules::text LIKE '%Captain%' THEN '✓ HAS RULE'
        ELSE '✗ MISSING RULE'
    END as leader_rule_status
FROM public.events
WHERE subcategory = 'Group'
ORDER BY category, name;

-- Step 10: Summary - Count Group events with team leader rule
SELECT 
    COUNT(*) as total_group_events,
    COUNT(CASE WHEN rules::text LIKE '%person registering%' OR rules::text LIKE '%team leader%' OR rules::text LIKE '%Captain%' THEN 1 END) as events_with_leader_rule,
    COUNT(CASE WHEN rules::text NOT LIKE '%person registering%' AND rules::text NOT LIKE '%team leader%' AND rules::text NOT LIKE '%Captain%' THEN 1 END) as events_without_leader_rule
FROM public.events
WHERE subcategory = 'Group';
