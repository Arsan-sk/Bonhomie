## 🔍 IMMEDIATE DEBUGGING STEPS

Run this in **Supabase SQL Editor** while logged in as admin:

```sql
-- Check if you're authenticated and what role you have
SELECT 
    auth.uid() as my_user_id,
    auth.role() as my_auth_role,
    profiles.role as my_profile_role,
    profiles.full_name
FROM profiles
WHERE profiles.id = auth.uid();
```

**Expected result:**
- my_user_id: [some UUID]
- my_auth_role: 'authenticated'
- my_profile_role: 'admin'
- full_name: [your name]

**If you get NO ROWS**: Your session is broken - logout and login again

---

## Check Coordinators

```sql
-- See all coordinators in database
SELECT id, full_name, college_email, role
FROM profiles
WHERE role = 'faculty'
ORDER BY full_name;
```

**How many rows?** This is what should appear in dropdown.

---

## Check Assignments

```sql
-- See assignments with coordinator details
SELECT 
    ea.id,
    ea.event_id,
    e.name as event_name,
    p.full_name as coordinator_name,
    p.college_email
FROM event_assignments ea
JOIN events e ON e.id = ea.event_id
JOIN profiles p ON p.id = ea.coordinator_id;
```

**Run these and tell me the results!**
