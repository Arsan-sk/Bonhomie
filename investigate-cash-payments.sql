-- ================================================================
-- CASH PAYMENT INVESTIGATION
-- Find all cash payments and identify the source of revenue
-- ================================================================

-- 1. List all cash payments with full details
SELECT 
    r.id AS registration_id,
    r.registered_at,
    p.roll_number,
    p.full_name,
    p.is_admin_created,
    e.name AS event_name,
    e.subcategory AS event_type,
    e.fee AS event_fee,
    r.payment_mode,
    r.status,
    CASE 
        WHEN r.team_members IS NOT NULL AND jsonb_array_length(r.team_members) > 0 
        THEN 'Team Leader'
        ELSE 'Individual/Member'
    END AS participant_type,
    CASE 
        WHEN r.team_members IS NOT NULL AND jsonb_array_length(r.team_members) > 0 
        THEN jsonb_array_length(r.team_members) + 1
        ELSE 1
    END AS team_size
FROM registrations r
LEFT JOIN profiles p ON r.profile_id = p.id
LEFT JOIN events e ON r.event_id = e.id
WHERE r.payment_mode = 'cash'
    AND r.status = 'confirmed'
ORDER BY r.registered_at DESC;

-- 2. Calculate total revenue (team-aware)
-- This matches the logic in AdminAnalytics
WITH cash_regs AS (
    SELECT 
        r.id,
        r.profile_id,
        r.event_id,
        r.team_members,
        e.fee
    FROM registrations r
    LEFT JOIN events e ON r.event_id = e.id
    WHERE r.payment_mode = 'cash'
        AND r.status = 'confirmed'
)
SELECT 
    COUNT(*) AS total_cash_registrations,
    SUM(CASE 
        WHEN team_members IS NOT NULL AND jsonb_array_length(team_members) > 0 
        THEN fee
        ELSE fee
    END) AS total_revenue_simple,
    -- Note: This simple calculation will OVER-COUNT if team members exist
    -- Proper calculation requires checking if profile_id appears in other team_members
    '₹' || SUM(fee) AS total_shown_if_all_counted
FROM cash_regs;

-- 3. Breakdown by event
SELECT 
    e.name AS event_name,
    e.subcategory AS event_type,
    e.fee,
    COUNT(*) AS num_registrations,
    SUM(e.fee) AS revenue_if_all_counted,
    STRING_AGG(p.full_name || ' (' || p.roll_number || ')', ', ') AS participants
FROM registrations r
LEFT JOIN events e ON r.event_id = e.id
LEFT JOIN profiles p ON r.profile_id = p.id
WHERE r.payment_mode = 'cash'
    AND r.status = 'confirmed'
GROUP BY e.name, e.subcategory, e.fee
ORDER BY e.name;

-- 4. Check for team members (who might be double-counted)
SELECT 
    r1.id AS member_registration_id,
    p1.roll_number AS member_roll,
    p1.full_name AS member_name,
    e1.name AS event_name,
    p2.roll_number AS leader_roll,
    p2.full_name AS leader_name
FROM registrations r1
JOIN profiles p1 ON r1.profile_id = p1.id
JOIN events e1 ON r1.event_id = e1.id
JOIN registrations r2 ON r1.event_id = r2.event_id
JOIN profiles p2 ON r2.profile_id = p2.id
WHERE r1.payment_mode = 'cash'
    AND r1.status = 'confirmed'
    AND r2.team_members IS NOT NULL
    AND r2.team_members::jsonb @> jsonb_build_array(jsonb_build_object('id', r1.profile_id))
ORDER BY e1.name, p2.full_name;

-- 5. ANSWER: Who paid ₹60 and for which event?
-- This shows complete breakdown
SELECT 
    'CASH PAYMENT BREAKDOWN' AS report_section,
    '' AS details
UNION ALL
SELECT 
    '========================',
    ''
UNION ALL
SELECT 
    CONCAT('Registration ID: ', r.id::text),
    CONCAT('Participant: ', p.full_name, ' (', p.roll_number, ')')
FROM registrations r
LEFT JOIN profiles p ON r.profile_id = p.id
WHERE r.payment_mode = 'cash'
    AND r.status = 'confirmed'
UNION ALL
SELECT 
    CONCAT('Event: ', e.name),
    CONCAT('Fee: ₹', e.fee::text)
FROM registrations r
LEFT JOIN events e ON r.event_id = e.id
WHERE r.payment_mode = 'cash'
    AND r.status = 'confirmed'
UNION ALL
SELECT 
    CONCAT('Type: ', 
        CASE 
            WHEN r.team_members IS NOT NULL AND jsonb_array_length(r.team_members) > 0 
            THEN 'Team Leader (Team size: ' || (jsonb_array_length(r.team_members) + 1)::text || ')'
            ELSE 'Individual'
        END),
    CONCAT('Registered: ', r.registered_at::date::text)
FROM registrations r
WHERE r.payment_mode = 'cash'
    AND r.status = 'confirmed';

-- 6. Summary: Expected vs Actual
SELECT 
    COUNT(*) AS total_cash_records,
    COUNT(DISTINCT r.profile_id) AS unique_participants,
    SUM(e.fee) AS total_if_all_counted,
    COUNT(CASE WHEN r.team_members IS NOT NULL AND jsonb_array_length(r.team_members) > 0 THEN 1 END) AS team_leaders,
    COUNT(CASE WHEN r.team_members IS NULL OR jsonb_array_length(r.team_members) = 0 THEN 1 END) AS individuals_or_members
FROM registrations r
LEFT JOIN events e ON r.event_id = e.id
WHERE r.payment_mode = 'cash'
    AND r.status = 'confirmed';
