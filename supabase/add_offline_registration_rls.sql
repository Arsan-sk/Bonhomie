-- ============================================
-- RLS Policies for Offline Registration
-- Ensures coordinators/admins can create profiles
-- Date: January 28, 2026
-- ============================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "coordinators_can_create_offline_profiles" ON profiles;

-- Allow coordinators and admins to INSERT profiles (for offline registration)
CREATE POLICY "coordinators_can_create_offline_profiles"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
    -- Only coordinators and admins can create profiles
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('coordinator', 'admin')
    )
);

-- ============================================
-- Verification Query
-- ============================================

-- Check if the policy was created
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    cmd as operation,
    qual as using_expression,
    with_check
FROM pg_policies
WHERE tablename = 'profiles'
AND policyname = 'coordinators_can_create_offline_profiles';

-- ============================================
-- Additional Useful Policies
-- ============================================

-- Allow coordinators to view all profiles (for searching)
DROP POLICY IF EXISTS "coordinators_can_view_all_profiles" ON profiles;

CREATE POLICY "coordinators_can_view_all_profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
    -- Coordinators and admins can see all profiles
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('coordinator', 'admin')
    )
    OR
    -- Users can see their own profile
    id = auth.uid()
);

-- ============================================
-- TEST QUERY
-- ============================================

-- Test if current user (you) can create a profile
-- Run this after logging in as coordinator/admin
SELECT 
    auth.uid() as current_user_id,
    p.role as current_user_role,
    CASE 
        WHEN p.role IN ('coordinator', 'admin') THEN 'YES - Can create profiles'
        ELSE 'NO - Cannot create profiles'
    END as can_create_offline_profiles
FROM profiles p
WHERE p.id = auth.uid();
