-- ============================================
-- Add Admin Created Flag to Profiles
-- Offline Registration Support - Inline Registration Feature
-- Date: January 28, 2026
-- ============================================
-- Purpose: Flag profiles created by admin/coordinator via Participants tab
--          for offline registrations. This distinguishes them from 
--          self-registered users who register through the online form.
-- ============================================

-- Add is_admin_created column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin_created BOOLEAN DEFAULT FALSE;

-- Add column comment for documentation
COMMENT ON COLUMN profiles.is_admin_created IS 'TRUE if profile was created by admin/coordinator for offline registration via Participants tab, FALSE if self-registered online';

-- Set existing profiles to FALSE (all existing users are self-registered)
UPDATE profiles 
SET is_admin_created = FALSE 
WHERE is_admin_created IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE profiles 
ALTER COLUMN is_admin_created SET NOT NULL;

-- Create index for faster queries filtering by registration source
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin_created 
ON profiles(is_admin_created);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify the column was added successfully
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name = 'is_admin_created';

-- Check current distribution (all should be FALSE for existing users)
SELECT 
    is_admin_created,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM profiles
GROUP BY is_admin_created
ORDER BY is_admin_created DESC;

-- Show sample of profiles with the new column
SELECT 
    id,
    full_name,
    roll_number,
    college_email,
    role,
    is_admin_created,
    created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT '✅ Column is_admin_created added successfully to profiles table' AS status;
SELECT '✅ All existing profiles marked as is_admin_created = FALSE' AS status;
SELECT '✅ Index created for performance optimization' AS status;
SELECT '✅ Ready for offline registration implementation' AS status;
