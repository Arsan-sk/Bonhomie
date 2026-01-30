# Fix: New Registration Profiles Not Being Created Properly

## Issue Description
New users were seeing:
- "Welcome Student" instead of their actual name on the dashboard
- "student@bonhomie.com" (default email) in the sidebar instead of their actual email
- Profile page showing error: "cannot coerce the result to a single jsonb object"

## Root Cause Analysis

### Problem 1: Incomplete Database Trigger
The `handle_new_user()` trigger was only inserting basic fields (`id`, `role`, `full_name`, `college_email`) but **NOT** the full metadata passed during registration like:
- `roll_number`
- `school`
- `department`
- `program`
- `year_of_study`
- `admission_year`
- `expected_passout_year`
- `phone`
- `gender`

### Problem 2: Profile Query Failure
The code used `.single()` in Supabase queries which throws an error when no profile is found, causing the "cannot coerce the result to a single jsonb object" error.

### Problem 3: No Fallback Mechanism
When the database trigger failed or profile wasn't created, there was no frontend fallback to create a profile, leaving the user with null profile data.

## Solution Implemented

### 1. Fixed Database Trigger (`FIX_NEW_REGISTRATION_PROFILES.sql`)
- Updated `handle_new_user()` to capture ALL metadata from `raw_user_meta_data`
- Added proper error handling and logging
- Added recovery logic for existing auth users without profiles

### 2. Updated AuthContext (`AuthContext.jsx`)
- Changed from `.single()` to `.maybeSingle()` to prevent query errors
- Added `createProfileFallback()` function that creates a profile if one doesn't exist
- Added fallback to fetch profile by email if not found by ID (handles offline profile case)
- Passes auth user object to `fetchProfile()` for fallback profile creation

### 3. Updated Register Page (`Register.jsx`)
- Added `fetchProfileWithRetry()` helper function with exponential backoff
- Gives the database trigger time to complete before checking for profile
- More graceful handling if profile isn't immediately available

### 4. Fixed Other Components
- `StudentProfile.jsx`: Changed `.single()` to `.maybeSingle()` with proper null handling
- `ProfilePage.jsx`: Changed `.single()` to `.maybeSingle()` with user-friendly error message
- `AdminNotifications.jsx`: Fixed column name from `email` to `college_email`

## Files Modified
1. `supabase/FIX_NEW_REGISTRATION_PROFILES.sql` - New SQL fix script
2. `src/context/AuthContext.jsx` - Enhanced profile fetching with fallback
3. `src/pages/Register.jsx` - Added retry mechanism
4. `src/pages/student/StudentProfile.jsx` - Fixed query method
5. `src/components/profile/ProfilePage.jsx` - Fixed query method
6. `src/pages/admin/AdminNotifications.jsx` - Fixed column name

## Deployment Steps

### Step 1: Run SQL Fix
Execute the SQL script in Supabase SQL Editor:
```sql
-- Run the contents of supabase/FIX_NEW_REGISTRATION_PROFILES.sql
```

This will:
- Fix the `handle_new_user()` trigger
- Create missing profiles for existing auth users
- Update profiles with missing data from auth metadata

### Step 2: Deploy Frontend Changes
Push the frontend changes to production.

## Testing
1. Create a new user registration
2. Verify the dashboard shows the correct name
3. Verify the sidebar shows the correct email
4. Verify the profile page loads without errors
5. Check browser console for any profile-related errors

## Rollback
If issues occur:
1. The old trigger can be restored from `supabase/COMPREHENSIVE_LOGIN_FIX.sql`
2. Frontend changes are backwards compatible and don't require rollback
