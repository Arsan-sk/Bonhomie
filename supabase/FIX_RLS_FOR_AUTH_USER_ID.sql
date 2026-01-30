-- ============================================
-- FIX RLS POLICIES TO SUPPORT auth_user_id
-- ============================================
-- Problem: Profiles have auth_user_id column but RLS uses only id = auth.uid()
-- For bulk-imported users, profile.id != auth.users.id
-- This causes 500 errors because RLS fails to match
-- ============================================

-- STEP 1: Check current state
-- ============================================

-- 1.1 Show profiles where id != auth_user_id (these are the problematic ones)
SELECT 
    '1.1 PROFILES WHERE ID != AUTH_USER_ID' as check,
    p.id as profile_id,
    p.auth_user_id,
    p.college_email,
    p.is_admin_created,
    CASE 
        WHEN p.id = p.auth_user_id THEN '✅ id = auth_user_id'
        WHEN p.auth_user_id IS NOT NULL THEN '⚠️ id != auth_user_id'
        ELSE '❌ auth_user_id IS NULL'
    END as status
FROM profiles p
WHERE p.auth_user_id IS NOT NULL 
  AND p.id != p.auth_user_id
LIMIT 20;

-- 1.2 Count of different scenarios
SELECT 
    '1.2 PROFILE STATUS COUNTS' as check,
    COUNT(*) FILTER (WHERE id = auth_user_id) as id_equals_auth_user_id,
    COUNT(*) FILTER (WHERE auth_user_id IS NOT NULL AND id != auth_user_id) as id_different_from_auth_user_id,
    COUNT(*) FILTER (WHERE auth_user_id IS NULL) as no_auth_user_id,
    COUNT(*) as total_profiles
FROM profiles;

-- 1.3 Show current RLS policies on profiles
SELECT 
    '1.3 CURRENT RLS POLICIES ON PROFILES' as check,
    policyname,
    cmd,
    qual::text as using_clause,
    with_check::text as with_check_clause
FROM pg_policies
WHERE tablename = 'profiles';

-- ============================================
-- STEP 2: Update RLS policies to check auth_user_id
-- ============================================

-- 2.1 Drop existing policies on profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users read profiles" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON profiles;

-- 2.2 Create new policies that check BOTH id and auth_user_id

-- SELECT: All authenticated users can view profiles
CREATE POLICY "profiles_select_authenticated"
ON profiles FOR SELECT
USING (auth.role() = 'authenticated');

-- UPDATE: Users can update their own profile (check both id AND auth_user_id)
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
USING (
    auth.uid() = id 
    OR auth.uid() = auth_user_id
);

-- INSERT: Users can insert their own profile (check both id AND auth_user_id)
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
WITH CHECK (
    auth.uid() = id 
    OR auth.uid() = auth_user_id
);

-- DELETE: Users can delete their own profile (rare but might be needed)
CREATE POLICY "profiles_delete_own"
ON profiles FOR DELETE
USING (
    auth.uid() = id 
    OR auth.uid() = auth_user_id
);

-- ============================================
-- STEP 3: Verify policies are created
-- ============================================

SELECT 
    '3. UPDATED RLS POLICIES' as check,
    policyname,
    cmd,
    qual::text as using_clause,
    with_check::text as with_check_clause
FROM pg_policies
WHERE tablename = 'profiles';

-- ============================================
-- STEP 4: Also update registrations RLS to match
-- ============================================

-- 4.1 Show current registrations policies
SELECT 
    '4.1 CURRENT REGISTRATIONS POLICIES' as check,
    policyname,
    cmd,
    qual::text as using_clause
FROM pg_policies
WHERE tablename = 'registrations';

-- 4.2 The registrations use profile_id which should match profile.id
-- But the profile lookup during auth is what's failing
-- So no changes needed for registrations RLS

-- ============================================
-- STEP 5: Final verification
-- ============================================

-- 5.1 Test a sample user (check if RLS would pass now)
SELECT 
    '5.1 SAMPLE USER RLS TEST' as check,
    p.id as profile_id,
    p.auth_user_id,
    p.college_email,
    au.id as auth_users_id,
    CASE 
        WHEN p.id = au.id THEN '✅ RLS would pass via id'
        WHEN p.auth_user_id = au.id THEN '✅ RLS would pass via auth_user_id'
        ELSE '❌ RLS WOULD FAIL'
    END as rls_status
FROM profiles p
JOIN auth.users au ON au.email = p.college_email
LIMIT 10;

-- 5.2 Count how many users would PASS RLS now
SELECT 
    '5.2 RLS PASS/FAIL COUNTS' as check,
    COUNT(*) FILTER (WHERE p.id = au.id) as would_pass_via_id,
    COUNT(*) FILTER (WHERE p.auth_user_id = au.id) as would_pass_via_auth_user_id,
    COUNT(*) FILTER (WHERE p.id = au.id OR p.auth_user_id = au.id) as total_would_pass,
    COUNT(*) FILTER (WHERE p.id != au.id AND (p.auth_user_id IS NULL OR p.auth_user_id != au.id)) as would_fail,
    COUNT(*) as total_matched
FROM profiles p
JOIN auth.users au ON au.email = p.college_email;

-- ============================================
-- DONE!
-- The RLS policies now check both id and auth_user_id
-- This should fix the 500 "Database error querying schema" for all users
-- ============================================
