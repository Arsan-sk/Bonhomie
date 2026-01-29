# Offline Registration User Guide

## Overview
The offline registration feature allows coordinators and admins to register students who didn't complete online registration. This is integrated directly into the event management interface.

## Where to Find It
**There is NO separate "Offline Users" tab.** Instead:

1. Go to **Coordinator Dashboard** → Select an event
2. Click on the **"Participants"** tab
3. Look for the **"+ Add"** button (indigo/blue button in the top right)

### Visual Location
```
┌─────────────────────────────────────────┐
│  Overview | Participants | Analytics    │ ← Tabs
├─────────────────────────────────────────┤
│  [ℹ️ Info Banner]                        │
│  Participants                            │
│  [Search...]        [+ Add] [Export CSV] │ ← "+ Add" button is here!
└─────────────────────────────────────────┘
```

## How It Works

### For Individual Events:
1. Click **"+ Add"** → Opens "Add Participant" modal
2. Enter student's roll number → Click **"Verify"**
3. Two scenarios:
   - **Profile Found**: Student details shown → Click "Add Participant"
   - **Profile Not Found**: Click "Create New Profile" → Fill details → Register

### For Team/Group Events:
1. Click **"+ Add"** → Opens "Add Team" modal
2. **Step 1**: Enter team leader's roll number → Click **"Verify"**
   - If profile doesn't exist, create one
3. **Step 2**: Search and add team members by roll number
   - Add as many members as needed (within min/max team size)
   - If a member's profile doesn't exist, create it inline
4. Click **"Create Team"** to register the entire team

## Key Features

### Profile Creation (When Student Not Found)
- Enter: Roll Number, Full Name, Email, Phone
- Email must be valid college email (validated)
- Phone must be 10 digits (validated)
- Profile marked with `is_admin_created = TRUE` flag
- **Student must sign up with this email later to activate their account**

### Validation Checks
- ✅ Profile exists in system
- ✅ Not already registered for this event
- ✅ Not already in another team (for team events)
- ✅ Email format and domain validation
- ✅ Phone number format validation
- ✅ Team size constraints (min/max members)

### Registration Status
- All offline registrations are automatically marked as:
  - `payment_mode = 'offline'`
  - `status = 'confirmed'` (no approval needed)
  - Records created in audit logs for tracking

## UI Improvements Made

### Modal Overlays
- Changed from 50% black opacity to 30% with backdrop blur
- Background content remains visible
- Less intrusive user experience

### Clearer Labels
- **Before**: "Leader Roll Number" (confusing)
- **After**: "Team Leader's Roll Number" with explanation text
- Added helpful placeholders: "Enter roll number (e.g., 25AI110)"
- Button text changed from "Check" to "Verify" for clarity

### Info Banner
- Blue info banner at top of Participants tab
- Explains how to use the "+ Add" button
- Different text for individual vs. team events

## Technical Details

### Database Changes
- Added `is_admin_created` column to profiles table
- `TRUE` = Profile created by admin/coordinator (offline)
- `FALSE` (default) = Self-registered by student (online)

### Authentication Flow
- Profiles created without auth user initially
- Temporary UUID assigned as profile ID
- Student must sign up later with the email provided
- When they sign up, their auth.users.id will link to this profile

## Common Questions

**Q: Where is the "Offline Users" tab?**
A: There isn't one. Use the "+ Add" button in the Participants tab.

**Q: Why does it say "Student must sign up with this email"?**
A: We can't create passwords for security reasons. Students activate their account by signing up themselves.

**Q: Can I register teams offline?**
A: Yes! For group events, the "+ Add" button opens a 2-step team registration flow.

**Q: What if a student's profile doesn't exist?**
A: Click "Create New Profile" button when the verification fails. Fill in basic details and continue.

**Q: How do I know if someone was registered offline vs. online?**
A: Check the `is_admin_created` flag in the database, or look at audit logs.

## Support
If you encounter issues:
1. Check browser console for errors
2. Verify roll number format is correct
3. Ensure email domain is valid (@students.nitandhra.ac.in)
4. Check that team size constraints are met
