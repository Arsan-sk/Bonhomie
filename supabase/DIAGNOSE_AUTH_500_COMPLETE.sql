-- ============================================
-- DIAGNOSE AUTH SERVICE 500 ERROR
-- ============================================
-- This error happens at Supabase's auth service level during signInWithPassword
-- The auth service itself is getting a database error
-- ============================================

-- STEP 1: Check auth.users table structure
-- ============================================

SELECT 
    '1. AUTH.USERS TABLE COLUMNS' as check,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'users'
ORDER BY ordinal_position;

-- STEP 2: Check auth.identities table structure  
-- ============================================

SELECT 
    '2. AUTH.IDENTITIES TABLE COLUMNS' as check,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'identities'
ORDER BY ordinal_position;

-- STEP 3: Check for triggers on auth.users
-- ============================================

SELECT 
    '3. TRIGGERS ON AUTH.USERS' as check,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth' AND event_object_table = 'users';

-- STEP 4: Check for triggers on profiles
-- ============================================

SELECT 
    '4. TRIGGERS ON PROFILES' as check,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table = 'profiles';

-- STEP 5: Check for any function that might be called during auth
-- ============================================

SELECT 
    '5. FUNCTIONS WITH SECURITY DEFINER' as check,
    n.nspname as schema,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prosecdef = true
AND n.nspname IN ('public', 'auth')
AND p.proname LIKE '%user%' OR p.proname LIKE '%profile%'
LIMIT 10;

-- STEP 6: Check auth.users records for working vs non-working users
-- ============================================

-- Working users (we know these work)
SELECT 
    '6A. WORKING USER: 23ec59' as check,
    au.id,
    au.email,
    au.encrypted_password IS NOT NULL as has_password,
    au.email_confirmed_at,
    au.aud,
    au.role,
    au.instance_id,
    ai.provider,
    ai.provider_id
FROM auth.users au
LEFT JOIN auth.identities ai ON ai.user_id = au.id
WHERE au.email LIKE '%23ec59%';

-- Non-working user (pick a random one)
SELECT 
    '6B. SAMPLE OTHER USER' as check,
    au.id,
    au.email,
    au.encrypted_password IS NOT NULL as has_password,
    au.email_confirmed_at,
    au.aud,
    au.role,
    au.instance_id,
    ai.provider,
    ai.provider_id
FROM auth.users au
LEFT JOIN auth.identities ai ON ai.user_id = au.id
WHERE au.email LIKE '%@aiktc.ac.in'
  AND au.email NOT LIKE '%23ec59%'
  AND au.email NOT LIKE '%23ec41%'
  AND au.email NOT LIKE '%23ds33%'
LIMIT 3;

-- STEP 7: Check for NULL values that shouldn't be NULL
-- ============================================

SELECT 
    '7. USERS WITH POTENTIAL ISSUES' as check,
    au.id,
    au.email,
    CASE WHEN au.encrypted_password IS NULL THEN '❌ NO PASSWORD' ELSE '✅' END as password_check,
    CASE WHEN au.aud IS NULL OR au.aud = '' THEN '❌ NO AUD' ELSE '✅' END as aud_check,
    CASE WHEN au.role IS NULL OR au.role = '' THEN '❌ NO ROLE' ELSE '✅' END as role_check,
    CASE WHEN ai.id IS NULL THEN '❌ NO IDENTITY' ELSE '✅' END as identity_check,
    CASE WHEN ai.provider IS NULL THEN '❌ NO PROVIDER' ELSE '✅' END as provider_check
FROM auth.users au
LEFT JOIN auth.identities ai ON ai.user_id = au.id
WHERE au.email LIKE '%@aiktc.ac.in'
  AND (
    au.encrypted_password IS NULL
    OR au.aud IS NULL OR au.aud = ''
    OR au.role IS NULL OR au.role = ''
    OR ai.id IS NULL
  )
LIMIT 20;

-- STEP 8: Compare a working user's auth record with a non-working one
-- ============================================

-- Get FULL details of a working user
SELECT 
    '8A. FULL DETAILS - WORKING USER' as check,
    *
FROM auth.users
WHERE email = '23ec59@aiktc.ac.in';

-- Get FULL details of the identity
SELECT 
    '8B. IDENTITY - WORKING USER' as check,
    *
FROM auth.identities
WHERE user_id = (SELECT id FROM auth.users WHERE email = '23ec59@aiktc.ac.in');

-- Get FULL details of a non-working user (adjust email as needed)
SELECT 
    '8C. FULL DETAILS - OTHER USER' as check,
    *
FROM auth.users
WHERE email LIKE '%@aiktc.ac.in'
  AND email NOT IN ('23ec59@aiktc.ac.in', '23ec41@aiktc.ac.in', '23ds33@aiktc.ac.in')
LIMIT 1;

-- Get FULL details of their identity
SELECT 
    '8D. IDENTITY - OTHER USER' as check,
    ai.*
FROM auth.identities ai
JOIN auth.users au ON au.id = ai.user_id
WHERE au.email LIKE '%@aiktc.ac.in'
  AND au.email NOT IN ('23ec59@aiktc.ac.in', '23ec41@aiktc.ac.in', '23ds33@aiktc.ac.in')
LIMIT 1;

-- STEP 9: Check if handle_new_user trigger might be failing
-- ============================================

SELECT 
    '9. HANDLE_NEW_USER FUNCTION EXISTS' as check,
    n.nspname as schema,
    p.proname as function_name,
    l.lanname as language
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE p.proname = 'handle_new_user';

-- STEP 10: Check constraints that might cause issues
-- ============================================

SELECT 
    '10. CONSTRAINTS ON AUTH.USERS' as check,
    conname,
    contype,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'auth.users'::regclass;

-- STEP 11: Check for any scheduled/background jobs
-- ============================================

SELECT 
    '11. CRON JOBS' as check,
    *
FROM cron.job
WHERE active = true;
