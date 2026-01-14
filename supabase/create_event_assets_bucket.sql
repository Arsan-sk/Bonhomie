-- Simple Event Assets Bucket Setup
-- Safe to run multiple times - uses INSERT with ON CONFLICT
-- No special permissions required

-- Create the event-assets bucket (will not error if exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'event-assets',
    'event-assets',
    true, -- Public bucket for event images
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Drop existing policies if they exist (these commands are safe)
DROP POLICY IF EXISTS "Event assets are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload event assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own event assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins and coordinators can delete event assets" ON storage.objects;

-- Policy 1: Public read access (anyone can view)
CREATE POLICY "Event assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-assets');

-- Policy 2: Authenticated users can upload (create)
CREATE POLICY "Authenticated users can upload event assets"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'event-assets' 
    AND auth.role() = 'authenticated'
);

-- Policy 3: Users can update their own files
CREATE POLICY "Users can update their own event assets"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'event-assets'
    AND auth.uid() = owner
);

-- Policy 4: Admins and coordinators can delete
CREATE POLICY "Admins and coordinators can delete event assets"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'event-assets'
    AND (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'faculty')
        )
        OR auth.uid() = owner
    )
);

-- Verify the bucket was created
SELECT 
    id, 
    name, 
    public, 
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'event-assets';
