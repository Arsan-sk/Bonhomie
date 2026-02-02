-- Allow Admins and Faculty/Coordinators to update chat_rooms (e.g. restrict chat)
-- Currently, user might not have update permissions on chat_rooms

-- 1. Enable RLS on chat_rooms if not already
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Allow update if user is admin or coordinator
CREATE POLICY "Admins and Coordinators can update chat rooms"
ON public.chat_rooms
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'faculty' OR profiles.role = 'coordinator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'faculty' OR profiles.role = 'coordinator')
  )
);

-- Note: This assumes profiles table has the correct role for the logged in user.
