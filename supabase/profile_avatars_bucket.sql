-- Create profile-avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for profile-avatars bucket
-- Note: DROP POLICY first if re-running to avoid "already exists" errors

-- Anyone can view avatars (public bucket)
DROP POLICY IF EXISTS "Anyone can view profile avatars" ON storage.objects;
CREATE POLICY "Anyone can view profile avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-avatars');

-- Users can upload their own avatar
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'profile-avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own avatar
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'profile-avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own avatar
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'profile-avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
