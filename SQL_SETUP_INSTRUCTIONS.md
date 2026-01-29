# SQL Setup Instructions for Offline Registration

## 🚨 CRITICAL: Run These SQL Scripts IMMEDIATELY

The offline registration feature won't work until you run this SQL migration in your Supabase SQL Editor.

---

## Step 1: Add `is_admin_created` Column ⭐ REQUIRED

**File:** `supabase/add_admin_created_flag.sql`

### How to Run:
1. Open your Supabase Dashboard
2. Go to **SQL Editor** in the left sidebar
3. Click **"+ New Query"**
4. Copy and paste the ENTIRE contents of `supabase/add_admin_created_flag.sql`
5. Click **"Run"** button

### What This Does:
- Adds `is_admin_created BOOLEAN` column to `profiles` table
- Sets default value to `FALSE` for all existing profiles
- Creates index for performance
- Adds documentation comments

### Verification:
After running, you should see:
```
Success. No rows returned
```

To verify the column was added:
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'is_admin_created';
```

Expected result:
```
column_name      | data_type | column_default
is_admin_created | boolean   | false
```

---

## Step 2: Verify Your Current Schema

Run this query to check if you have all required tables:

```sql
-- Check profiles table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Check registrations table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'registrations'
ORDER BY ordinal_position;
```

---

## Step 3: Check for Required Columns

The offline registration feature requires these columns:

### In `profiles` table:
- ✅ `id` (UUID)
- ✅ `full_name` (TEXT)
- ✅ `roll_number` (TEXT, UNIQUE)
- ✅ `college_email` (TEXT)
- ✅ `phone` (TEXT)
- ✅ `role` (TEXT or ENUM)
- ⭐ **`is_admin_created`** (BOOLEAN) - **MUST ADD THIS!**

### In `registrations` table:
- ✅ `id` (UUID)
- ✅ `profile_id` (UUID)
- ✅ `event_id` (UUID)
- ✅ `payment_mode` (TEXT) - should accept 'offline' value
- ✅ `status` (TEXT) - should accept 'confirmed' value
- ✅ `team_members` (JSONB array)

---

## Troubleshooting

### Error: "column 'is_admin_created' of relation 'profiles' does not exist"
**Solution:** Run `supabase/add_admin_created_flag.sql`

### Error: "duplicate key value violates unique constraint"
**Solution:** You're trying to create a profile that already exists. Check with:
```sql
SELECT * FROM profiles WHERE roll_number = '23ec59';
```

### Error: "validation failed. please try again"
**Possible causes:**
1. `is_admin_created` column doesn't exist (run SQL migration!)
2. RLS policies blocking insert
3. Email domain validation failing

**Debug query:**
```sql
-- Check if RLS is blocking
SELECT * FROM profiles WHERE roll_number = 'your_roll_number_here';
```

---

## After Running SQL Migration

### 1. Hard Refresh Browser
Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac) to clear cache

### 2. Restart Dev Server
```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### 3. Test the Feature
1. Go to Coordinator Dashboard
2. Select an event
3. Click **Participants** tab
4. Click **+ Add** button
5. Try entering a roll number (e.g., `23ec59`)
6. Click **Verify**

---

## Expected Behavior After Fix

### When Roll Number Exists:
- Shows green success message with student details
- "Add Participant" button enabled

### When Roll Number Doesn't Exist:
- Shows yellow warning message
- "Create New Profile" button appears
- Clicking it opens a form to create new profile

### When Creating New Profile:
- Form validates email domain
- Form validates phone number (10 digits)
- Profile created with `is_admin_created = TRUE`
- Success message: "Student must sign up with this email to activate their account"

---

## Database Queries for Monitoring

### Count offline registrations:
```sql
SELECT 
    COUNT(*) as total_offline_profiles,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7_days
FROM profiles 
WHERE is_admin_created = TRUE;
```

### View recent offline registrations:
```sql
SELECT 
    p.roll_number,
    p.full_name,
    p.college_email,
    p.phone,
    p.created_at,
    e.name as event_name,
    r.status
FROM profiles p
LEFT JOIN registrations r ON r.profile_id = p.id
LEFT JOIN events e ON e.id = r.event_id
WHERE p.is_admin_created = TRUE
ORDER BY p.created_at DESC
LIMIT 20;
```

### Find profiles without auth accounts:
```sql
-- Profiles created by admin that user hasn't activated yet
SELECT 
    p.roll_number,
    p.full_name,
    p.college_email,
    p.created_at,
    CASE 
        WHEN au.id IS NULL THEN 'Not Activated'
        ELSE 'Activated'
    END as status
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.id
WHERE p.is_admin_created = TRUE
ORDER BY p.created_at DESC;
```

---

## RLS Policy Check

Make sure your RLS policies allow coordinators/admins to insert into profiles:

```sql
-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';
```

If coordinators can't insert, you may need to add:

```sql
-- Allow coordinators/admins to create profiles
CREATE POLICY "coordinators_can_create_offline_profiles"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('coordinator', 'admin')
    )
);
```

---

## Next Steps

1. ✅ Run `supabase/add_admin_created_flag.sql` in SQL Editor
2. ✅ Hard refresh your browser (Ctrl+Shift+R)
3. ✅ Test adding a participant
4. ✅ If still issues, check browser console for errors (F12)
5. ✅ If needed, check RLS policies

---

## Support

If you're still experiencing issues after running the SQL migration and refreshing:

1. Open browser console (F12)
2. Go to Console tab
3. Try adding a participant
4. Copy any error messages
5. Check the Network tab for failed requests
