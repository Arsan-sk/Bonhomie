# ⚡ QUICK FIX - Run These 3 SQL Scripts

## 🚨 Two Critical Issues Fixed

1. ❌ **Foreign key error** when creating offline profiles  
2. ❌ **Offline users not showing** in admin panel

## ✅ Solution (5 minutes)

### Run These SQL Scripts IN ORDER:

**Supabase Dashboard → SQL Editor**

```
1️⃣ fix_infinite_recursion_emergency.sql    ← Login routing fix
2️⃣ add_admin_created_flag.sql              ← Add is_admin_created column
3️⃣ fix_offline_profile_foreign_key.sql     ← Remove FK constraint ⭐ CRITICAL
```

### Then:
- **Hard refresh**: `Ctrl + Shift + R`
- **Test offline registration**
- **Check Admin → Users page**

---

## What Each Script Does

### 1. fix_infinite_recursion_emergency.sql
- Fixes login routing for all users
- Removes recursive RLS policies
- **Must run first**

### 2. add_admin_created_flag.sql
- Adds `is_admin_created` column to profiles
- Marks offline vs online registrations

### 3. fix_offline_profile_foreign_key.sql ⭐ NEW
- **Removes** profiles.id FK to auth.users
- **Adds** auth_user_id column
- **Fixes** foreign key constraint error

---

## Expected Results

### Before:
❌ Error: "violates foreign key constraint profiles_id_fkey"  
❌ Offline users invisible in admin panel

### After:
✅ Offline profiles created successfully  
✅ Offline users show with orange badge  
✅ "Offline Registered" stat card appears  
✅ Roll number column added

---

## Quick Test

1. Go to event → Participants → + Add
2. Create test profile (roll: test999)
3. Should succeed (no FK error)
4. Check Admin → Users
5. Should see test999 with orange badge

---

## If Still Not Working

### FK Error persists:
```sql
ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey CASCADE;
```

### Users not showing:
- Hard refresh browser
- Check console (F12) for logs
- Verify column exists:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'is_admin_created';
```

---

**Files:**
- `supabase/fix_infinite_recursion_emergency.sql`
- `supabase/add_admin_created_flag.sql`  
- `supabase/fix_offline_profile_foreign_key.sql` ⭐
