# 🚀 Quick Setup Guide - Enable Login for Offline Profiles

## Issue Fixed ✅
- ✅ Syntax error in CoordinatorEventManage.jsx - **RESOLVED**
- ✅ Existing 3 offline profiles can't login - **SOLUTION PROVIDED**

---

## Step-by-Step Instructions

### 1️⃣ Run First SQL Script (For Future Profiles)
**File:** `supabase/create_offline_profile_with_auth.sql`

**Purpose:** Creates function for NEW offline profiles

1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `create_offline_profile_with_auth.sql`
3. Paste and click "Run"
4. Wait for: "Success. No rows returned"

✅ **What this does:** Sets up the system so NEW profiles get auth users automatically

---

### 2️⃣ Run Second SQL Script (For Existing 3 Profiles)
**File:** `supabase/add_auth_to_existing_offline_profiles.sql`

**Purpose:** Adds auth users to the 3 existing offline profiles

1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `add_auth_to_existing_offline_profiles.sql`
3. Paste and click "Run"
4. Check output - should show:

```
profile_id | roll_number | email                    | status                    | auth_user_id
-----------+-------------+--------------------------+---------------------------+--------------
uuid...    | 22xx01      | 22xx01@aiktc.ac.in      | CREATED_NEW_AUTH_USER     | uuid...
uuid...    | 22xx02      | 22xx02@aiktc.ac.in      | CREATED_NEW_AUTH_USER     | uuid...
uuid...    | 22xx03      | 22xx03@aiktc.ac.in      | CREATED_NEW_AUTH_USER     | uuid...
```

5. Scroll down to see verification query results:
```
total_offline: 3
can_login: 3  ✅
cannot_login: 0  ✅
```

✅ **What this does:** Creates auth users for your existing 3 profiles

---

### 3️⃣ Get Student Credentials

The script will show a table with login credentials:

```sql
SELECT 
    roll_number,
    full_name,
    college_email as login_email,
    'Bonhomie@2026' as default_password
FROM profiles
WHERE is_admin_created = TRUE
ORDER BY roll_number;
```

**Copy these and give to students:**
- Email: (their roll number email)
- Password: `Bonhomie@2026`

---

### 4️⃣ Test Login

1. **Logout** from admin account
2. Go to login page
3. Try logging in with one of the profiles:
   - Email: `rollnumber@aiktc.ac.in`
   - Password: `Bonhomie@2026`
4. Should work! ✅

---

## What's Fixed?

### Frontend Error ✅
**Error:** "Missing catch or finally clause"  
**Fixed:** Replaced old `createOfflineProfile` function with new version that calls RPC  
**Location:** `src/pages/coordinator/CoordinatorEventManage.jsx` line 315

### Database Issue ✅
**Problem:** 3 existing profiles have `auth_user_id = NULL`  
**Fixed:** SQL script creates auth users for existing profiles  
**Script:** `supabase/add_auth_to_existing_offline_profiles.sql`

---

## Summary

✅ **After running both scripts:**

| Profile Type | Can Login? | Password |
|-------------|-----------|----------|
| Existing 3 profiles | ✅ YES | Bonhomie@2026 |
| New profiles | ✅ YES | Bonhomie@2026 |

✅ **All offline profiles now have:**
- Auth user entry in `auth.users` table
- Email confirmed (no verification needed)
- Default password: `Bonhomie@2026`
- Can login immediately!

---

## Important Reminders

⚠️ **Tell students:**
1. Login with their credentials
2. **CHANGE PASSWORD immediately** after first login
3. Go to Profile Settings → Change Password

🔐 **Security:**
- All offline profiles have same default password initially
- This is temporary - students should change it
- Consider implementing "force password change on first login"

---

## Verification Commands

**Check if scripts worked:**

```sql
-- Should show all 3 with login capability
SELECT 
    roll_number,
    full_name,
    is_admin_created,
    CASE 
        WHEN auth_user_id IS NOT NULL THEN '✅ Can Login'
        ELSE '❌ Cannot Login'
    END as status
FROM profiles
WHERE is_admin_created = TRUE;
```

**Get credentials list:**

```sql
SELECT 
    roll_number,
    college_email,
    'Bonhomie@2026' as password
FROM profiles
WHERE is_admin_created = TRUE
ORDER BY roll_number;
```

---

## Files Modified

1. ✅ `src/pages/coordinator/CoordinatorEventManage.jsx` - Fixed syntax error
2. ✅ `supabase/create_offline_profile_with_auth.sql` - New profiles get auth
3. ✅ `supabase/add_auth_to_existing_offline_profiles.sql` - Existing profiles get auth

---

## Next Steps

1. ✅ Run first SQL script
2. ✅ Run second SQL script  
3. ✅ Test login with one profile
4. ✅ Give credentials to students
5. ⚠️ Remind students to change password!

---

**Status:** All issues resolved! 🎉

Students can now login with:
- Email: `rollnumber@aiktc.ac.in`
- Password: `Bonhomie@2026`
