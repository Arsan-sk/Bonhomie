# 🔧 FIX: Profile Creation Not Persisting to Database

## Issue Description

**Problem:** When creating a new profile via "Create New Profile" button in team member search:
- Profile appears in "Selected Members" list ✅
- BUT searching for same roll number shows "No results" ❌
- Profile NOT actually saved to database ❌

**Screenshot Analysis:**
- Selected Members shows: "Adnan Bhai (23ec14)"
- Search for "23ec114" shows: "No results"
- Discrepancy: stored as "23ec14" but searching for "23ec114"

## Root Causes

1. **Foreign Key Constraint** - profiles.id FK to auth.users blocking inserts
2. **Silent Failures** - Profile creation fails but gets added to local state anyway
3. **No Validation** - Roll number not validated before creation
4. **No Feedback** - User doesn't know if profile was saved to DB or just added locally

## Solutions Implemented

### 1. Enhanced Error Handling ✅

**File:** `CoordinatorEventManage.jsx` - `handleCreateInlineMember()`

**Changes:**
- Added validation for all required fields
- Better error messages with console logs
- Check if profile creation actually succeeded before adding to selectedMembers
- Clear search and form after successful creation
- Show success alert with created profile details

**Before:**
```javascript
try {
    const result = await createOfflineProfile(rollNumber, fullName, phone)
    setAddTeamModal(prev => ({
        ...prev,
        selectedMembers: [...prev.selectedMembers, result.profile],
        // ...
    }))
} catch (error) {
    alert('Failed to create profile: ' + error.message)
}
```

**After:**
```javascript
try {
    console.log('Creating inline profile:', { rollNumber, fullName, phone })
    const result = await createOfflineProfile(rollNumber, fullName, phone)
    
    if (!result.success || !result.profile) {
        throw new Error('Profile creation returned invalid data')
    }

    console.log('Profile created successfully:', result.profile)
    
    // Only add if creation succeeded
    setAddTeamModal(prev => ({
        ...prev,
        selectedMembers: [...prev.selectedMembers, result.profile],
        memberSearch: '', // Clear search
        searchResults: [], // Clear results
        error: null
    }))

    alert(`✅ Profile created!\n\nName: ${result.profile.full_name}\nRoll: ${result.profile.roll_number}`)
} catch (error) {
    console.error('Failed to create inline profile:', error)
    alert('Failed to create profile: ' + error.message)
    // Don't add to selectedMembers if creation failed!
}
```

### 2. Improved createOfflineProfile() ✅

**File:** `CoordinatorEventManage.jsx` - `createOfflineProfile()`

**Changes:**
- Check if profile already exists BEFORE attempting creation
- Better error messages with specific error codes
- Return full profile data with all fields
- Changed role from 'user' to 'student'
- Added detailed console logging

**Key Improvements:**
```javascript
// 1. Check existence first
const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, full_name, roll_number')
    .eq('roll_number', normalizedRoll)
    .maybeSingle()

if (existingProfile) {
    throw new Error(`Profile already exists for ${existingProfile.full_name}`)
}

// 2. Better error codes
if (profileError.code === '23503') {
    throw new Error('Database FK error. Run SQL: fix_offline_profile_foreign_key.sql')
}

// 3. Return full data
.select('id, full_name, roll_number, phone, college_email, department, year_of_study, is_admin_created')
```

### 3. Enhanced Search with Logging ✅

**File:** `CoordinatorEventManage.jsx` - `handleSearchTeamMembers()`

**Changes:**
- Added console logs to track search flow
- Log number of results found
- Log number of results after filtering

**Benefits:**
- Easy debugging - see in console what's happening
- Track if profiles are in DB but filtered out
- Verify search is working correctly

## Required SQL Migration

**CRITICAL:** Must run this SQL script first:

**File:** `supabase/fix_offline_profile_foreign_key.sql`

This removes the foreign key constraint that prevents offline profile creation.

## Testing Checklist

### Before Testing:
- [ ] Run `fix_infinite_recursion_emergency.sql`
- [ ] Run `add_admin_created_flag.sql`
- [ ] Run `fix_offline_profile_foreign_key.sql` ⭐ CRITICAL
- [ ] Hard refresh browser (Ctrl+Shift+R)

### Test Steps:

1. **Open Browser Console (F12)**
   - Go to Console tab
   - Keep it open during testing

2. **Go to Team Event**
   - Select a group event
   - Click Participants tab
   - Click "+ Add" button

3. **Add Team Leader**
   - Enter leader roll number
   - Verify leader exists/create if needed
   - Continue to Step 2

4. **Search for Non-Existent Member**
   - Enter roll number: `test999`
   - Should show "No results for 'test999'"
   - Click "Create New Profile"

5. **Create Profile**
   - Fill in:
     - Full Name: Test User
     - Phone: 9876543210
   - Click "Create & Add to Team"

6. **Verify Success**
   - Console should show:
     ```
     Creating inline profile: {rollNumber: "test999", fullName: "Test User", phone: "9876543210"}
     Generated temp ID: [UUID]
     Profile created in database: {id: "...", roll_number: "test999", ...}
     Profile created successfully: [object]
     ```
   - Alert shows: "✅ Profile created and added to team!"
   - Profile appears in "Selected Members"

7. **Verify Database Persistence**
   - Clear search field
   - Search for "test999" again
   - **Should NOW show results** (profile in DB)
   - Or check directly in Supabase:
     ```sql
     SELECT * FROM profiles WHERE roll_number = 'test999';
     ```

8. **Complete Team Registration**
   - Add more members if needed
   - Click "Register Team"
   - Should succeed

### Expected Console Output:

**Successful Creation:**
```
Creating inline profile: {rollNumber: "test999", fullName: "Test User", phone: "9876543210"}
Creating offline profile: {normalizedRoll: "test999", fullName: "Test User", phone: "9876543210", email: "test999@aiktc.ac.in"}
Generated temp ID: abc-123-xyz
Profile created in database: {id: "abc-123", roll_number: "test999", full_name: "Test User", is_admin_created: true}
Profile created successfully, adding to team: {id: "abc-123", ...}
```

**Failed Creation (FK Error):**
```
Creating offline profile: {...}
Profile creation error: {code: "23503", message: "violates foreign key constraint"}
❌ Database FK error. Run SQL: fix_offline_profile_foreign_key.sql
```

**Failed Creation (Already Exists):**
```
Profile already exists: {id: "xyz", full_name: "Existing User", roll_number: "test999"}
❌ A profile with roll number test999 already exists for Existing User
```

## Troubleshooting

### Issue: Still getting FK error

**Console shows:** `code: "23503"` or "violates foreign key constraint"

**Solution:**
```sql
-- Run this in Supabase SQL Editor
ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey CASCADE;
```

### Issue: Profile created but not searchable

**Check:**
1. Open console - does it show "Profile created in database"?
2. Check Supabase directly:
   ```sql
   SELECT * FROM profiles WHERE roll_number = 'your_roll_number';
   ```
3. If profile exists in DB but not in search:
   - Check RLS policies (might be blocking SELECT)
   - Run `fix_infinite_recursion_emergency.sql`

### Issue: Success alert shows but profile not in Selected Members

**This means:**
- Profile WAS created in DB ✅
- But selectedMembers state wasn't updated ❌

**Check console for:**
- "Profile created successfully, adding to team" - should see this
- Any React state errors

**Hard refresh and try again**

### Issue: Duplicate roll numbers

**Example:** User has "23ec14" and "23ec114" (typo)

**Solution:**
1. Delete duplicate:
   ```sql
   DELETE FROM profiles WHERE roll_number = '23ec114';
   ```
2. Keep the correct one
3. Use consistent roll number format

## Summary of Changes

### Frontend Files Modified:
1. ✅ `src/pages/coordinator/CoordinatorEventManage.jsx`
   - Enhanced `handleCreateInlineMember()` - better validation and error handling
   - Enhanced `createOfflineProfile()` - check existence, better errors
   - Enhanced `handleSearchTeamMembers()` - added logging

### SQL Files to Run:
1. ✅ `fix_infinite_recursion_emergency.sql` - Fix login/RLS
2. ✅ `add_admin_created_flag.sql` - Add is_admin_created column
3. ✅ `fix_offline_profile_foreign_key.sql` - Remove FK constraint ⭐ CRITICAL

## Success Criteria

After fixes, you should see:

- ✅ Profile creation shows success alert
- ✅ Console logs show "Profile created in database"
- ✅ Profile appears in Selected Members immediately
- ✅ Searching for same roll number finds the profile
- ✅ Profile visible in Admin Users page
- ✅ Can complete team registration successfully
- ✅ No FK constraint errors in console

## Notes

- **Roll number normalization:** Converts to lowercase automatically
- **Email generation:** Uses format `{roll_number}@aiktc.ac.in`
- **Default role:** Set to 'student' (changed from 'user')
- **is_admin_created:** Always TRUE for offline profiles
- **Validation:** Name, phone, and roll number all required
