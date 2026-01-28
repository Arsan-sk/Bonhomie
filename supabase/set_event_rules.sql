-- SET DEFAULT RULES FOR ALL EVENTS
-- This updates the rules column for individual and team events

-- ============================================
-- INDIVIDUAL EVENT RULES
-- ============================================
UPDATE events
SET rules = '[
    "Each student can participate in multiple individual events unless specified otherwise",
    "All registrations must be completed before the deadline",
    "Participants must carry their college ID card",
    "Report to venue at least 15 minutes before start time",
    "Any form of cheating or unfair means will result in immediate disqualification",
    "Maintain decorum and show respect to all participants, judges, and organizers",
    "Participants are responsible for their own equipment",
    "Judge''s decision is final and binding",
    "Fighting or aggressive behavior will result in instant disqualification",
    "Consumption of alcohol or drugs is strictly forbidden"
]'::jsonb
WHERE max_team_size = 1 OR max_team_size IS NULL;

-- ============================================
-- TEAM/GROUP EVENT RULES
-- ============================================
UPDATE events
SET rules = '[
    "The person registering the team will be considered the Team Leader/Captain and will be the primary point of contact for all event communications",
    "Teams must adhere to the minimum and maximum team size requirements",
    "Each student can participate in only ONE team per group event",
    "All team members must be registered before the deadline",
    "Team Leader is responsible for coordinating with all team members and event organizers",
    "All team members must be currently enrolled students with valid IDs",
    "No member substitutions allowed after registration except medical emergencies (with proper documentation)",
    "All team members must participate actively - no proxy participation",
    "Any cheating or unfair means will result in team disqualification",
    "Entire team must report 20 minutes before start time",
    "Teams are responsible for their own equipment",
    "Fighting or violence by any member will disqualify the entire team",
    "One registration fee per team - payment must be verified",
    "Judge''s decision is final and binding",
    "Consumption of alcohol or drugs is strictly forbidden"
]'::jsonb
WHERE max_team_size > 1;

-- ============================================
-- VERIFICATION
-- ============================================
-- Check individual events
SELECT 
    id,
    name,
    max_team_size,
    jsonb_array_length(rules) as rules_count,
    rules
FROM events
WHERE max_team_size = 1 OR max_team_size IS NULL
ORDER BY name;

-- Check team events
SELECT 
    id,
    name,
    max_team_size,
    jsonb_array_length(rules) as rules_count,
    rules
FROM events
WHERE max_team_size > 1
ORDER BY name;

SELECT 'Event rules have been set successfully!' AS status;
