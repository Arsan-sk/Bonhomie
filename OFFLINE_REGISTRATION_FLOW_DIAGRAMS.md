# OFFLINE REGISTRATION SYSTEM - VISUAL FLOW DIAGRAMS

## 🎯 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    EVENT MANAGEMENT PAGE                        │
│                      (Participants Tab)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Search Input] [➕ Add Button] [Members Only] [Export CSV]    │
│                        ↑                                        │
│                   NEW BUTTON                                    │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ↓
                    ┌───────────────┐
                    │ Event Type?   │
                    └───────────────┘
                     ↙             ↘
            Individual          Group
                ↓                   ↓
    ┌──────────────────┐   ┌──────────────────┐
    │ Add Participant  │   │   Add Team       │
    │     Modal        │   │    Modal         │
    └──────────────────┘   └──────────────────┘
```

---

## 📋 Individual Event Registration Flow

```
START: Click [+ Add] Button on Individual Event
    ↓
┌─────────────────────────────────────┐
│   Add Participant Modal Opens       │
│                                     │
│   [Enter Roll Number]  [Check]     │
└─────────────────────────────────────┘
    ↓
    Validate Roll Number
    ↓
    ┌──────────┬──────────┬──────────┐
    ↓          ↓          ↓          ↓
 Found    Not Found   Already    Error
    ↓          ↓       Registered    ↓
    │          │          ↓          │
    │          │      Show Error    │
    │          │      [Cannot Add]  │
    │          │                    │
    │          ↓                    │
    │    Create Profile Modal       │
    │          ↓                    │
    │    [Name] [Phone]            │
    │    Email: auto-generated     │
    │    Password: auto-set        │
    │          ↓                    │
    │    [Create & Add]            │
    │          ↓                    │
    │    ┌──────────────┐          │
    │    │ Create Auth  │          │
    │    │ User in      │          │
    │    │ Supabase     │          │
    │    └──────────────┘          │
    │          ↓                    │
    │    ┌──────────────┐          │
    │    │ Create/Update│          │
    │    │ Profile with │          │
    │    │ is_admin_    │          │
    │    │ created=TRUE │ ⭐       │
    │    └──────────────┘          │
    │          ↓                    │
    ↓          ↓                    ↓
    ╔════════════════════════════════╗
    ║  Create Registration Record    ║
    ║                                ║
    ║  payment_mode: 'offline' ⭐   ║
    ║  status: 'confirmed' ⭐        ║
    ║  transaction_id: NULL          ║
    ║  payment_screenshot: NULL      ║
    ╚════════════════════════════════╝
              ↓
    ┌────────────────────┐
    │ Log Audit Trail    │
    │ Action: OFFLINE_   │
    │ REGISTRATION_      │
    │ INDIVIDUAL         │
    └────────────────────┘
              ↓
    ┌────────────────────┐
    │ Refresh            │
    │ Participants List  │
    └────────────────────┘
              ↓
         SUCCESS! ✅
```

---

## 👥 Team Event Registration Flow

```
START: Click [+ Add] Button on Group Event
    ↓
┌────────────────────────────────────────┐
│   Add Team Modal Opens                 │
│   Step 1: Select Team Leader           │
│                                        │
│   [Enter Leader Roll Number] [Check]  │
└────────────────────────────────────────┘
    ↓
    Validate Leader
    ↓
    ┌──────────┬──────────┐
    ↓          ↓          ↓
 Found    Not Found    Error
    ↓          ↓          ↓
    │    [Create Profile] │
    │          ↓          │
    ↓          ↓          ↓
    ╔═══════════════════════╗
    ║  Leader Profile Set   ║
    ╚═══════════════════════╝
              ↓
    [Continue to Add Members]
              ↓
┌────────────────────────────────────────┐
│   Step 2: Add Team Members             │
│                                        │
│   [🔍 Search Member by Roll Number]   │
│                                        │
│   Search Results:                      │
│   ○ Member 1 (Click to Add)           │
│   ○ Member 2 (Click to Add)           │
│                                        │
│   Selected Members:                    │
│   ✓ Member A [Remove]                  │
│   ✓ Member B [Remove]                  │
│                                        │
│   Team Size: 3/4 (2 + leader)         │
└────────────────────────────────────────┘
    ↓
    ┌──────────────────────┐
    │ Member Search        │
    │ Result?              │
    └──────────────────────┘
         ↓         ↓
      Found    Not Found
         ↓         ↓
         │    ┌──────────────────┐
         │    │ Inline Create    │
         │    │ Profile Form     │
         │    │                  │
         │    │ [Name] [Phone]   │
         │    │ [Create & Add]   │
         │    └──────────────────┘
         │         ↓
         │    Create Profile
         │    with is_admin_
         │    created=TRUE ⭐
         │         ↓
         ↓         ↓
    ╔═══════════════════════╗
    ║  Add to Selected List ║
    ╚═══════════════════════╝
              ↓
    Repeat until Min Size Met
              ↓
    [Register Team] Button Enabled
              ↓
         Click Button
              ↓
    ╔════════════════════════════════╗
    ║  Create LEADER Registration    ║
    ║                                ║
    ║  profile_id: Leader ID         ║
    ║  team_members: [Array of IDs]  ║
    ║  payment_mode: 'offline' ⭐   ║
    ║  status: 'confirmed' ⭐        ║
    ╚════════════════════════════════╝
              ↓
    ╔════════════════════════════════╗
    ║  Create MEMBER Registrations   ║
    ║  (One for each member)         ║
    ║                                ║
    ║  profile_id: Member ID         ║
    ║  team_members: [] (empty)      ║
    ║  payment_mode: 'offline' ⭐   ║
    ║  status: 'confirmed' ⭐        ║
    ╚════════════════════════════════╝
              ↓
    ┌────────────────────┐
    │ Log Audit Trail    │
    │ Action: OFFLINE_   │
    │ REGISTRATION_TEAM  │
    └────────────────────┘
              ↓
    ┌────────────────────┐
    │ Refresh            │
    │ Participants List  │
    └────────────────────┘
              ↓
      Team Appears in:
      • Leaders View (leader row)
      • Members View (member rows)
              ↓
         SUCCESS! ✅
```

---

## 🔑 Profile Creation Flow (Detailed)

```
┌─────────────────────────────────────┐
│  Create Profile Trigger             │
│  (From any modal)                   │
└─────────────────────────────────────┘
              ↓
    ┌─────────────────────┐
    │ Normalize Inputs    │
    │                     │
    │ Roll: lowercase     │
    │ Name: trim          │
    │ Phone: validate     │
    └─────────────────────┘
              ↓
    ┌─────────────────────┐
    │ Generate Credentials│
    │                     │
    │ Email = {roll}@     │
    │       aiktc.ac.in   │
    │                     │
    │ Password = password │
    └─────────────────────┘
              ↓
    ╔═══════════════════════════╗
    ║  Supabase Auth API        ║
    ║  admin.createUser({       ║
    ║    email,                 ║
    ║    password,              ║
    ║    email_confirm: true,   ║
    ║    user_metadata: {       ║
    ║      is_admin_created:    ║
    ║            true ⭐        ║
    ║    }                      ║
    ║  })                       ║
    ╚═══════════════════════════╝
              ↓
         Auth User ID
              ↓
    ╔═══════════════════════════╗
    ║  Insert/Update Profiles   ║
    ║  Table                    ║
    ║                           ║
    ║  id: auth_user_id         ║
    ║  full_name: entered       ║
    ║  roll_number: normalized  ║
    ║  college_email: generated ║
    ║  phone: entered           ║
    ║  is_admin_created: TRUE ⭐║
    ║  role: 'user'             ║
    ╚═══════════════════════════╝
              ↓
    ┌─────────────────────┐
    │ Log Audit           │
    │ OFFLINE_PROFILE_    │
    │ CREATED             │
    └─────────────────────┘
              ↓
    ┌─────────────────────┐
    │ Return Profile      │
    │ Object              │
    └─────────────────────┘
              ↓
         SUCCESS! ✅
         
    User can now login with:
    📧 {rollnumber}@aiktc.ac.in
    🔑 password
```

---

## 🎨 UI Component Hierarchy

```
CoordinatorEventManage Component
│
├── State Management
│   ├── addParticipantModal (Individual)
│   ├── createProfileModal
│   └── addTeamModal (Group)
│
├── Helper Functions
│   ├── validateRollNumber()
│   ├── createOfflineProfile() ⭐
│   ├── registerIndividualOffline() ⭐
│   ├── registerTeamOffline() ⭐
│   └── searchMembersByRollNumber()
│
├── UI Handlers
│   ├── handleAddParticipantClick()
│   ├── handleValidateIndividualRollNumber()
│   ├── handleCreateProfile()
│   ├── handleRegisterIndividualParticipant()
│   ├── handleValidateTeamLeader()
│   ├── handleSearchTeamMembers()
│   ├── handleSelectTeamMember()
│   └── handleRegisterTeam()
│
└── JSX Components
    ├── Participants Tab Header
    │   └── [+ Add] Button ⭐ (NEW)
    │
    ├── Add Participant Modal
    │   ├── Roll Number Input
    │   ├── Validation Display
    │   └── Action Buttons
    │
    ├── Create Profile Modal
    │   ├── Form Fields
    │   ├── Auto-generated Display
    │   └── Submit Actions
    │
    └── Add Team Modal
        ├── Step 1: Leader Selection
        │   ├── Leader Input
        │   └── Validation
        │
        └── Step 2: Member Selection
            ├── Search Interface
            ├── Inline Create Form
            ├── Selected Members List
            └── Register Button
```

---

## 🔄 Data Flow: Online vs Offline Registration

### Online (Self-Registration)
```
Student → Registration Form → Submit
    ↓
Create Auth User
    ↓
Trigger: handle_new_user() creates profile
    ↓
Profile: is_admin_created = FALSE ✅
    ↓
Create Registration
    ↓
payment_mode: 'online' or 'hybrid'
status: 'pending' (awaiting verification)
```

### Offline (Admin/Coordinator)
```
Admin/Coordinator → Event Management → Participants Tab
    ↓
Click [+ Add] Button
    ↓
Enter Roll Number
    ↓
If Not Found: Create Profile Modal
    ↓
Admin/Coordinator fills: Name, Phone
    ↓
System creates Auth User
    ↓
System creates Profile
    ↓
Profile: is_admin_created = TRUE ⭐
    ↓
Create Registration
    ↓
payment_mode: 'offline' ⭐
status: 'confirmed' ⭐ (auto-approved)
```

---

## 📊 Database Relationships

```
┌─────────────────────────────────┐
│         auth.users              │
│  (Supabase Auth)                │
│                                 │
│  • id (UUID)                    │
│  • email                        │
│  • encrypted_password           │
│  • user_metadata                │
└─────────────────────────────────┘
              │
              │ (id → id)
              ↓
┌─────────────────────────────────┐
│       public.profiles           │
│                                 │
│  • id → auth.users.id           │
│  • full_name                    │
│  • roll_number                  │
│  • college_email                │
│  • phone                        │
│  • is_admin_created ⭐ NEW      │
│  • role                         │
└─────────────────────────────────┘
              │
              │ (id → profile_id)
              ↓
┌─────────────────────────────────┐
│    public.registrations         │
│                                 │
│  • id (UUID)                    │
│  • profile_id → profiles.id     │
│  • event_id → events.id         │
│  • team_members (JSONB)         │
│  • payment_mode ⭐              │
│  • status ⭐                    │
│  • transaction_id               │
│  • payment_screenshot_path      │
└─────────────────────────────────┘
              │
              │ (actor_id → id)
              ↓
┌─────────────────────────────────┐
│     public.audit_logs           │
│                                 │
│  • id (UUID)                    │
│  • actor_id → profiles.id       │
│  • action (text)                │
│  • metadata (JSONB)             │
│  • created_at                   │
└─────────────────────────────────┘
```

---

## 🎯 Key Decision Points

### 1. When "+ Add" is clicked
```
IF event.subcategory = 'Group'
    THEN open Add Team Modal
ELSE
    THEN open Add Participant Modal
```

### 2. When Roll Number is validated
```
Check Profile Exists?
    │
    ├─ YES → Check Already Registered?
    │           │
    │           ├─ YES → Show Error (Cannot Add)
    │           │
    │           └─ NO → Check In Another Team?
    │                      │
    │                      ├─ YES → Show Error
    │                      │
    │                      └─ NO → Valid ✅
    │
    └─ NO → Show "Create Profile" Option
```

### 3. After Profile Creation
```
IF triggered from Add Participant Modal
    THEN return to Add Participant Modal with profile
ELSE IF triggered from Add Team (Leader)
    THEN return to Add Team Step 1 with profile
ELSE IF triggered from Add Team (Member inline)
    THEN auto-add to selected members list
```

---

## ✅ Success Indicators at Each Step

| Step | Success Indicator | Database Check |
|------|------------------|----------------|
| Profile Created | `is_admin_created = TRUE` | `SELECT is_admin_created FROM profiles WHERE roll_number = ?` |
| Can Login | Auth works with email/password | Login with `{roll}@aiktc.ac.in` + `password` |
| Registration Created | `payment_mode = 'offline'` | `SELECT payment_mode FROM registrations WHERE id = ?` |
| Auto-Approved | `status = 'confirmed'` | `SELECT status FROM registrations WHERE id = ?` |
| Visible to Coordinator | Shows in participants list | Navigate to Participants tab |
| Audit Logged | Entry in audit_logs | `SELECT * FROM audit_logs WHERE action LIKE 'OFFLINE%'` |

---

**END OF VISUAL FLOW DIAGRAMS**

For implementation details, see: `OFFLINE_REGISTRATION_IMPLEMENTATION_COMPLETE.md`
For testing steps, see: `QUICK_START_TESTING_GUIDE.md`
