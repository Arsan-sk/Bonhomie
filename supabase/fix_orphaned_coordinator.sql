-- Fix 1: Manually insert the orphaned coordinator into profiles table
-- UID: 1c6a3d2e-a580-4b18-a290-8e4a1dc5dbd7

INSERT INTO public.profiles (
    id,
    role,
    full_name,
    college_email,
    created_at,
    updated_at
)
VALUES (
    '1c6a3d2e-a580-4b18-a290-8e4a1dc5dbd7',
    'coordinator',
    'Coordinator User', -- Update this with actual name if known
    (SELECT email FROM auth.users WHERE id = '1c6a3d2e-a580-4b18-a290-8e4a1dc5dbd7'),
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = NOW();

-- Verify the insertion
SELECT id, role, full_name, college_email 
FROM public.profiles 
WHERE id = '1c6a3d2e-a580-4b18-a290-8e4a1dc5dbd7';
