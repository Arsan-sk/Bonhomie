-- CHECK CURRENT STATE: skzaid00000@gmail.com
-- Let's verify if profile actually exists right now

-- Query 1: Current state - does profile exist?
SELECT 
    '=== CURRENT STATE ===' as section,
    au.id as auth_user_id,
    au.email,
    p.id as profile_id,
    p.full_name,
    p.roll_number,
    CASE 
        WHEN p.id IS NOT NULL THEN '✅ PROFILE EXISTS'
        ELSE '❌ PROFILE MISSING - Not created'
    END as status,
    CASE
        WHEN p.id IS NULL AND EXISTS (
            SELECT 1 FROM profiles p2
            WHERE LOWER(p2.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
            AND NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), '') IS NOT NULL
        ) THEN '⚠️ ROLL NUMBER CONFLICT - Profile not created'
        WHEN p.id IS NULL THEN '⚠️ UNKNOWN REASON - Profile missing'
        ELSE 'OK'
    END as why_missing
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'skzaid00000@gmail.com';

-- Query 2: If missing, show the roll number conflict details
SELECT 
    '=== ROLL NUMBER CONFLICT DETAILS ===' as section,
    au.raw_user_meta_data->>'roll_number' as wants_roll_number,
    p_conflict.id as conflicting_profile_id,
    p_conflict.college_email as conflicting_email,
    p_conflict.full_name as conflicting_name,
    p_conflict.roll_number as conflicting_roll,
    p_conflict.created_at as conflict_created_at,
    'This user cannot create profile - roll number already taken' as issue
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
LEFT JOIN profiles p_conflict ON LOWER(p_conflict.roll_number) = LOWER(NULLIF(TRIM(au.raw_user_meta_data->>'roll_number'), ''))
WHERE au.email = 'skzaid00000@gmail.com'
    AND p.id IS NULL
    AND p_conflict.id IS NOT NULL;

-- Query 3: Check if we need to create with NULL roll number
SELECT 
    '=== SOLUTION ===' as section,
    CASE
        WHEN p.id IS NOT NULL THEN 'Profile exists - check frontend cache or RLS policies'
        WHEN p.id IS NULL AND au.raw_user_meta_data->>'roll_number' IS NOT NULL THEN 'Create profile with NULL roll number (conflict resolution)'
        WHEN p.id IS NULL THEN 'Create profile normally'
    END as recommended_action
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'skzaid00000@gmail.com';
