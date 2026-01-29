# 🚨 CRITICAL FIXES - Offline Registration

## Issues Fixed

### Issue 1: Foreign Key Constraint Error ✅
**Error:** "insert or update on table "profiles" violates foreign key constraint "profiles_id_fkey""

**Cause:** 
- profiles.id has strict foreign key to auth.users.id
- Creating offline profile with crypto.randomUUID() fails because UUID not in auth.users

**Solution:** Remove foreign key constraint, add optional auth_user_id column

### Issue 2: Offline Users Not Showing in Admin Sidebar ✅
**Problem:** Offline registered users (is_admin_created = TRUE) not visible in admin users list

**Solution:** 
- Updated AdminUsers.jsx to show ALL profiles
- Added "Offline Registered" stat card
- Added orange badge on offline users in table
- Added Roll Number column for better identification

---

## 🔧 SQL Fixes to Run (IN ORDER)

### 1. Run Infinite Recursion Fix (if not done already)
**File:** `supabase/fix_infinite_recursion_emergency.sql`
```bash
# This fixes login/routing issues
```

### 2. Run Foreign Key Fix (NEW - CRITICAL)
**File:** `supabase/fix_offline_profile_foreign_key.sql`
```bash
# This allows offline profile creation
```

### 3. Run Admin Created Flag (if not done already)
**File:** `supabase/add_admin_created_flag.sql`
```bash
# This adds is_admin_created column
```

---

## 📋 Complete Setup Steps

### Step 1: Run SQL Scripts in Supabase

**Go to Supabase Dashboard → SQL Editor**

Run these IN ORDER (copy entire file contents):

1️⃣ `fix_infinite_recursion_emergency.sql` - Fixes login routing
2️⃣ `add_admin_created_flag.sql` - Adds is_admin_created column  
3️⃣ `fix_offline_profile_foreign_key.sql` - Removes FK constraint ⭐ NEW

### Step 2: Hard Refresh Browser
```
Ctrl + Shift + R  (Windows)
Cmd + Shift + R   (Mac)
```

### Step 3: Test Offline Registration

1. **Login as Admin/Coordinator**
2. **Go to any event → Participants tab**
3. **Click "+ Add" button**
4. **Enter roll number (e.g., test999)**
5. **Click "Verify" → Should say "Profile not found"**
6. **Click "Create New Profile"**
7. **Fill in:**
   - Full Name: Test Offline User
   - Phone: 9876543210
   - Email: (auto-filled)
8. **Click "Create Profile"**

**Expected Result:**
- ✅ Success message appears
- ✅ Profile created (no foreign key error)
- ✅ is_admin_created = TRUE in database

### Step 4: Verify in Admin Users Page

1. **Go to Admin Dashboard → Users**
2. **Should see:**
   - ✅ "Offline Registered" stat card (shows count)
   - ✅ Test user in table with orange "Offline Registration" badge
   - ✅ Roll number column showing test999

---

## 🔍 What Each SQL Script Does

### fix_infinite_recursion_emergency.sql
```sql
-- Removes recursive RLS policies
-- Restores safe policies that don't query profiles within profiles
-- Fixes: Login routing, profile fetch
```

### add_admin_created_flag.sql
```sql
-- Adds: is_admin_created BOOLEAN column
-- Default: FALSE for existing users
-- Sets: TRUE for offline registered users
```

### fix_offline_profile_foreign_key.sql ⭐ NEW
```sql
-- Removes: profiles.id foreign key to auth.users
-- Adds: auth_user_id UUID column (nullable)
-- Allows: Profiles without auth users (offline registration)
-- Future: When user signs up, link via auth_user_id
```

---

## 📊 Database Schema Changes

### Before:
```sql
profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY  ← Strict FK
)
```

### After:
```sql
profiles (
  id UUID PRIMARY KEY,  ← No FK constraint
  auth_user_id UUID,    ← Links to auth.users when activated
  is_admin_created BOOLEAN DEFAULT FALSE
)
```

**How it works:**
1. **Offline profile created:**
   - id = random UUID (e.g., abc-123...)
   - auth_user_id = NULL
   - is_admin_created = TRUE
   
2. **User signs up later:**
   - Gets new auth.users entry (e.g., xyz-789...)
   - We UPDATE profile: auth_user_id = xyz-789...
   - Now linked to auth user
   
3. **Self-registered user:**
   - id = auth.uid() (same as auth.users.id)
   - auth_user_id = NULL (not needed)
   - is_admin_created = FALSE

---

## ✅ Verification Queries

### 1. Check FK constraint removed
```sql
SELECT conname 
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND conname = 'profiles_id_fkey';
```
Expected: **0 rows** (constraint removed)

### 2. Check columns exist
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name IN ('is_admin_created', 'auth_user_id');
```
Expected: **2 rows** (both columns exist)

### 3. Test offline profile creation
```sql
INSERT INTO profiles (id, full_name, college_email, roll_number, phone, is_admin_created, role)
VALUES (
    gen_random_uuid(),
    'SQL Test User',
    'sqltest@aiktc.ac.in',
    'sqltest123',
    '9999999999',
    TRUE,
    'student'
);
```
Expected: **Success** (no FK error)

### 4. View offline profiles
```sql
SELECT 
    roll_number, 
    full_name, 
    college_email,
    is_admin_created,
    auth_user_id,
    created_at
FROM profiles
WHERE is_admin_created = TRUE
ORDER BY created_at DESC;
```

### 5. Count stats
```sql
SELECT 
    is_admin_created,
    COUNT(*) as count
FROM profiles
GROUP BY is_admin_created;
```

---

## 🎨 UI Changes (Already Applied)

### AdminUsers.jsx
1. ✅ Added 5th stat card: "Offline Registered"
2. ✅ Added orange badge on offline users in table
3. ✅ Added Roll Number column (visible for all users)
4. ✅ Added console logs for debugging
5. ✅ Better error handling

**Visual indicators:**
- **Online users**: No badge
- **Offline users**: 🟠 Orange "Offline Registration" badge

---

## 🐛 Troubleshooting

### Still getting FK constraint error?

**Check if SQL ran:**
```sql
-- Should show profiles_id_fkey does NOT exist
SELECT * FROM pg_constraint 
WHERE conname = 'profiles_id_fkey';
```

**If constraint still exists:**
```sql
-- Force drop it
ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey CASCADE;
```

### Offline users not showing?

**Check column exists:**
```sql
SELECT * FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'is_admin_created';
```

**Check data:**
```sql
SELECT COUNT(*), is_admin_created 
FROM profiles 
GROUP BY is_admin_created;
```

**Hard refresh browser:**
- Close ALL tabs
- Clear cache (Ctrl+Shift+Del)
- Reopen app

### Profile creation succeeds but not visible?

**Check if profile was created:**
```sql
SELECT * FROM profiles 
WHERE roll_number = 'your_test_roll_number'
ORDER BY created_at DESC 
LIMIT 1;
```

**Check RLS policies:**
```sql
SELECT * FROM profiles;  -- Run this while logged in
```

If returns nothing, RLS is blocking. Run recursion fix again.

---

## 🔐 Security Considerations

### Is it safe to remove FK constraint?

**YES**, because:

1. **is_admin_created flag** tracks profile source
2. **auth_user_id column** will link to auth.users when activated
3. **Audit logs** track all profile creations
4. **Application validates** user permissions before showing UI
5. **Route guards** prevent unauthorized access

### What about orphaned profiles?

**Offline profiles are intentionally "orphaned":**
- Created by coordinators for students who didn't register online
- Student must sign up later to activate account
- When they sign up, we link via auth_user_id or email

**Cleanup query** (if needed):
```sql
-- Find offline profiles older than 6 months not activated
SELECT * FROM profiles
WHERE is_admin_created = TRUE
AND auth_user_id IS NULL
AND created_at < NOW() - INTERVAL '6 months';
```

---

## 📁 Files Modified

### SQL Files (Run in Supabase):
1. ✅ `supabase/fix_infinite_recursion_emergency.sql` - Login fix
2. ✅ `supabase/add_admin_created_flag.sql` - Add column
3. ✅ `supabase/fix_offline_profile_foreign_key.sql` - Remove FK ⭐ NEW

### Frontend Files (Already Updated):
1. ✅ `src/pages/admin/AdminUsers.jsx` - Show offline users
2. ✅ `src/pages/coordinator/CoordinatorEventManage.jsx` - Create profiles

---

## ✅ Success Checklist

After running all fixes:

- [ ] All 3 SQL scripts ran without errors
- [ ] Hard refreshed browser (Ctrl+Shift+R)
- [ ] Can login and go to correct dashboard
- [ ] Can create offline profile without FK error
- [ ] Offline users show in Admin Users page
- [ ] "Offline Registered" stat shows correct count
- [ ] Orange badge appears on offline users
- [ ] Roll number column visible
- [ ] No console errors

---

## 🚀 Ready for Production

Once all checks pass:
- ✅ Login/routing works
- ✅ Offline registration works
- ✅ Users visible in admin panel
- ✅ Foreign key issues resolved
- ✅ No infinite recursion
- ✅ System stable

**Time to complete:** ~5 minutes (run 3 SQL scripts + refresh)
