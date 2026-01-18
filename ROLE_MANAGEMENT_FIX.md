# Role Management Fix - Testing Guide

## Issue Fixed
- **Problem**: Admins could not promote/demote users due to RLS policy restrictions
- **Root Cause**: RLS policy only allowed users to update their own profiles
- **Solution**: Added separate policy allowing admins to update any profile including roles

## Files Changed
1. `supabase/fix_admin_role_update.sql` - Database migration (NEW)
2. `src/pages/admin/AdminCoordinators.jsx` - Frontend updates

## Testing Steps

### 1. Run SQL Migration
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste entire content from `supabase/fix_admin_role_update.sql`
3. Click "Run"
4. Verify success messages appear

### 2. Verify Policies Created
Run this query in Supabase SQL Editor:
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND policyname LIKE '%update%profile%'
ORDER BY policyname;
```

Expected output should show:
- ✅ "Users can update own profile" (with role protection)
- ✅ "Admins can update any profile" (no restrictions)

### 3. Test Promotion (Student → Coordinator)
1. Login as Admin
2. Go to Admin Dashboard → Coordinators
3. Search for a student user by email
4. Click "Promote to Coordinator"
5. Open browser console (F12) to see logs
6. Verify:
   - ✅ Success message appears
   - ✅ Console shows: "Update successful, returned data: [...]"
   - ✅ User appears in coordinators table
   - ✅ User's role in profiles table is 'coordinator'

### 4. Test Demotion (Coordinator → Student)
1. In coordinators table, find the user you just promoted
2. Click "Revoke" button
3. Confirm the action
4. Verify:
   - ✅ Success message: "Success! [Name] is now a Student."
   - ✅ User disappears from coordinators table
   - ✅ User's role in profiles table is 'student'

### 5. Verify Role Persistence
1. Refresh the page
2. Check if role changes are still there
3. Try logging in as the promoted/demoted user
4. Verify they see correct dashboard (student or coordinator)

## Console Logs to Monitor

### On Promotion:
```
Promoting user: { userId: "xxx", currentRole: "student", newRole: "coordinator" }
Update successful, returned data: [{ id: "xxx", role: "coordinator", ... }]
```

### On Demotion:
```
Update successful, returned data: [{ id: "xxx", role: "student", ... }]
```

## Common Issues & Solutions

### Issue: "Failed to promote user: new row violates row-level security policy"
**Solution**: SQL migration not run yet. Run `fix_admin_role_update.sql`

### Issue: Success message but role not changed
**Diagnosis**: Check console logs for actual Supabase response
**Solution**: 
- Verify admin is logged in (check auth.uid() matches admin user)
- Verify admin user has role = 'admin' in profiles table
- Check policies exist with verification query above

### Issue: "Update successful" but data is null or empty array
**Problem**: Update went through but returned no rows
**Solution**: This means RLS is blocking the SELECT after update
- Run the SQL migration which fixes WITH CHECK clause

## Manual Database Check

Run this to manually verify a user's current role:
```sql
SELECT id, full_name, college_email, role, updated_at
FROM profiles
WHERE college_email = 'user@example.com';
```

## Rollback (if needed)

If something goes wrong, rollback to original policy:
```sql
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (id = auth.uid());
```

## Success Criteria
- ✅ No console errors when promoting/demoting
- ✅ Success messages appear
- ✅ Role changes persist in database
- ✅ User sees correct dashboard after role change
- ✅ Coordinators table updates in real-time
- ✅ Regular users still cannot change their own roles
