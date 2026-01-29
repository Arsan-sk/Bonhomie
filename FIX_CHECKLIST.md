# 🚀 COMPLETE FIX CHECKLIST - Offline Registration

## Issue Summary
The offline registration feature is fully coded but NOT WORKING because:
1. ❌ SQL migration never ran - `is_admin_created` column doesn't exist
2. ❌ Browser cache showing old code
3. ⚠️ Possible RLS policy restrictions

---

## ✅ REQUIRED FIXES (Do these NOW)

### 1️⃣ Run SQL Migration - MOST CRITICAL
**File to run:** `supabase/add_admin_created_flag.sql`

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy ENTIRE contents of `supabase/add_admin_created_flag.sql`
4. Click "Run"
5. Should see: "Success. No rows returned"

**Why this is critical:**
- The code tries to insert `is_admin_created: true`
- Column doesn't exist → Database rejects insert
- Result: "Validation failed. Please try again" error

---

### 2️⃣ Add RLS Policies for Coordinators
**File to run:** `supabase/add_offline_registration_rls.sql`

**Steps:**
1. Supabase Dashboard → SQL Editor
2. New Query
3. Copy contents of `supabase/add_offline_registration_rls.sql`
4. Click "Run"

**Why this matters:**
- Coordinators need permission to INSERT into profiles table
- Without this, profile creation will fail with permission error

---

### 3️⃣ Hard Refresh Browser
**After running SQL:**
1. Open your app in browser
2. Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
3. Or: `Ctrl + F5` (Windows)

**Why this is needed:**
- Browser cached old JavaScript code
- Old code shows dark overlays (bg-opacity-50)
- New code has lighter overlays (bg-opacity-30) + better labels
- Hard refresh forces browser to download new code

---

## 📋 SQL Execution Order

Run in this EXACT order:

```
1. ✅ supabase/add_admin_created_flag.sql          ← CRITICAL - Run FIRST
2. ✅ supabase/add_offline_registration_rls.sql    ← Run SECOND
```

---

## 🧪 Testing After Fix

### Test 1: Add Participant (Individual Event)
1. Go to Coordinator Dashboard
2. Select any individual event (e.g., "Chess")
3. Click **Participants** tab
4. Should see blue info banner at top
5. Click **+ Add** button (indigo button, top right)
6. Modal should appear with **lighter background** (not completely black)
7. Enter roll number: `23ec59`
8. Click **"Verify"** button

**Expected results:**
- ✅ If profile exists: Green success box with student details
- ✅ If profile doesn't exist: Yellow warning with "Create New Profile" button
- ❌ If still "Validation failed": SQL migration didn't run or RLS blocking

---

### Test 2: Create New Profile
1. In Add Participant modal, enter non-existent roll number
2. Click "Verify"
3. Should show yellow warning
4. Click **"Create New Profile"** button
5. New modal appears
6. Fill in:
   - Full Name: `Test Student`
   - Phone: `9876543210`
   - Email: (auto-filled, should be `rollnumber@aiktc.ac.in`)
7. Click "Create Profile"

**Expected results:**
- ✅ Success message: "Student must sign up with this email to activate their account"
- ✅ Modal closes
- ✅ Profile created in database with `is_admin_created = TRUE`
- ❌ If error: Check browser console (F12) for exact error message

---

### Test 3: Add Team (Group Event)
1. Select a group event (e.g., "Throw Ball")
2. Click **Participants** tab
3. Click **+ Add** button
4. Modal shows: **"Step 1 of 2: Select Team Leader"** (updated label)
5. Enter leader roll number
6. Click **"Verify"**
7. If valid, click **"Continue to Add Members"**
8. **Step 2** shows with better labels
9. Search for members by roll number
10. Select members
11. Click **"Create Team"**

**Expected results:**
- ✅ Clearer step labels (1 of 2, 2 of 2)
- ✅ Better explanatory text under headings
- ✅ Team created successfully
- ✅ All members registered with `payment_mode='offline'`, `status='confirmed'`

---

## 🔍 Debugging Failed Tests

### Error: "Validation failed. Please try again"

**Cause:** Column `is_admin_created` doesn't exist

**Solution:**
```sql
-- Check if column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'is_admin_created';

-- If empty result, run: supabase/add_admin_created_flag.sql
```

---

### Error: "new row violates row-level security policy"

**Cause:** RLS policy blocking coordinator from inserting

**Solution:**
```sql
-- Run this to add policy
-- File: supabase/add_offline_registration_rls.sql
```

**Check current policies:**
```sql
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';
```

---

### Error: Still seeing dark modal overlay

**Cause:** Browser cache not cleared

**Solution:**
1. Close ALL browser tabs with your app
2. Clear browser cache completely:
   - Chrome: Ctrl+Shift+Del → Clear browsing data → Cached images and files
   - Or just hard refresh: Ctrl+Shift+R
3. Reopen app

---

### Error: "duplicate key value violates unique constraint"

**Cause:** Profile with this roll number already exists

**Solution:**
```sql
-- Check if profile exists
SELECT * FROM profiles WHERE roll_number = 'your_roll_number';

-- If exists, just register them normally
-- No need to create new profile
```

---

## 📊 Verification Queries

Run these in SQL Editor to verify everything is working:

### Check if column exists:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'is_admin_created';
```
Expected: Should return 1 row showing the column

---

### Check RLS policies:
```sql
SELECT policyname, cmd, permissive
FROM pg_policies
WHERE tablename = 'profiles'
AND policyname LIKE '%coordinator%';
```
Expected: Should show policies allowing coordinators to INSERT and SELECT

---

### View offline profiles created:
```sql
SELECT 
    roll_number,
    full_name,
    college_email,
    is_admin_created,
    created_at
FROM profiles
WHERE is_admin_created = TRUE
ORDER BY created_at DESC;
```
Expected: After creating profiles, should show them here

---

### Check registrations:
```sql
SELECT 
    r.id,
    p.roll_number,
    p.full_name,
    e.name as event_name,
    r.payment_mode,
    r.status,
    r.registered_at
FROM registrations r
JOIN profiles p ON p.id = r.profile_id
JOIN events e ON e.id = r.event_id
WHERE r.payment_mode = 'offline'
ORDER BY r.registered_at DESC;
```
Expected: Shows offline registrations after you create them

---

## 🎨 UI Improvements (Already in Code)

These changes are already in the code, will be visible after hard refresh:

### Modal Overlays:
- **Before:** `bg-black bg-opacity-50` (completely black, can't see behind)
- **After:** `bg-black bg-opacity-30 backdrop-blur-sm` (lighter, blurred background visible)

### Team Modal Labels:
- **Before:** "Step 1: Select Team Leader"
- **After:** "Step 1 of 2: Select Team Leader" + explanation text

### Buttons:
- **Before:** "Check"
- **After:** "Verify"

### Placeholders:
- **Before:** "e.g., 25AI110"
- **After:** "Enter roll number (e.g., 25AI110)"

### Info Banner:
- Added blue banner at top of Participants tab
- Explains how to use the "+ Add" button
- Clarifies there is NO separate "Offline Users" tab

---

## 📞 Still Having Issues?

If after running SQL migrations + hard refresh it STILL doesn't work:

1. **Check browser console:**
   - Press F12
   - Go to Console tab
   - Try adding participant
   - Copy any RED error messages

2. **Check Network tab:**
   - Press F12 → Network tab
   - Filter by "Fetch/XHR"
   - Try adding participant
   - Look for failed requests (red)
   - Click them to see error details

3. **Check Supabase logs:**
   - Supabase Dashboard → Logs
   - Look for errors around time you tried to add participant

4. **Verify your role:**
   ```sql
   SELECT id, full_name, role FROM profiles WHERE id = auth.uid();
   ```
   - Make sure you're logged in as coordinator or admin

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ Modal overlays are LIGHTER (can see background)
2. ✅ Team modal shows "Step 1 of 2" with explanation text
3. ✅ Blue info banner appears at top of Participants tab
4. ✅ Entering roll number + clicking Verify works without "Validation failed"
5. ✅ Creating new profile succeeds
6. ✅ Profile created with `is_admin_created = TRUE` in database
7. ✅ Registration created with `payment_mode = 'offline'` and `status = 'confirmed'`

---

## 🎯 Summary

**Root cause:** SQL migration file was created but never executed

**Fix:** Run 2 SQL files in order:
1. `supabase/add_admin_created_flag.sql`
2. `supabase/add_offline_registration_rls.sql`

**Then:** Hard refresh browser (Ctrl+Shift+R)

**Time to fix:** ~2 minutes

**Files ready:** All SQL and code files are ready, just need to execute SQL
