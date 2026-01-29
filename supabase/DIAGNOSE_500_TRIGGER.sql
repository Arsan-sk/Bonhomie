-- ============================================================================
-- DIAGNOSE: What's causing 500 "Database error querying schema" during login
-- The error happens in Supabase auth service itself
-- ============================================================================

-- ============================================================================
-- CHECK 1: Triggers on profiles table (MOST LIKELY CAUSE)
-- A trigger that runs on INSERT/UPDATE might cause errors during auth flow
-- ============================================================================

SELECT 
    '1. TRIGGERS ON PROFILES' as check,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles';

-- ============================================================================
-- CHECK 2: Triggers on auth.users table
-- ============================================================================

SELECT 
    '2. TRIGGERS ON AUTH.USERS' as check,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND event_object_schema = 'auth';

-- ============================================================================
-- CHECK 3: Functions that reference profiles table
-- ============================================================================

SELECT 
    '3. FUNCTIONS REFERENCING PROFILES' as check,
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_definition LIKE '%profiles%'
LIMIT 10;

-- ============================================================================
-- CHECK 4: RLS policies on profiles that might cause recursion
-- ============================================================================

SELECT 
    '4. RLS POLICIES ON PROFILES' as check,
    policyname,
    cmd,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- ============================================================================
-- CHECK 5: Check for handle_new_user trigger (common cause of issues)
-- ============================================================================

SELECT 
    '5. HANDLE_NEW_USER FUNCTION' as check,
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name LIKE '%handle%user%'
   OR routine_name LIKE '%new%user%'
   OR routine_name LIKE '%create%profile%';

-- ============================================================================
-- CHECK 6: All triggers in public schema
-- ============================================================================

SELECT 
    '6. ALL TRIGGERS IN PUBLIC' as check,
    trigger_name,
    event_object_table,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- ============================================================================
-- CHECK 7: Check if profiles table has any constraints that might fail
-- ============================================================================

SELECT 
    '7. CONSTRAINTS ON PROFILES' as check,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'profiles';

-- ============================================================================
-- CHECK 8: Check for any functions that might be called during auth
-- ============================================================================

SELECT 
    '8. AUTH-RELATED FUNCTIONS' as check,
    n.nspname as schema,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname IN ('public', 'auth')
  AND (p.proname LIKE '%user%' OR p.proname LIKE '%profile%' OR p.proname LIKE '%auth%')
LIMIT 20;
