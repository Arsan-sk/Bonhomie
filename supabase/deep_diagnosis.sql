-- DEEP DIAGNOSTIC: Check why profiles weren't actually fixed
-- This will help us understand what's really in the database

-- Query 1: Check profiles table structure and constraints
SELECT 
    '=== PROFILES TABLE SCHEMA ===' as section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Query 2: Check actual profile data for today's registrations
SELECT 
    '=== RAW PROFILE DATA FOR TODAY ===' as section,
    p.*
FROM profiles p
WHERE DATE(p.created_at) = '2026-01-29'
ORDER BY p.created_at DESC;

-- Query 3: Check auth.users metadata for comparison
SELECT 
    '=== AUTH.USERS METADATA ===' as section,
    au.id,
    au.email,
    au.created_at,
    au.raw_user_meta_data
FROM auth.users au
WHERE DATE(au.created_at) = '2026-01-29'
ORDER BY au.created_at DESC;

-- Query 4: Join to see the mismatch
SELECT 
    '=== PROFILE vs AUTH METADATA COMPARISON ===' as section,
    p.id,
    p.full_name as profile_full_name,
    au.raw_user_meta_data->>'full_name' as metadata_full_name,
    p.roll_number as profile_roll,
    au.raw_user_meta_data->>'roll_number' as metadata_roll,
    p.college_email,
    p.created_at,
    p.updated_at,
    CASE 
        WHEN p.full_name IS NULL THEN 'NULL'
        WHEN p.full_name = '' THEN 'EMPTY_STRING'
        WHEN p.full_name = 'New User' THEN 'DEFAULT'
        WHEN p.full_name = 'User' THEN 'FALLBACK'
        ELSE 'HAS_VALUE'
    END as name_status
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE DATE(p.created_at) = '2026-01-29'
ORDER BY p.created_at DESC;

-- Query 5: Check if profiles were actually updated
SELECT 
    '=== UPDATE HISTORY ===' as section,
    p.id,
    p.full_name,
    p.created_at,
    p.updated_at,
    EXTRACT(EPOCH FROM (p.updated_at - p.created_at)) as seconds_between_create_update,
    CASE 
        WHEN p.updated_at > p.created_at + INTERVAL '1 minute' THEN 'WAS_UPDATED'
        ELSE 'NOT_UPDATED'
    END as update_status
FROM profiles p
WHERE DATE(p.created_at) = '2026-01-29'
ORDER BY p.created_at DESC;

-- Query 6: Check foreign key constraints on registrations
SELECT 
    '=== FOREIGN KEY CONSTRAINTS ===' as section,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'registrations';

-- Query 7: Verify profile IDs exist
SELECT 
    '=== PROFILE ID VERIFICATION ===' as section,
    p.id as profile_id,
    au.id as auth_id,
    CASE 
        WHEN p.id = au.id THEN 'IDs_MATCH'
        ELSE 'IDS_DONT_MATCH'
    END as id_status,
    p.full_name,
    p.college_email
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE DATE(p.created_at) = '2026-01-29'
ORDER BY p.created_at DESC;

-- Query 8: Check for any NULL profiles (which would cause "Cannot read properties of null")
SELECT 
    '=== NULL PROFILE CHECK ===' as section,
    au.id as auth_user_id,
    au.email,
    p.id as profile_id,
    CASE 
        WHEN p.id IS NULL THEN 'PROFILE_MISSING'
        ELSE 'PROFILE_EXISTS'
    END as profile_existence
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29'
ORDER BY au.created_at DESC;

-- Query 9: Final comprehensive check
SELECT 
    '=== COMPREHENSIVE STATUS ===' as section,
    COUNT(*) FILTER (WHERE p.id IS NULL) as missing_profiles,
    COUNT(*) FILTER (WHERE p.full_name IS NULL) as null_names,
    COUNT(*) FILTER (WHERE p.full_name = '') as empty_names,
    COUNT(*) FILTER (WHERE p.full_name = 'User') as user_fallback,
    COUNT(*) FILTER (WHERE p.full_name = 'New User') as new_user_default,
    COUNT(*) FILTER (WHERE p.full_name NOT IN ('', 'User', 'New User') AND p.full_name IS NOT NULL) as has_real_name,
    COUNT(*) as total
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE DATE(au.created_at) = '2026-01-29';
