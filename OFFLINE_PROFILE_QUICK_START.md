# 🚀 Quick Start: Offline Profile Creation

## For Admins

### Creating a New Offline Profile

1. **Navigate to Users Page**
   - Go to: **Admin → Users**

2. **Click "Add New Profile"**
   - Blue button in top-right corner
   - Icon: UserPlus (person with plus sign)

3. **Fill in the Form**
   ```
   Roll Number:  22CS01        [Required] ✅
   Full Name:    John Doe      [Required] ✅
   Phone:        9876543210    [Optional]
   Email:        Auto-filled   [Auto-generated from roll number]
   ```

4. **Click "Create Profile"**
   - Validation runs automatically
   - Success alert shows profile details
   - Profile appears in list immediately

5. **Verify Success**
   - Look for orange "Offline Registration" badge
   - Check "Offline Registered" stat card increments
   - Profile is searchable and filterable

---

## Form Validation Rules

### Roll Number
- **Format:** `##XX##` (e.g., `22CS01`)
- **Pattern:** 2 digits + 2 letters + 2 digits
- **Case:** Automatically uppercase
- **Unique:** Cannot create duplicate
- **Examples:** 
  - ✅ `22CS01`
  - ✅ `23ME15`
  - ❌ `22cs01` (will be converted to uppercase)
  - ❌ `2201` (invalid format)

### Full Name
- **Required:** Yes
- **Format:** Any text
- **Example:** `John Doe`, `Mohammed Ali Khan`

### Phone Number
- **Required:** No
- **Format:** Digits only
- **Length:** Typically 10 digits
- **Example:** `9876543210`

### Email
- **Auto-generated:** `rollnumber@aiktc.ac.in`
- **Editable:** Yes, can modify if needed
- **Format:** Must be valid email
- **Example:** `22cs01@aiktc.ac.in`

---

## What Happens After Creation?

### Database Changes
```sql
INSERT INTO profiles (
    id,                -- Random UUID (crypto.randomUUID())
    roll_number,       -- From form
    full_name,         -- From form
    college_email,     -- Auto-generated or custom
    phone,             -- From form (optional)
    role,              -- Always 'student'
    is_admin_created,  -- TRUE (marks as offline)
    auth_user_id,      -- NULL (no auth user yet)
    department,        -- 'General' (default)
    created_at         -- Current timestamp
)
```

### UI Updates
- ✅ Modal closes
- ✅ User list refreshes
- ✅ New profile appears with orange badge
- ✅ "Offline Registered" count +1
- ✅ Success alert shows details

### Audit Trail
```sql
INSERT INTO audit_logs (
    action_type,  -- 'profile_created_offline'
    entity_type,  -- 'profile'
    entity_id,    -- Profile UUID
    details       -- Full profile data + metadata
)
```

---

## Important Notes

### ⚠️ Login Status
**Offline profiles CANNOT login immediately** because:
- No entry in `auth.users` table
- No password set
- `auth_user_id` is `NULL`

**Solution:** Students must activate their accounts:
1. Go to registration page
2. Enter email (rollnumber@aiktc.ac.in)
3. Create password
4. System links auth user to existing profile
5. Login now works

### ✅ Profile Usage
**Offline profiles CAN:**
- ✅ Be searched in event registration
- ✅ Be registered for events
- ✅ Be added to teams
- ✅ Be edited by admins
- ✅ Appear in reports and exports

**Offline profiles CANNOT:**
- ❌ Login to the website (until activated)
- ❌ View their own dashboard (until activated)
- ❌ Update their own profile (until activated)
- ❌ Register for events themselves (until activated)

### 🎯 Use Cases

**When to Create Offline Profiles:**
1. Student doesn't have internet access
2. Student prefers in-person registration
3. Bulk registration during orientation
4. Pre-registration before event starts
5. Student needs assistance with registration

**When NOT to Create:**
1. Student can register themselves online
2. Student already has an account
3. Uncertain about student details

---

## Error Messages & Solutions

### "Invalid roll number format"
- **Cause:** Roll number doesn't match `##XX##` pattern
- **Solution:** Use format like `22CS01` (2 digits, 2 letters, 2 digits)

### "Profile with roll number XXYYXX already exists"
- **Cause:** Another profile has this roll number
- **Solution:** Use unique roll number or check existing profile

### "Roll Number and Full Name are required"
- **Cause:** Empty required fields
- **Solution:** Fill in both Roll Number and Full Name

### "Failed to create profile: [error]"
- **Cause:** Database error or permission issue
- **Solution:** Check console logs, verify RLS policies

---

## Tips & Best Practices

### 🎓 For Efficiency
1. Keep roll number list handy
2. Have student details ready before opening modal
3. Use auto-generated email (faster)
4. Add phone numbers when available (helps with communication)

### 🔍 For Verification
1. Check "Offline Registered" stat after each creation
2. Search for new profile immediately to verify
3. Look for orange badge on profile row
4. Check console logs for confirmation

### 📊 For Reporting
- Filter by role to see only students
- Export user list with offline badge indicator
- Check audit logs for creation history
- Monitor activation rate (auth_user_id NOT NULL)

---

## Keyboard Shortcuts (In Modal)

- **Tab:** Move to next field
- **Shift + Tab:** Move to previous field
- **Escape:** Close modal (when not creating)
- **Enter:** Submit form (when fields are valid)

---

## Visual Indicators

### Profile Badges

**Orange Badge:**
```
┌─────────────────────────────┐
│ John Doe                    │
│ [Offline Registration]      │  ← Orange badge
└─────────────────────────────┘
```

**Without Badge:**
```
┌─────────────────────────────┐
│ Jane Smith                  │  ← No badge (online registration)
└─────────────────────────────┘
```

### Stat Cards

```
┌──────────────────┐  ┌──────────────────┐
│ Total Users      │  │ Offline Reg.     │
│ 1,234           │  │ 156              │  ← Shows offline count
└──────────────────┘  └──────────────────┘
```

---

## Common Workflows

### Workflow 1: Single Profile Creation
```
Navigate → Click "Add" → Fill form → Create → Verify
```
**Time:** ~30 seconds

### Workflow 2: Bulk Creation
```
For each student:
  1. Click "Add New Profile"
  2. Paste roll number
  3. Paste name
  4. Click "Create"
  5. Repeat
```
**Time:** ~20 seconds per student

### Workflow 3: Create + Register for Event
```
1. Admin Users → Add Profile → Create
2. Coordinator → Events → Manage Event
3. Add Participants → Search roll number
4. Register for event
```
**Time:** ~1 minute total

---

## Testing Checklist

After creating a profile, verify:

- [ ] Profile appears in user list
- [ ] Orange badge visible
- [ ] Roll number correct
- [ ] Full name correct
- [ ] Email auto-generated correctly
- [ ] "Offline Registered" count increased
- [ ] Profile searchable
- [ ] Profile shows in event registration search
- [ ] Console shows success logs
- [ ] Can register profile for events

---

## Student Activation Guide

**Provide to students after creating their profiles:**

```
📧 Your Profile Has Been Created!

Your details:
- Roll Number: 22CS01
- Email: 22cs01@aiktc.ac.in

To activate your account:
1. Go to [Website URL]/register
2. Enter your email: 22cs01@aiktc.ac.in
3. Create a strong password
4. Click "Create Account"
5. Your account is now active!

You can now:
✅ Login to the website
✅ View your dashboard
✅ Register for events
✅ Update your profile
✅ View your registrations

Need help? Contact: [Support Email/Phone]
```

---

## Troubleshooting Quick Fixes

| Problem | Quick Fix |
|---------|-----------|
| Button not visible | Verify admin role, refresh page |
| Modal won't open | Check console, clear cache |
| Form validation fails | Check roll number format |
| Profile not appearing | Refresh page, check filters |
| Can't register for event | Verify profile created, check RLS |
| Student can't login | Normal! They need to activate first |

---

## SQL Quick Queries

**Check if profile created:**
```sql
SELECT * FROM profiles WHERE roll_number = '22CS01';
```

**Check offline profiles:**
```sql
SELECT roll_number, full_name, is_admin_created, auth_user_id
FROM profiles 
WHERE is_admin_created = TRUE
ORDER BY created_at DESC;
```

**Check activation status:**
```sql
SELECT 
  COUNT(*) as total_offline,
  COUNT(auth_user_id) as activated,
  COUNT(*) - COUNT(auth_user_id) as pending
FROM profiles
WHERE is_admin_created = TRUE;
```

---

## File Locations

**Frontend:**
- Component: `src/pages/admin/AdminUsers.jsx`
- Function: `createOfflineProfile()` (line ~45)
- Modal: Lines ~270-400

**Backend:**
- Database: `profiles` table
- Audit: `audit_logs` table
- RLS: `supabase/rls_policies.sql`

---

## Support Resources

**Documentation:**
- Full Guide: `OFFLINE_REGISTRATION_COMPLETE_GUIDE.md`
- Database Schema: `supabase/schema.sql`
- RLS Policies: `supabase/rls_policies_simplified.sql`

**Migration Scripts:**
- Add column: `supabase/add_admin_created_flag.sql`
- Fix FK: `supabase/fix_offline_profile_foreign_key.sql`
- Fix RLS: `supabase/fix_infinite_recursion_emergency.sql`
- Auth users: `supabase/create_auth_for_offline_profiles.sql`

---

**Last Updated:** January 29, 2026  
**Version:** 1.0  
**Status:** ✅ Production Ready
