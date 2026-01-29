# QUICK START TESTING GUIDE

## ⚡ Quick Steps to Test

### 1. Run Database Migration (5 minutes)

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to SQL Editor
3. Copy contents of `supabase/add_admin_created_flag.sql`
4. Paste and click "Run"
5. Verify success messages ✅

### 2. Start Dev Server

```bash
npm run dev
```

### 3. Navigate to Event Management

**For Admin:**
- Go to: http://localhost:5173/admin/advanced-management
- Click on any event (e.g., "Chess", "Cricket")
- Click **Participants** tab

**For Coordinator:**
- Go to: http://localhost:5173/coordinator/events
- Click on your assigned event
- Click **Participants** tab

### 4. Test Individual Registration (5 minutes)

**You'll see a NEW "**+ Add**" button between Search and "Members Only"**

**Test 1: Existing Profile**
1. Click "+ Add"
2. Enter existing roll number (e.g., from your database)
3. Click "Check"
4. Profile details shown ✅
5. Click "Add Participant"
6. Success! Check participants list

**Test 2: New Profile**
1. Click "+ Add"
2. Enter: `TEST001`
3. Click "Check"
4. "Profile Not Found" shown
5. Click "Create New Profile"
6. Fill: Name = "Test User", Phone = "9876543210"
7. Email auto-generated: `test001@aiktc.ac.in`
8. Password: `password` (auto-set)
9. Click "Create & Add"
10. Success! Check participants list

### 5. Test Team Registration (10 minutes)

**Prerequisites:** Use a Group event (Cricket, Free Fire, etc.)

**Test: Complete Team Flow**
1. Click "+ Add" (should show team modal)
2. **Step 1:** Enter leader roll number
3. Click "Check" → Profile shown
4. Click "Continue to Add Members"
5. **Step 2:** Search for member (e.g., `23EC`)
6. Click on result → Added to selected list
7. Search for non-existent: `TEST002`
8. No results → Click "Create New Profile"
9. Fill inline: Name + Phone
10. Click "Create & Add to Team"
11. Member added to list ✅
12. Repeat until min team size met
13. Click "Register Team"
14. Success! 🎉

### 6. Verify in Database (2 minutes)

**Check offline profiles:**
```sql
SELECT full_name, roll_number, is_admin_created 
FROM profiles 
WHERE is_admin_created = TRUE;
```

**Check offline registrations:**
```sql
SELECT p.full_name, e.name, r.payment_mode, r.status
FROM registrations r
JOIN profiles p ON r.profile_id = p.id
JOIN events e ON r.event_id = e.id
WHERE r.payment_mode = 'offline';
```

---

## ✅ What Should Happen

### Offline Profiles (created via "+ Add"):
- ✅ `is_admin_created = TRUE`
- ✅ Email: `{rollnumber}@aiktc.ac.in`
- ✅ Password: `password`
- ✅ Can login immediately

### Offline Registrations:
- ✅ `payment_mode = 'offline'`
- ✅ `status = 'confirmed'` (auto-approved)
- ✅ No transaction ID or screenshot
- ✅ Appears in participants list
- ✅ Visible to coordinators

### Self-Registered Users (normal registration):
- ✅ `is_admin_created = FALSE`
- ✅ No changes to existing flow

---

## 🐛 Common Issues

**"Cannot create user: Email already exists"**
→ Roll number already used, try different one

**"+ Add button not visible"**
→ Clear browser cache, hard refresh (Ctrl+Shift+R)

**"Permission denied"**
→ Check you're logged in as Admin or Coordinator

**"Profile created but is_admin_created is FALSE"**
→ Check profile trigger in Supabase (may be overriding value)

---

## 🎯 Success Criteria

After testing, you should be able to:
- ✅ Add individual participants (existing + new profiles)
- ✅ Add teams with multiple members
- ✅ Create profiles inline during team creation
- ✅ See all offline registrations in participants list
- ✅ Login with offline credentials (email + "password")
- ✅ Verify `is_admin_created = TRUE` in database

---

## 📞 Next Steps

1. Test all scenarios above
2. Report any bugs found
3. Once stable, deploy to production
4. Train coordinators on new feature (10 min training)

---

**Estimated Testing Time: 30-45 minutes**

**Ready to go! 🚀**
