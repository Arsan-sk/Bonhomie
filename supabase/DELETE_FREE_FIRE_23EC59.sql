-- ============================================
-- DELETE SPECIFIC EVENT REGISTRATION
-- Roll Number: 23ec59
-- Event: Free Fire
-- ============================================

-- Step 1: Show what will be deleted (PREVIEW)
DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'DELETION PREVIEW';
    RAISE NOTICE '====================================';
END $$;

-- Show the profile
SELECT 
    '👤 PROFILE' as section,
    id as profile_id,
    roll_number,
    full_name,
    college_email
FROM profiles 
WHERE LOWER(roll_number) = LOWER('23ec59');

-- Show the event
SELECT 
    '🎮 EVENT' as section,
    id as event_id,
    name,
    category,
    subcategory
FROM events 
WHERE LOWER(name) LIKE '%free%fire%';

-- Show registrations to be deleted
SELECT 
    '🗑️ REGISTRATIONS TO DELETE' as section,
    r.id as registration_id,
    p.roll_number,
    p.full_name,
    e.name as event_name,
    r.team_members,
    r.status,
    r.registered_at
FROM registrations r
JOIN profiles p ON p.id = r.profile_id
JOIN events e ON e.id = r.event_id
WHERE LOWER(p.roll_number) = LOWER('23ec59')
  AND LOWER(e.name) LIKE '%free%fire%';

-- ============================================
-- Step 2: ACTUAL DELETION
-- ⚠️ Uncomment the DELETE statement below to execute
-- ============================================

/*
-- DELETE THE REGISTRATION
DELETE FROM registrations 
WHERE id IN (
    SELECT r.id
    FROM registrations r
    JOIN profiles p ON p.id = r.profile_id
    JOIN events e ON e.id = r.event_id
    WHERE LOWER(p.roll_number) = LOWER('23ec59')
      AND LOWER(e.name) LIKE '%free%fire%'
);
*/

-- ============================================
-- Step 3: VERIFICATION (after deletion)
-- ============================================

-- Check if registration still exists
SELECT 
    '✓ VERIFICATION' as section,
    COUNT(*) as remaining_registrations,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Successfully deleted'
        ELSE '❌ Still exists'
    END as status
FROM registrations r
JOIN profiles p ON p.id = r.profile_id
JOIN events e ON e.id = r.event_id
WHERE LOWER(p.roll_number) = LOWER('23ec59')
  AND LOWER(e.name) LIKE '%free%fire%';

-- Show all remaining registrations for this user
SELECT 
    '📋 USER''S OTHER REGISTRATIONS' as section,
    e.name as event_name,
    r.status,
    r.registered_at
FROM registrations r
JOIN profiles p ON p.id = r.profile_id
JOIN events e ON e.id = r.event_id
WHERE LOWER(p.roll_number) = LOWER('23ec59')
ORDER BY r.registered_at DESC;

-- ============================================
-- INSTRUCTIONS
-- ============================================

/*
HOW TO USE:

1. PREVIEW MODE (Default):
   - Run this script as-is
   - It will show you what will be deleted
   - No actual deletion happens

2. DELETE MODE:
   - Uncomment the DELETE statement (lines 53-63)
   - Run the script again
   - This will actually delete the registration

3. VERIFICATION:
   - Check the verification section output
   - Should show "Successfully deleted"
   - Other registrations for this user remain intact

SAFETY:
- Only deletes Free Fire registration for roll 23ec59
- Does NOT delete the profile
- Does NOT delete other event registrations
- Does NOT delete team members' profiles
*/

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE '⚠️  DELETION SCRIPT READY';
    RAISE NOTICE '====================================';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Current Mode: PREVIEW ONLY';
    RAISE NOTICE '💡 To delete, uncomment the DELETE statement';
    RAISE NOTICE '====================================';
END $$;
