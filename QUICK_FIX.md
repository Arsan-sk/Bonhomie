# ⚡ QUICK FIX - Run These 2 SQL Scripts NOW

## 🔴 Problem
- "Validation failed" error when adding participants
- Dark modal overlay (should be lighter)
- Updated labels not showing

## ✅ Solution (2 minutes)

### Step 1: Run First SQL Script
1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy entire contents of this file: **`supabase/add_admin_created_flag.sql`**
5. Click **RUN**

### Step 2: Run Second SQL Script  
1. In SQL Editor, click **New Query** again
2. Copy entire contents of this file: **`supabase/add_offline_registration_rls.sql`**
3. Click **RUN**

### Step 3: Hard Refresh Browser
- Press: **`Ctrl + Shift + R`** (Windows) or **`Cmd + Shift + R`** (Mac)
- Or: **`Ctrl + F5`** (Windows)

### Step 4: Test
1. Go to any event → **Participants** tab
2. Click **+ Add** button
3. Enter roll number (e.g., `23ec59`)
4. Click **Verify**
5. Should work now! ✅

---

## 📁 Files to Run (in order)

```
1️⃣ supabase/add_admin_created_flag.sql          ← Adds is_admin_created column
2️⃣ supabase/add_offline_registration_rls.sql    ← Adds permission policies
```

---

## What Changed After Fix

✅ Modal background: **Lighter** (30% opacity instead of 50%)  
✅ Labels: **Clearer** ("Step 1 of 2", better explanations)  
✅ Validation: **Works** (no more "validation failed")  
✅ Profile creation: **Works** (creates with is_admin_created = TRUE)  
✅ Info banner: **Shows** at top of Participants tab  

---

## If Still Not Working

Open browser console (F12) and copy error messages.

Check if column exists:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'is_admin_created';
```

Should return 1 row. If empty, SQL script didn't run successfully.

---

**That's it! Just run 2 SQL scripts + hard refresh browser.**
