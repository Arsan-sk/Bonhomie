# 🚨 Quick Fix Reference - Duplicate Key Error

## Problem
Getting: **"duplicate key value violates unique constraint 'profiles_pkey'"**

## Root Cause
Function was using **same UUID** for both `profiles.id` and `auth.users.id`, causing primary key conflicts.

## Solution (3 Steps)

### Step 1: Clean Corrupt Data
Run in Supabase SQL Editor:
```sql
\i supabase/CLEANUP_CORRUPT_DATA.sql
```
**Time**: ~10 seconds  
**What it does**: Removes test profiles, orphaned auth users, duplicates

### Step 2: Apply Comprehensive Fix
Run in Supabase SQL Editor:
```sql
\i supabase/ULTIMATE_FIX_RUN_THIS.sql
```
**Time**: ~30 seconds  
**What it does**: Creates corrected function with separate UUIDs, fixes existing profiles

### Step 3: Test
1. **Test New Profile**:
   - Admin → Users → "Add New Profile"
   - Roll: `22CS98`, Name: `Test Student`, Phone: `9876543210`
   - Should succeed ✅

2. **Test Login**:
   - Email: `22cs98@aiktc.ac.in`
   - Password: `Bonhomie@2026`
   - Should login ✅

## If Still Broken

### Option A: Nuclear Reset (Deletes ALL offline profiles)
```sql
-- Edit the file first, uncomment the safety line
\i supabase/EMERGENCY_RESET.sql
```

### Option B: Manual Cleanup
```sql
-- Find duplicates
SELECT roll_number, COUNT(*) 
FROM profiles 
GROUP BY roll_number 
HAVING COUNT(*) > 1;

-- Delete specific duplicate
DELETE FROM profiles WHERE id = 'PASTE_ID_HERE';
```

## Key Changes Made

| Issue | Fix |
|-------|-----|
| Same UUID for profile & auth | ✅ Separate UUIDs now |
| Case-sensitive checks | ✅ LOWER() applied |
| No cleanup of failed attempts | ✅ Comprehensive cleanup |
| Poor error messages | ✅ Detailed errors with IDs |

## Files Created

1. **CLEANUP_CORRUPT_DATA.sql** - Run first to clean
2. **ULTIMATE_FIX_RUN_THIS.sql** - Main fix script
3. **EMERGENCY_RESET.sql** - Nuclear option (deletes all)
4. **OFFLINE_REGISTRATION_FIX_GUIDE.md** - Full documentation

## Verification Queries

```sql
-- Check offline profiles status
SELECT 
    roll_number,
    college_email,
    auth_user_id IS NOT NULL as has_auth
FROM profiles 
WHERE is_admin_created = TRUE
ORDER BY roll_number;

-- Check for orphaned auth users
SELECT au.email 
FROM auth.users au
LEFT JOIN profiles p ON p.auth_user_id = au.id
WHERE p.id IS NULL AND au.email LIKE '%@aiktc.ac.in';

-- Check for duplicates
SELECT roll_number, COUNT(*) 
FROM profiles 
GROUP BY LOWER(roll_number) 
HAVING COUNT(*) > 1;
```

## Contact Points

- **Email Format**: `rollnumber@aiktc.ac.in` (e.g., `22cs01@aiktc.ac.in`)
- **Default Password**: `Bonhomie@2026`
- **Profile Flag**: `is_admin_created = TRUE`

## Success Criteria

✅ No duplicate key errors when creating profiles  
✅ All existing offline profiles can login  
✅ New profiles can be created from Admin panel  
✅ Students can login immediately after creation  
✅ No orphaned auth records in database

---

**Last Updated**: January 29, 2026  
**Status**: ✅ FIXED
