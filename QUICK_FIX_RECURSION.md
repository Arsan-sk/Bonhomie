# ⚡ CRITICAL FIX - Run This SQL NOW

## 🚨 Problem
- All users redirected to student dashboard
- Error: "infinite recursion detected in policy for relation profiles"
- Login broken

## ✅ Solution (2 minutes)

### Run This SQL Script:
**File:** `supabase/fix_infinite_recursion_emergency.sql`

1. Supabase Dashboard → SQL Editor
2. New Query
3. Copy entire file contents
4. Run

### Then:
- Hard refresh browser: **Ctrl + Shift + R**
- Log out and log back in
- Should redirect to correct dashboard now!

---

## What Happened?

**BAD Policy (causes recursion):**
```sql
-- Queries profiles table INSIDE profiles policy = infinite loop
CREATE POLICY "coordinators_can_view_all_profiles"
ON profiles FOR SELECT
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())  ← RECURSION!
);
```

**GOOD Policy (no recursion):**
```sql
-- Uses auth.role() instead = no recursion
CREATE POLICY "Authenticated users read profiles"
ON profiles FOR SELECT
USING (auth.role() = 'authenticated');  ← NO RECURSION
```

---

## Expected Results After Fix

✅ Admin login → `/admin/dashboard`  
✅ Coordinator login → `/coordinator/dashboard`  
✅ Student login → `/student/dashboard`  
✅ No more "infinite recursion" errors  
✅ Offline registration still works  

---

## If Still Not Working

Check browser console (F12) for these logs:
- "User role: [role]"
- "AdminRoute: Admin access granted"

If not seeing logs:
1. Clear ALL browser cache
2. Close all tabs
3. Reopen in new window

---

**File to run:** `supabase/fix_infinite_recursion_emergency.sql`  
**DO NOT run:** `supabase/add_offline_registration_rls.sql` (that's the broken one)
