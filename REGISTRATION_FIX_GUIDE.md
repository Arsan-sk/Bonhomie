# Registration Fix - Execution Guide

## Overview
This guide will help you apply the fixes for the registration issues affecting new users since the last push (commit `5e1b1d5`).

## ⚠️ Important Prerequisites

1. **Backup your database** before running any SQL scripts
2. **Have Supabase dashboard access** ready
3. **Test environment first** if possible
4. **Notify affected users** that fixes are being applied

## Execution Steps

### Step 1: Run Diagnostics (Optional but Recommended)

**File**: `supabase/diagnosis_recent_registrations.sql`

This will show you:
- How many profiles are affected
- What metadata was originally passed
- Whether users tried registering for events

**How to run**:
1. Open Supabase Dashboard → SQL Editor
2. Copy/paste contents of `diagnosis_recent_registrations.sql`
3. Click "Run"
4. Review the results to understand the scope

**Expected Output**:
- Count of affected profiles
- List of users with empty/null names
- Sample of metadata from auth.users

---

### Step 2: Fix the Database Trigger (CRITICAL)

**File**: `supabase/fix_registration_trigger.sql`

This updates the `handle_new_user()` function to properly extract metadata.

**How to run**:
1. Open Supabase Dashboard → SQL Editor
2. Copy/paste contents of `fix_registration_trigger.sql`
3. Click "Run"
4. Verify success message appears

**Expected Output**:
```
SUCCESS: Trigger recreated with proper null handling
New registrations will now correctly extract metadata
```

**What this fixes**:
- New registrations will now properly extract full_name and other fields
- No more empty string insertions
- Roll numbers will be normalized to lowercase

---

### Step 3: Repair Affected Profiles

**File**: `supabase/fix_affected_profiles.sql`

This repairs existing broken profiles created since 2026-01-22.

**How to run**:
1. Open Supabase Dashboard → SQL Editor
2. Copy/paste contents of `fix_affected_profiles.sql`
3. Click "Run"
4. Review the repair results

**Expected Output**:
- Number of profiles updated
- List of remaining issues (should be 0 or very few)
- Sample of repaired profiles

**What this fixes**:
- Extracts data from auth.users metadata
- Updates empty/null full_name values
- Populates missing school, department, etc.
- Creates a backup table for safety

---

### Step 4: Verify the Fixes

Run these quick verification queries:

```sql
-- Check if any profiles still have issues
SELECT COUNT(*) 
FROM profiles 
WHERE created_at > '2026-01-22'
  AND (full_name IS NULL OR full_name = '' OR full_name = 'New User');
-- Expected: 0

-- Check recent updates
SELECT full_name, college_email, updated_at
FROM profiles
WHERE updated_at > NOW() - INTERVAL '10 minutes'
ORDER BY updated_at DESC
LIMIT 10;
-- Should show recently repaired profiles
```

---

### Step 5: Frontend Code Updates

The following files have been updated with frontend safeguards:

1. **✅ `src/pages/student/StudentDashboard.jsx`**
   - Better null handling for profile.full_name display
   - Prevents "Cannot read properties of null" errors

2. **✅ `src/context/AuthContext.jsx`**
   - Added profile validation warnings
   - Better error logging for debugging

**Action Required**: 
```bash
# Commit and push the changes
git add src/pages/student/StudentDashboard.jsx src/context/AuthContext.jsx
git commit -m "fix: Add null handling for profile names and validation warnings"
git push origin main
```

---

### Step 6: Test with New Registration

1. **Create a test account**:
   - Go to the registration page
   - Fill in all details with test data
   - Complete registration

2. **Verify**:
   - ✅ Registration completes successfully
   - ✅ Redirects to dashboard (no infinite loading)
   - ✅ Dashboard shows correct name (not "user" or blank)
   - ✅ Can register for an event without foreign key errors
   - ✅ Profile page shows all information correctly

3. **Check console logs**:
   - Open browser DevTools → Console
   - Should NOT see "Cannot read properties of null"
   - Should see profile validation messages if any issues

---

### Step 7: Notify Affected Users

**Affected users need to**:
1. Logout completely
2. Clear browser cache (optional but recommended)
3. Login again

**Why**: The profile data is cached in the frontend. Logging out and back in will fetch the repaired profile from the database.

**Sample notification message**:
```
📢 Registration Issue Fixed!

We've fixed the registration issues that some users experienced. 
If you registered recently and had problems with:
- Dashboard not loading
- Name showing as "user"
- Event registration errors

Please logout and login again to refresh your profile.

All your data has been preserved and the issues are now resolved.

If you still experience any problems after re-logging, please contact support.
```

---

## Rollback (If Needed)

If something goes wrong, you can rollback:

### To restore profiles:
```sql
-- Restore from backup (created in Step 3)
UPDATE profiles p
SET 
    full_name = b.full_name,
    roll_number = b.roll_number,
    school = b.school,
    department = b.department,
    program = b.program,
    year_of_study = b.year_of_study,
    admission_year = b.admission_year,
    expected_passout_year = b.expected_passout_year,
    phone = b.phone,
    gender = b.gender,
    updated_at = NOW()
FROM profiles_backup_20260129 b
WHERE p.id = b.id;
```

### To restore old trigger:
```sql
-- Run the old auto_create_profile_trigger.sql
-- (But this will bring back the bug, so only use in emergency)
```

---

## Success Criteria

✅ **All SQL scripts run without errors**  
✅ **Diagnostic query shows 0 affected profiles**  
✅ **Test registration works end-to-end**  
✅ **No console errors on dashboard**  
✅ **Event registration works for new users**  
✅ **Existing affected users can login and see their dashboard**

---

## Troubleshooting

**Q: Still seeing empty names after fix**  
A: Users need to logout and login again to refresh cached profile

**Q: Some profiles couldn't be repaired**  
A: Check if metadata exists in auth.users - may need manual data entry

**Q: New registrations still have issues**  
A: Verify trigger was successfully updated - check `pg_trigger` table

**Q: Event registration still fails**  
A: Check RLS policies on registrations table - may need separate fix

---

## Contact

If you encounter any issues during this process:
1. Check the diagnostic queries first
2. Review the error messages in Supabase logs
3. Verify all steps were completed in order
4. Contact for support if issues persist

---

**Last Updated**: 2026-01-29  
**Issue Reference**: Registration bug since commit 5e1b1d5
