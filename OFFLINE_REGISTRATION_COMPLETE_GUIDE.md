# Offline Registration System - Complete Implementation Guide

**Last Updated:** January 29, 2026  
**Status:** ✅ Fully Functional + Login Fix Available

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features Implemented](#features-implemented)
3. [How It Works](#how-it-works)
4. [Usage Guide](#usage-guide)
5. [Login Issue & Solutions](#login-issue--solutions)
6. [Database Schema](#database-schema)
7. [SQL Queries](#sql-queries)
8. [Testing Checklist](#testing-checklist)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The **Offline Registration System** allows Admins and Coordinators to register students who:
- Don't have access to the internet
- Prefer in-person registration
- Need assistance with the registration process
- Have technical difficulties

### Key Capabilities

✅ **Two Registration Methods:**
1. **Admin Users Tab** - Direct profile creation (NEW!)
2. **Event Management Tab** - Register students for specific events

✅ **Profile Management:**
- Create profiles without auth users (uses `crypto.randomUUID()`)
- Profiles marked with `is_admin_created = TRUE`
- Orange "Offline Registration" badges for easy identification

✅ **No Limits:**
- No 1000-user query limits
- Shows exact counts from database
- Fetches ALL profiles in one query

✅ **Future Login:**
- Students can activate accounts later
- Choose their own passwords (secure)
- Links to existing offline profiles

---

## ✨ Features Implemented

### 1. Admin Users Page Enhancement

**Location:** `src/pages/admin/AdminUsers.jsx`

**New Features:**
- **"Add New Profile" Button** - Blue button in header
- **Create Profile Modal** - Clean, user-friendly form
- **Form Fields:**
  - Roll Number (Required, Format: `22CS01`)
  - Full Name (Required)
  - Phone Number (Optional)
  - Email (Auto-generated from roll number)
- **Validation:**
  - Roll number format check
  - Duplicate prevention
  - Required field validation
- **Success Flow:**
  - Profile created with UUID
  - Marked as `is_admin_created = TRUE`
  - Added to audit log
  - User list refreshes automatically

### 2. Event Management Registration

**Location:** `src/pages/coordinator/CoordinatorEventManage.jsx`

**Features:**
- Register individual students for events
- Register entire teams for events
- Create profiles on-the-fly during team member search
- Validate roll numbers before registration
- Check duplicate registrations
- Payment mode tracking (marked as "offline")

### 3. Database Enhancements

**New Columns:**
```sql
profiles:
  - is_admin_created BOOLEAN DEFAULT FALSE
  - auth_user_id UUID (nullable, links to auth.users when activated)

registrations:
  - payment_mode TEXT (can be 'offline')
```

**RLS Policy Fixes:**
- Removed infinite recursion issues
- Simplified policies using `auth.role()`
- Removed `profiles.id` → `auth.users` foreign key constraint

### 4. User Stats Dashboard

**5 Stat Cards:**
1. 📊 Total Users
2. 🛡️ Admins
3. 👥 Coordinators
4. 🎓 Students
5. 📝 Offline Registered (NEW!)

All stats show **exact counts** - no limits.

---

## 🔄 How It Works

### Profile Creation Flow

```
1. Admin clicks "Add New Profile" button
   ↓
2. Modal opens with form
   ↓
3. Admin enters:
   - Roll Number (22CS01)
   - Full Name (John Doe)
   - Phone (Optional)
   ↓
4. System validates:
   - Format check (##XX##)
   - Duplicate check
   ↓
5. Profile created:
   - id: crypto.randomUUID() (NOT from auth.users)
   - is_admin_created: TRUE
   - auth_user_id: NULL (no auth yet)
   - role: 'student'
   - email: rollnumber@aiktc.ac.in
   ↓
6. Audit log entry created
   ↓
7. User list refreshes
   ↓
8. Profile shows with orange "Offline Registration" badge
```

### What Happens When Student Tries to Login?

**Current Behavior:**
- Student goes to login page
- Enters email: `22cs01@aiktc.ac.in`
- Enters any password
- Result: ❌ "Invalid login credentials"

**Why?**
- Profile exists in `profiles` table
- **BUT** no entry in `auth.users` table
- Supabase Auth requires `auth.users` entry for login

---

## 🔐 Login Issue & Solutions

### Problem Statement

Offline-created profiles **cannot login** because:
1. They only exist in `profiles` table
2. They have NO entry in `auth.users` table
3. `auth_user_id` is `NULL`

### Solution 1: Student Self-Activation (⭐ RECOMMENDED)

**Advantages:**
- Students choose their own passwords (secure)
- No default password management
- Students verify their own email
- More secure and user-friendly

**Implementation:**

1. **Student Registration Page Enhancement**

```javascript
// In registration form, check if profile exists
const checkExistingProfile = async (email) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('college_email', email)
    .eq('is_admin_created', true)
    .is('auth_user_id', null)
    .single()
  
  return profile // If exists, it's an offline profile needing activation
}

// During sign-up
const signUp = async (email, password, rollNumber) => {
  // Check if offline profile exists
  const offlineProfile = await checkExistingProfile(email)
  
  if (offlineProfile) {
    // Activate existing profile
    const { data: authUser, error } = await supabase.auth.signUp({
      email,
      password
    })
    
    if (!error) {
      // Link auth user to existing profile
      await supabase
        .from('profiles')
        .update({ auth_user_id: authUser.user.id })
        .eq('id', offlineProfile.id)
      
      alert('✅ Your account has been activated!')
    }
  } else {
    // Normal registration (create new profile)
    // ... existing code
  }
}
```

2. **Instructions for Students**

Display message when offline profile detected:
```
🎉 Great news! Your profile already exists.

Your details have been pre-registered by the admin.
Just set your password to activate your account.

Roll Number: 22CS01
Email: 22cs01@aiktc.ac.in

Click "Create Account" to set your password.
```

### Solution 2: Bulk Auth User Creation (⚠️ NOT RECOMMENDED)

**File:** `supabase/create_auth_for_offline_profiles.sql`

**Why NOT Recommended:**
- Requires default passwords (security risk)
- Students don't choose their own passwords
- Password management burden
- Students need to change passwords later

**If You Must Use It:**

```sql
-- Run in Supabase SQL Editor ONLY (has service role access)
SELECT * FROM create_auth_for_offline_profiles();
```

This will:
- Create auth users for all offline profiles
- Set default password: `Bonhomie@2026`
- Link `auth_user_id` to profiles
- Allow immediate login

**Then inform students:**
```
Your temporary credentials:
Email: 22cs01@aiktc.ac.in
Password: Bonhomie@2026

⚠️ CHANGE YOUR PASSWORD IMMEDIATELY after first login!
```

### Solution 3: Admin Invitation System

**Advantages:**
- Secure email-based activation
- Students receive invitation link
- Password set during activation
- Built into Supabase

**Implementation:**

1. **Add "Send Invitation" Button**

```javascript
const sendInvitation = async (profileId, email) => {
  // Use Supabase Admin API (backend only!)
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)
  
  if (!error) {
    // Update profile with auth_user_id
    await supabase
      .from('profiles')
      .update({ auth_user_id: data.user.id })
      .eq('id', profileId)
  }
}
```

2. **Backend Required**
- Cannot call from frontend (needs service role key)
- Create API endpoint in your backend
- Frontend calls your API, which calls Supabase Admin API

---

## 💾 Database Schema

### profiles Table

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY,  -- Uses crypto.randomUUID(), NOT auth.users.id
    roll_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    college_email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'student',
    department TEXT DEFAULT 'General',
    year_of_study TEXT,
    
    -- Offline Registration Fields
    is_admin_created BOOLEAN DEFAULT FALSE,  -- TRUE for offline profiles
    auth_user_id UUID,  -- NULL until student activates account
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NO FOREIGN KEY CONSTRAINT TO auth.users
-- This allows profile creation without auth users
```

### registrations Table

```sql
CREATE TABLE registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id),
    profile_id UUID NOT NULL REFERENCES profiles(id),
    team_id UUID REFERENCES teams(id),
    payment_mode TEXT,  -- 'offline' for admin-created registrations
    payment_proof_url TEXT,
    registration_type TEXT,  -- 'individual' or 'team'
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📊 SQL Queries

### Check Offline Profiles

```sql
-- Get all offline-created profiles
SELECT 
    id,
    roll_number,
    full_name,
    college_email,
    is_admin_created,
    auth_user_id,
    CASE 
        WHEN auth_user_id IS NULL THEN '❌ Cannot Login'
        ELSE '✅ Can Login'
    END as login_status
FROM profiles
WHERE is_admin_created = TRUE
ORDER BY created_at DESC;
```

### Count Users by Type

```sql
-- User statistics
SELECT 
    role,
    is_admin_created,
    COUNT(*) as count
FROM profiles
GROUP BY role, is_admin_created
ORDER BY role, is_admin_created;
```

### Find Profiles Without Auth Users

```sql
-- Profiles that need account activation
SELECT 
    roll_number,
    full_name,
    college_email,
    created_at
FROM profiles
WHERE is_admin_created = TRUE
AND auth_user_id IS NULL
ORDER BY created_at DESC;
```

### Check Registration Stats

```sql
-- Registrations by payment mode
SELECT 
    e.name as event_name,
    COUNT(CASE WHEN r.payment_mode = 'offline' THEN 1 END) as offline_registrations,
    COUNT(CASE WHEN r.payment_mode != 'offline' OR r.payment_mode IS NULL THEN 1 END) as online_registrations,
    COUNT(*) as total
FROM registrations r
JOIN events e ON e.id = r.event_id
GROUP BY e.id, e.name
ORDER BY e.name;
```

### Verify RLS Policies

```sql
-- Check if policies are non-recursive
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
```

---

## ✅ Testing Checklist

### Admin Users Page Testing

- [ ] Click "Add New Profile" button
- [ ] Modal opens without errors
- [ ] Form fields render correctly
- [ ] Roll number validation works (format check)
- [ ] Duplicate roll number prevented
- [ ] Required field validation works
- [ ] Email auto-generates from roll number
- [ ] Profile created successfully
- [ ] Success alert shows correct details
- [ ] Modal closes after creation
- [ ] User list refreshes automatically
- [ ] New profile shows with orange badge
- [ ] Stats card updates (Offline Registered count +1)
- [ ] Console shows creation logs

### Event Registration Testing

- [ ] Navigate to Coordinator → Events → Manage Event
- [ ] Click "Add Participants" tab
- [ ] Search for existing offline profile
- [ ] Profile appears in search results
- [ ] Register offline profile for event
- [ ] Registration shows `payment_mode = 'offline'`
- [ ] Duplicate registration prevented
- [ ] Team registration works with offline profiles
- [ ] Inline profile creation works during team search

### Database Testing

```sql
-- Run these queries in Supabase SQL Editor

-- 1. Check profile created
SELECT * FROM profiles WHERE roll_number = '22CS01';
-- Expected: 1 row, is_admin_created = TRUE, auth_user_id = NULL

-- 2. Check no auth user
SELECT * FROM auth.users WHERE email = '22cs01@aiktc.ac.in';
-- Expected: 0 rows

-- 3. Check audit log
SELECT * FROM audit_logs 
WHERE action_type = 'profile_created_offline' 
ORDER BY created_at DESC 
LIMIT 1;
-- Expected: Recent entry with profile details

-- 4. Try to login as offline profile
-- Expected: "Invalid login credentials" error
```

### User Count Testing

- [ ] Admin Dashboard shows correct Total Users count
- [ ] Count matches `SELECT COUNT(*) FROM profiles`
- [ ] Offline Registered count matches `SELECT COUNT(*) FROM profiles WHERE is_admin_created = TRUE`
- [ ] No 1000-user limit exists in query
- [ ] All profiles visible in SmartTable
- [ ] Filter by role works correctly
- [ ] Search works across all profiles

---

## 🐛 Troubleshooting

### Issue: "Add New Profile" button not visible

**Solution:**
- Check if you're logged in as Admin
- Verify route: `/admin/users`
- Clear browser cache
- Check console for errors

### Issue: Modal not opening

**Solution:**
```javascript
// Check useState initialization
const [showCreateModal, setShowCreateModal] = useState(false)

// Check button onClick
<button onClick={() => setShowCreateModal(true)}>
```

### Issue: Profile created but not showing in list

**Solution:**
- Check if `fetchUsers()` is called after creation
- Verify no errors in console
- Check RLS policies allow reading
- Try manual refresh

### Issue: "Invalid login credentials" for offline profile

**Solution:**
- This is EXPECTED behavior
- Offline profiles have NO auth users
- Choose Solution 1 (Student Self-Activation) from [Login Solutions](#login-issue--solutions)
- OR run `create_auth_for_offline_profiles.sql` (Solution 2)

### Issue: Duplicate roll number error

**Solution:**
- Roll number already exists in database
- Check with: `SELECT * FROM profiles WHERE roll_number = 'XXYYXX'`
- Cannot create duplicate - by design
- Update existing profile instead

### Issue: Foreign key constraint error

**Solution:**
- Run `supabase/fix_offline_profile_foreign_key.sql`
- This removes the profiles.id → auth.users FK constraint
- Allows profile creation without auth users

### Issue: Infinite recursion / "redirected you too many times"

**Solution:**
- Run `supabase/fix_infinite_recursion_emergency.sql`
- This removes recursive RLS policies
- Replaces with non-recursive policies using `auth.role()`

### Issue: User count shows "1000" but database has more

**Solution:**
- Check for LIMIT clause in query
- Current code has NO LIMIT - fetches all
- If still seeing 1000, check component props
- Verify SmartTable not applying pagination limit

---

## 📁 Modified Files

### 1. Database Migrations

- `supabase/add_admin_created_flag.sql` - Adds offline tracking
- `supabase/fix_offline_profile_foreign_key.sql` - Removes FK constraint
- `supabase/fix_infinite_recursion_emergency.sql` - Fixes RLS policies
- `supabase/create_auth_for_offline_profiles.sql` - Login solution (optional)

### 2. Frontend Components

- `src/pages/admin/AdminUsers.jsx` - Enhanced with "Add Profile" feature
- `src/pages/coordinator/CoordinatorEventManage.jsx` - Offline event registration

### 3. Database Schema

- `profiles` table - Added `is_admin_created`, `auth_user_id` columns
- `registrations` table - Uses `payment_mode` for offline tracking

---

## 🎓 User Instructions

### For Admins

**Creating Offline Profiles:**

1. Navigate to **Admin → Users**
2. Click **"Add New Profile"** button (top right, blue)
3. Fill in the form:
   - **Roll Number:** Student's roll number (e.g., `22CS01`)
   - **Full Name:** Student's full name
   - **Phone:** Optional
   - **Email:** Auto-generated, can modify if needed
4. Click **"Create Profile"**
5. Verify success message shows correct details
6. Profile appears in list with orange "Offline Registration" badge

**Registering for Events:**

1. Navigate to **Coordinator → Events**
2. Click **"Manage"** on an event
3. Go to **"Add Participants"** tab
4. Search for the offline profile by roll number or name
5. Register normally (marked as `payment_mode = 'offline'`)

### For Students (Offline Profiles)

**Activating Your Account:**

1. Go to the registration page
2. Enter your email: `rollnumber@aiktc.ac.in`
3. Create a strong password
4. Click "Create Account"
5. System will detect your existing profile and activate it
6. You can now login with your chosen password

**Note:** If you see "Profile already exists" - that's good! Just set your password to activate.

---

## 📈 Success Metrics

### Verification

✅ **Profile Creation:**
- Profiles created without auth users
- Marked with `is_admin_created = TRUE`
- Unique roll numbers enforced
- Email auto-generated correctly

✅ **User Display:**
- All users visible (no 1000 limit)
- Exact counts shown in stats
- Orange badges on offline profiles
- Search and filter work correctly

✅ **Event Registration:**
- Offline profiles can be registered for events
- Payment mode tracked as "offline"
- Duplicate prevention works
- Team registration supports offline profiles

✅ **Database Integrity:**
- No foreign key conflicts
- RLS policies non-recursive
- Audit logs created
- Data consistent across tables

### Known Limitations

⚠️ **Login:**
- Offline profiles CANNOT login immediately
- Students must activate accounts first
- Choose implementation from [Login Solutions](#login-issue--solutions)

⚠️ **Backend Features:**
- Admin invitation system requires backend API
- Bulk auth user creation requires service role
- Some operations cannot run from frontend

---

## 🚀 Next Steps

### Immediate Actions

1. **Choose Login Solution:**
   - Implement Solution 1 (Student Self-Activation) - RECOMMENDED
   - OR run Solution 2 SQL script (less secure)
   - OR build Solution 3 backend (most robust)

2. **Test Complete Flow:**
   - Create offline profile from Users tab
   - Register profile for an event
   - Verify in database
   - Test student activation flow

3. **Document for Users:**
   - Create student instruction sheet
   - Explain activation process
   - Provide support contact info

### Future Enhancements

- [ ] Bulk profile import from CSV
- [ ] Email notifications to offline profiles
- [ ] QR code generation for easy activation
- [ ] Profile editing from Users tab
- [ ] Export offline registrations report
- [ ] Integration with ID card printing system

---

## 📞 Support

**Database Issues:**
- Check Supabase SQL Editor for errors
- Review RLS policy logs
- Verify migrations ran successfully

**Frontend Issues:**
- Check browser console for errors
- Verify API calls in Network tab
- Check component props and state

**Authentication Issues:**
- Review Supabase Auth logs
- Check auth.users table entries
- Verify RLS policies for auth access

---

## 📝 Changelog

### January 29, 2026

**Added:**
- ✨ "Add New Profile" button in Admin Users page
- ✨ Create Profile modal with validation
- ✨ Offline Registered stat card
- 📄 Complete implementation guide
- 📄 Login solutions documentation
- 🗄️ SQL script for auth user creation

**Fixed:**
- ✅ Removed 1000-user query limit
- ✅ All profiles now visible
- ✅ Stats show exact counts

**Known Issues:**
- ⚠️ Offline profiles cannot login (solution documented)
- ⚠️ Students must activate accounts before login

---

## 📚 Additional Resources

**Related Documentation:**
- `REGISTRATION_ROUTING_FIXES.md` - Registration flow fixes
- `ROLE_MANAGEMENT_FIX.md` - Role-based access control
- `supabase/schema.sql` - Complete database schema

**Supabase Documentation:**
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)
- [Auth Admin API](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail)
- [User Management](https://supabase.com/docs/guides/auth/managing-user-data)

---

**End of Documentation** ✨

For questions or issues, check the Troubleshooting section or review console logs for detailed error messages.
