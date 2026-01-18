-- ============================================
-- FIX ADMIN ROLE PERMISSIONS
-- Allows admins to update any user's role
-- ============================================

-- STEP 1: Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profile_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- STEP 2: Create new flexible UPDATE policy
-- Users can update their own profile OR admins can update anyone's profile
CREATE POLICY "profile_update_policy" 
ON public.profiles 
FOR UPDATE
USING (
  -- Allow users to update their own profile
  auth.uid() = id 
  OR
  -- Allow admins to update any profile
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  -- Same check for the new data being written
  auth.uid() = id 
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- STEP 3: Create SELECT policy (everyone can view profiles)
CREATE POLICY "profiles_select_policy" 
ON public.profiles 
FOR SELECT
USING (true); -- All authenticated users can view all profiles

-- STEP 4: Ensure INSERT policy allows profile creation
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "profile_insert_policy"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- STEP 5: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- STEP 6: Verify policies
SELECT tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Success message
SELECT 'Admin role permissions fixed! Admins can now update any user role.' as status;
