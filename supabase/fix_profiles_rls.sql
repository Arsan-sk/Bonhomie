-- Fix Profiles RLS to allow viewing other users (needed for Chat)
-- Currently, if users can only view their own profile, chat names show as "Unknown"

-- 1. Enable RLS (just to be safe)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop restrictive policies if they exist (e.g. "Users can only view own profile")
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- 3. Create a policy allowing authenticated users to view ALL profiles
-- This is standard for social apps so you can see who you are talking to
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 4. Verify functionality
-- Check if we can select from profiles table
SELECT COUNT(*) FROM public.profiles;
