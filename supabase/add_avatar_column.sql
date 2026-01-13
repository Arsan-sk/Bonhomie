-- Add avatar_url column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment for clarity
COMMENT ON COLUMN profiles.avatar_url IS 'URL or path to user profile avatar image';
