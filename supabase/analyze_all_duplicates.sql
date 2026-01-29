-- COMPREHENSIVE DUPLICATE ANALYSIS
-- Shows ALL duplicate roll numbers with complete details
-- Run this FIRST to understand what you're dealing with

-- Query 1: Summary of all duplicate roll numbers
SELECT 
    '=== DUPLICATE ROLL NUMBERS SUMMARY ===' as section,
    LOWER(roll_number) as roll_number,
    COUNT(*) as duplicate_count,
    STRING_AGG(DISTINCT college_email, ', ' ORDER BY college_email) as all_emails,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM profiles
WHERE roll_number IS NOT NULL 
    AND roll_number != ''
GROUP BY LOWER(roll_number)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, roll_number;

-- Query 2: Detailed breakdown for EACH duplicate profile
WITH duplicates AS (
    SELECT 
        LOWER(roll_number) as roll_number_normalized,
        COUNT(*) as dup_count
    FROM profiles
    WHERE roll_number IS NOT NULL AND roll_number != ''
    GROUP BY LOWER(roll_number)
    HAVING COUNT(*) > 1
)
SELECT 
    '=== DETAILED DUPLICATE PROFILES ===' as section,
    p.roll_number,
    p.id as profile_id,
    p.full_name,
    p.college_email,
    p.school,
    p.department,
    p.phone,
    p.created_at,
    p.updated_at,
    COUNT(r.id) as event_registration_count,
    ROW_NUMBER() OVER (PARTITION BY LOWER(p.roll_number) ORDER BY p.created_at) as profile_number,
    CASE 
        WHEN ROW_NUMBER() OVER (PARTITION BY LOWER(p.roll_number) ORDER BY p.created_at) = 1 
        THEN '✅ OLDEST (Recommend KEEP)' 
        ELSE '⚠️ NEWER (Recommend DELETE)' 
    END as recommendation
FROM duplicates d
JOIN profiles p ON LOWER(p.roll_number) = d.roll_number_normalized
LEFT JOIN registrations r ON r.profile_id = p.id
GROUP BY p.roll_number, p.id, p.full_name, p.college_email, p.school, p.department, p.phone, p.created_at, p.updated_at
ORDER BY p.roll_number, p.created_at;

-- Query 3: Show which EVENTS each duplicate is registered for
WITH duplicates AS (
    SELECT 
        LOWER(roll_number) as roll_number_normalized
    FROM profiles
    WHERE roll_number IS NOT NULL AND roll_number != ''
    GROUP BY LOWER(roll_number)
    HAVING COUNT(*) > 1
)
SELECT 
    '=== EVENT REGISTRATIONS BY DUPLICATE ===' as section,
    p.roll_number,
    p.college_email,
    p.id as profile_id,
    ROW_NUMBER() OVER (PARTITION BY LOWER(p.roll_number) ORDER BY p.created_at) as profile_number,
    e.name as event_name,
    e.category as event_category,
    r.status as registration_status,
    r.registered_at,
    CASE 
        WHEN ROW_NUMBER() OVER (PARTITION BY LOWER(p.roll_number) ORDER BY p.created_at) = 1 
        THEN 'KEEP' 
        ELSE 'DELETE' 
    END as will_do
FROM duplicates d
JOIN profiles p ON LOWER(p.roll_number) = d.roll_number_normalized
LEFT JOIN registrations r ON r.profile_id = p.id
LEFT JOIN events e ON e.id = r.event_id
ORDER BY p.roll_number, p.created_at, r.registered_at;

-- Query 4: Check for CONFLICTING registrations (same event registered by both profiles)
WITH duplicates AS (
    SELECT 
        LOWER(roll_number) as roll_number_normalized,
        COUNT(*) as dup_count
    FROM profiles
    WHERE roll_number IS NOT NULL AND roll_number != ''
    GROUP BY LOWER(roll_number)
    HAVING COUNT(*) > 1
),
dup_profiles AS (
    SELECT 
        d.roll_number_normalized,
        p.id as profile_id,
        p.college_email,
        p.created_at,
        ROW_NUMBER() OVER (PARTITION BY d.roll_number_normalized ORDER BY p.created_at) as profile_num
    FROM duplicates d
    JOIN profiles p ON LOWER(p.roll_number) = d.roll_number_normalized
)
SELECT 
    '=== CONFLICTING EVENT REGISTRATIONS ===' as section,
    dp1.roll_number_normalized as roll_number,
    e.name as event_name,
    dp1.college_email as profile_1_email,
    dp1.profile_id as profile_1_id,
    r1.status as profile_1_status,
    dp2.college_email as profile_2_email,
    dp2.profile_id as profile_2_id,
    r2.status as profile_2_status,
    '⚠️ BOTH registered for same event - CANNOT TRANSFER' as conflict
FROM dup_profiles dp1
JOIN dup_profiles dp2 ON dp1.roll_number_normalized = dp2.roll_number_normalized 
    AND dp1.profile_num < dp2.profile_num
JOIN registrations r1 ON r1.profile_id = dp1.profile_id
JOIN registrations r2 ON r2.profile_id = dp2.profile_id
JOIN events e ON e.id = r1.event_id AND e.id = r2.event_id
ORDER BY dp1.roll_number_normalized, e.name;

-- Query 5: Categorize duplicates by TYPE
WITH duplicates AS (
    SELECT 
        LOWER(roll_number) as roll_number_normalized,
        COUNT(*) as dup_count
    FROM profiles
    WHERE roll_number IS NOT NULL AND roll_number != ''
    GROUP BY LOWER(roll_number)
    HAVING COUNT(*) > 1
)
SELECT 
    '=== DUPLICATE CATEGORIES ===' as section,
    d.roll_number_normalized as roll_number,
    COUNT(DISTINCT p.id) as profile_count,
    COUNT(DISTINCT p.college_email) as unique_emails,
    COUNT(r.id) as total_event_registrations,
    CASE 
        WHEN COUNT(DISTINCT p.college_email) = 1 THEN '🔸 SAME EMAIL (Test accounts)'
        WHEN COUNT(DISTINCT p.college_email) > 1 THEN '🔸 DIFFERENT EMAILS (Possible genuine users)'
    END as duplicate_type,
    CASE 
        WHEN COUNT(r.id) = 0 THEN '✅ SAFE - No registrations, just delete newer'
        WHEN COUNT(r.id) > 0 THEN '⚠️ HAS REGISTRATIONS - Need careful handling'
    END as complexity
FROM duplicates d
JOIN profiles p ON LOWER(p.roll_number) = d.roll_number_normalized
LEFT JOIN registrations r ON r.profile_id = p.id
GROUP BY d.roll_number_normalized
ORDER BY COUNT(r.id) DESC, d.roll_number_normalized;

-- Query 6: Recommendation summary
WITH duplicates AS (
    SELECT 
        LOWER(roll_number) as roll_number_normalized,
        COUNT(*) as dup_count
    FROM profiles
    WHERE roll_number IS NOT NULL AND roll_number != ''
    GROUP BY LOWER(roll_number)
    HAVING COUNT(*) > 1
),
duplicate_profiles_numbered AS (
    SELECT 
        p.*,
        ROW_NUMBER() OVER (PARTITION BY LOWER(p.roll_number) ORDER BY p.created_at) as row_num,
        EXISTS (SELECT 1 FROM registrations r WHERE r.profile_id = p.id) as has_registrations
    FROM duplicates d
    JOIN profiles p ON LOWER(p.roll_number) = d.roll_number_normalized
)
SELECT 
    '=== CLEANUP RECOMMENDATIONS ===' as section,
    COUNT(*) FILTER (WHERE NOT has_registrations) as safe_to_delete_no_registrations,
    COUNT(*) FILTER (WHERE has_registrations AND row_num > 1) as need_registration_handling,
    COUNT(*) as total_duplicate_profiles
FROM duplicate_profiles_numbered;
