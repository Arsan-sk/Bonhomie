-- First, check if there are any restrictive policies
-- Run this to see existing policies:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- To fix the issue, you need to add policies via the Supabase Dashboard UI
-- But if you want to try via SQL, you need to use the postgres role

-- Alternative: Disable RLS temporarily for testing (NOT RECOMMENDED FOR PRODUCTION)
-- This can only be done by the postgres user in the SQL editor

-- Instead, use this approach:
-- Go to Storage > Policies in Supabase Dashboard and create these policies:

/*
Policy 1: Allow INSERT
- Name: "Allow authenticated uploads to payment_proofs"
- Operation: INSERT
- Target roles: authenticated
- USING expression: (bucket_id = 'payment_proofs')
- WITH CHECK expression: (bucket_id = 'payment_proofs')

Policy 2: Allow SELECT
- Name: "Allow users to view their own files"
- Operation: SELECT  
- Target roles: authenticated
- USING expression: (bucket_id = 'payment_proofs' AND (storage.foldername(name))[1] = auth.uid()::text)

Policy 3: Allow SELECT for admin/faculty
- Name: "Allow admin and faculty to view all files"
- Operation: SELECT
- Target roles: authenticated
- USING expression: (bucket_id = 'payment_proofs' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')))
*/
