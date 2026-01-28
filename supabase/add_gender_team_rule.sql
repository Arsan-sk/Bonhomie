-- ============================================================================
-- ADD GENDER-SEGREGATED TEAM RULE FOR SPORTS GROUP EVENTS ONLY
-- This adds rule as 2nd rule ONLY for Sports category group events with both genders
-- Also removes the rule from any non-Sports events if mistakenly added before
-- ============================================================================

-- Step 1: REMOVE the gender-segregated rule from ALL non-Sports group events
-- (Cleanup any mistakes from previous run)
UPDATE events
SET 
    rules = (
        SELECT jsonb_agg(rule)
        FROM jsonb_array_elements(rules) AS rule
        WHERE rule::text NOT LIKE '%gender-segregated%'
            AND rule::text NOT LIKE '%Boys teams cannot include%'
    ),
    updated_at = NOW()
WHERE subcategory = 'Group'
    AND category != 'Sports'
    AND (rules::text LIKE '%gender-segregated%' OR rules::text LIKE '%Boys teams cannot include%');

-- Step 2: Check which SPORTS group events will get the rule
SELECT 
    id,
    name,
    category,
    subcategory,
    allowed_genders,
    CASE 
        WHEN allowed_genders IS NULL THEN 'All genders (NULL)'
        WHEN 'Male' = ANY(allowed_genders) AND 'Female' = ANY(allowed_genders) THEN 'Both Male & Female'
        WHEN 'Male' = ANY(allowed_genders) THEN 'Male only'
        WHEN 'Female' = ANY(allowed_genders) THEN 'Female only'
        ELSE 'Other'
    END as gender_restriction,
    jsonb_array_length(rules) as current_rules_count
FROM events
WHERE category = 'Sports'
    AND subcategory = 'Group'
    AND (
        allowed_genders IS NULL 
        OR ('Male' = ANY(allowed_genders) AND 'Female' = ANY(allowed_genders))
    )
ORDER BY name;

-- Step 3: First, remove the gender rule from Sports events if it exists anywhere
-- (So we can re-add it at the correct position)
UPDATE events
SET 
    rules = (
        SELECT jsonb_agg(rule)
        FROM jsonb_array_elements(rules) AS rule
        WHERE rule::text NOT LIKE '%gender-segregated%'
            AND rule::text NOT LIKE '%Boys teams cannot include%'
    ),
    updated_at = NOW()
WHERE category = 'Sports'
    AND subcategory = 'Group'
    AND (
        allowed_genders IS NULL 
        OR ('Male' = ANY(allowed_genders) AND 'Female' = ANY(allowed_genders))
    )
    AND (rules::text LIKE '%gender-segregated%' OR rules::text LIKE '%Boys teams cannot include%');

-- Step 4: Add the gender-segregated team rule as 2nd rule ONLY for Sports
UPDATE events
SET 
    rules = CASE
        -- If rules array exists and has at least 1 element
        WHEN jsonb_array_length(rules) >= 1 THEN
            -- Insert new rule at position 1 (becomes 2nd rule, after team leader rule at position 0)
            jsonb_insert(
                rules,
                '{1}',
                '"Teams must be gender-segregated: Boys teams cannot include any female members, and Girls teams cannot include any male members"'::jsonb
            )
        -- If rules is empty or null
        ELSE
            jsonb_build_array('Teams must be gender-segregated: Boys teams cannot include any female members, and Girls teams cannot include any male members')
    END,
    updated_at = NOW()
WHERE category = 'Sports'
    AND subcategory = 'Group'
    AND (
        allowed_genders IS NULL 
        OR ('Male' = ANY(allowed_genders) AND 'Female' = ANY(allowed_genders))
    );

-- Step 5: Verify Sports events have the rule at position 2
SELECT 
    name,
    category,
    subcategory,
    allowed_genders,
    rules->0 as rule_1_team_leader,
    rules->1 as rule_2_gender_segregation,
    jsonb_array_length(rules) as total_rules
FROM events
WHERE category = 'Sports'
    AND subcategory = 'Group'
    AND (
        allowed_genders IS NULL 
        OR ('Male' = ANY(allowed_genders) AND 'Female' = ANY(allowed_genders))
    )
ORDER BY name;

-- Step 6: Verify non-Sports group events DO NOT have the rule
SELECT 
    name,
    category,
    subcategory,
    CASE 
        WHEN rules::text LIKE '%gender-segregated%' THEN '✗ SHOULD NOT HAVE'
        ELSE '✓ CORRECT'
    END as status,
    jsonb_array_length(rules) as total_rules
FROM events
WHERE subcategory = 'Group'
    AND category != 'Sports'
ORDER BY category, name;

-- Step 7: Summary count
SELECT 
    'Sports Group Events' as event_type,
    COUNT(*) as total_events,
    COUNT(CASE WHEN rules::text LIKE '%gender-segregated%' THEN 1 END) as with_gender_rule
FROM events
WHERE category = 'Sports'
    AND subcategory = 'Group'
    AND (
        allowed_genders IS NULL 
        OR ('Male' = ANY(allowed_genders) AND 'Female' = ANY(allowed_genders))
    )
UNION ALL
SELECT 
    'Non-Sports Group Events' as event_type,
    COUNT(*) as total_events,
    COUNT(CASE WHEN rules::text LIKE '%gender-segregated%' THEN 1 END) as with_gender_rule
FROM events
WHERE category != 'Sports'
    AND subcategory = 'Group';

SELECT 'Gender-segregated rule added ONLY to Sports group events as Rule #2. Removed from all other events.' AS status;
