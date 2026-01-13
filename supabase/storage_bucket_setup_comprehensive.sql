-- Simplified Storage Bucket Setup (Idempotent)
-- Safe to run multiple times - will not error if buckets already exist

-- Create payment_proofs bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment_proofs', 'payment_proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Create event_images bucket for QR codes and event covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('event_images', 'event_images', true)
ON CONFLICT (id) DO NOTHING;

-- Note: storage.objects already has RLS enabled by default in Supabase
-- We only need to add our policies

-- Drop existing policies if they exist (to allow re-running)
DROP POLICY IF EXISTS "Authenticated users can upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admin and coordinators can view all payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Public can view event images" ON storage.objects;
DROP POLICY IF EXISTS "Admin and coordinators can upload event images" ON storage.objects;

-- Policies for 'payment_proofs' bucket
CREATE POLICY "Authenticated users can upload payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment_proofs' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view their own payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment_proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admin and coordinators can view all payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment_proofs' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
  )
);

-- Policies for 'event_images' bucket
CREATE POLICY "Public can view event images"
ON storage.objects FOR SELECT
USING (bucket_id = 'event_images');

CREATE POLICY "Admin and coordinators can upload event images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event_images' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
  )
);
