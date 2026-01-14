-- Fix payment_proofs bucket to be PUBLIC
-- The bucket is currently private, causing 400 errors on public URLs

-- Update bucket to be public
UPDATE storage.buckets
SET public = true
WHERE id = 'payment_proofs';

-- This allows the public URL endpoint to work:
-- https://.../storage/v1/object/public/payment_proofs/...
