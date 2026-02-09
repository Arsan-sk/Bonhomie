# 🍕 Zaika Food Festival - Digital Wallet System
## Complete Implementation Plan

**Document Version:** 1.0  
**Created:** February 2, 2026  
**Project:** Bonhomie 2026  

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [User Flows](#user-flows)
5. [File Structure](#file-structure)
6. [Component Specifications](#component-specifications)
7. [API & Queries](#api--queries)
8. [Real-time Features](#real-time-features)
9. [Implementation Phases](#implementation-phases)
10. [Testing Checklist](#testing-checklist)
11. [Security Considerations](#security-considerations)
12. [Implementation Status Tracker](#implementation-status-tracker)

---

## Executive Summary

### What is Zaika?
Zaika is a food festival event where student teams set up food stalls. Instead of physical coupons (which can be duplicated/forged), we're implementing a **digital wallet system** for transparent, fraud-proof transactions.

### Key Features
- **Digital Wallet:** Buyers add money (cash at counter) → Balance in app
- **Stall Payments:** Buyers pay stalls from wallet → Real-time balance updates
- **Sales Tracking:** Each stall's sales tracked → Winner determined by highest sales
- **Role-based Access:** Same entry point (Hot Topics → Zaika) shows different UI based on registration status

### User Roles
| Role | Who | Access |
|------|-----|--------|
| **Stall Owner** | Users registered for Zaika event (entire team) | Stall management, receive payments |
| **Buyer** | Any platform user NOT registered for Zaika | Add money, browse stalls, make payments |
| **Admin/Coordinator** | Assigned coordinators + Admins | Approve top-ups, view all transactions, leaderboard |

---

## System Architecture

### Access Control Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                    HOT TOPICS → ZAIKA                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   User clicks Zaika card                                        │
│              │                                                  │
│              ▼                                                  │
│   ┌─────────────────────────┐                                   │
│   │ Check: Is user's        │                                   │
│   │ profile_id in Zaika     │                                   │
│   │ event registrations?    │                                   │
│   └───────────┬─────────────┘                                   │
│               │                                                 │
│       ┌───────┴───────┐                                         │
│       │               │                                         │
│      YES              NO                                        │
│       │               │                                         │
│       ▼               ▼                                         │
│  ┌─────────┐    ┌─────────┐                                     │
│  │ STALL   │    │ BUYER   │                                     │
│  │ OWNER   │    │ MODE    │                                     │
│  │ MODE    │    │         │                                     │
│  └─────────┘    └─────────┘                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Transaction Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                    WALLET TOP-UP FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Buyer visits physical counter with CASH                     │
│              │                                                  │
│              ▼                                                  │
│  2. Buyer opens app → Wallet → "Add Money"                      │
│     Enters amount (min ₹50) → Submits request                   │
│              │                                                  │
│              ▼                                                  │
│  3. Request appears in Coordinator/Admin "Manage Zaika" panel   │
│     Shows: Name, Roll Number, Amount                            │
│              │                                                  │
│              ▼                                                  │
│  4. After receiving cash → Coordinator approves                 │
│              │                                                  │
│              ▼                                                  │
│  5. Balance added to buyer's wallet                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    FOOD PURCHASE FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Buyer browses stalls → Clicks on stall                      │
│              │                                                  │
│              ▼                                                  │
│  2. Sees menu items with prices                                 │
│     Clicks "Buy" on an item                                     │
│              │                                                  │
│              ▼                                                  │
│  3. Enters quantity → Amount auto-calculated                    │
│     Clicks "Confirm"                                            │
│              │                                                  │
│              ▼                                                  │
│  4. Amount IMMEDIATELY DEDUCTED from wallet                     │
│     Request sent to stall (status: pending)                     │
│              │                                                  │
│       ┌──────┴──────┐                                           │
│       │             │                                           │
│   ACCEPTED      REJECTED/CANCELLED                              │
│       │             │                                           │
│       ▼             ▼                                           │
│  Amount added    Amount REFUNDED                                │
│  to stall sales  to buyer wallet                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Tables Overview

| Table | Purpose |
|-------|---------|
| `zaika_stalls` | Links team registrations to stalls |
| `zaika_menu_items` | Food items for each stall |
| `zaika_wallets` | Buyer wallet balances |
| `zaika_topup_requests` | Requests to add money |
| `zaika_transactions` | Payment transactions |

### SQL File Location
`supabase/zaika_schema.sql` - Contains complete schema with:
- All 5 tables
- Indexes for performance
- RLS policies for security
- Helper functions
- Auto-create stall trigger

---

## User Flows

### Flow 1: Buyer Journey
```
1. Student logs in → Goes to "Hot Topics" in sidebar
2. Clicks on "Zaika" card
3. System checks: NOT registered for Zaika → Shows BUYER DASHBOARD
4. Buyer Dashboard has tabs:
   - Wallet: Shows balance, "Add Money" button, transaction history
   - Stalls: List of all stalls with stall number, name, click to view
   - Pending: Shows pending payment requests (can cancel)

5. ADD MONEY FLOW:
   - Click "Add Money" → Enter amount (min ₹50) → Submit
   - Goes to physical counter, gives cash
   - Coordinator approves in Manage Zaika → Balance added

6. PURCHASE FLOW:
   - Browse Stalls → Click on stall → See menu items
   - Click "Buy" on item → Enter quantity → Confirm
   - Amount deducted → Request sent to stall
   - Stall accepts → Done! OR Stall rejects/Buyer cancels → Refund
```

### Flow 2: Stall Owner Journey
```
1. Team registers for Zaika event → Gets confirmed
2. Stall auto-created with next available number
3. Team member logs in → Goes to "Hot Topics" → "Zaika"
4. System checks: IS registered for Zaika → Shows STALL DASHBOARD
5. Stall Dashboard has tabs:
   - Payments: Incoming requests (Accept/Reject)
   - Menu: Add/Edit/Remove food items
   - Sales: Total sales amount, transaction history
   - Settings: Change stall name

6. RECEIVE PAYMENT FLOW:
   - Notification: New payment request!
   - See: Buyer name, roll number, item, quantity, amount
   - Click "Accept" → Amount added to sales
   - OR Click "Reject" → Buyer gets refund
```

### Flow 3: Coordinator/Admin Management
```
1. Coordinator/Admin goes to "Manage Events"
2. New tab: "Manage Zaika" (alongside existing "Events" tab)
3. Manage Zaika has sections:
   - Top-up Requests: List of pending requests, Approve/Reject
   - Transactions: All transactions log with filters
   - Leaderboard: Stalls ranked by sales
```

---

## File Structure

### New Files to Create

```
src/
├── pages/
│   └── zaika/
│       ├── ZaikaMain.jsx              # Entry point - role check
│       ├── BuyerDashboard.jsx         # Buyer: wallet, stalls, pending
│       ├── StallDashboard.jsx         # Stall owner: payments, menu, sales
│       ├── StallDetail.jsx            # View stall menu, purchase
│       └── ZaikaLeaderboard.jsx       # Leaderboard component (for Updates)
│
├── components/
│   └── zaika/
│       ├── WalletCard.jsx             # Balance display
│       ├── AddMoneyModal.jsx          # Request top-up
│       ├── StallCard.jsx              # Stall preview card
│       ├── MenuItemCard.jsx           # Food item display
│       ├── PurchaseModal.jsx          # Enter quantity, confirm
│       ├── PaymentRequestCard.jsx     # Incoming request for stall
│       ├── TransactionRow.jsx         # Transaction history item
│       ├── PendingRequestCard.jsx     # Buyer's pending requests
│       ├── AddMenuItemModal.jsx       # Stall: add food item
│       ├── TopupRequestCard.jsx       # Admin: approve/reject topup
│       └── LeaderboardTable.jsx       # Ranking table
│
├── hooks/
│   └── useZaika.js                    # All Zaika-related queries/mutations
│
└── utils/
    └── zaikaConfig.js                 # Configuration constants

supabase/
└── zaika_schema.sql                   # All SQL (CREATED)
```

### Files to Modify

```
src/
├── App.jsx                            # Add Zaika routes
├── components/
│   ├── student/layout/StudentShell.jsx    # Add "Hot Topics" to sidebar
│   └── coordinator/layout/CoordinatorShell.jsx  # Add "Hot Topics" to sidebar
├── pages/
│   ├── coordinator/
│   │   └── CoordinatorEvents.jsx      # Add "Manage Zaika" tab
│   └── student/
│       └── StudentUpdates.jsx         # Add "Zaika Leaderboard" tab
```

---

## Component Specifications

### 1. ZaikaMain.jsx (Entry Point)
```jsx
/**
 * Entry point for Zaika feature
 * Checks if current user is a stall owner or buyer
 * Renders appropriate dashboard
 */
Props: none
State:
  - isStallOwner: boolean
  - loading: boolean
  - stallData: object | null
  - walletData: object | null

Logic:
  1. On mount, call is_zaika_stall_owner(profile.id)
  2. If true → fetch stall data → render StallDashboard
  3. If false → fetch/create wallet → render BuyerDashboard
```

### 2. BuyerDashboard.jsx
```jsx
/**
 * Dashboard for buyers (non-stall owners)
 * Tabs: Wallet, Stalls, Pending Requests
 */
Props:
  - wallet: object (id, balance, total_spent)

State:
  - activeTab: 'wallet' | 'stalls' | 'pending'
  - stalls: array
  - pendingTransactions: array
  - topupRequests: array
  - showAddMoneyModal: boolean

Tabs:
  1. Wallet Tab:
     - WalletCard (balance display)
     - "Add Money" button → AddMoneyModal
     - List of top-up requests with status
  
  2. Stalls Tab:
     - Grid of StallCard components
     - Click → navigate to StallDetail
  
  3. Pending Tab:
     - List of PendingRequestCard
     - Each has "Cancel" button (if status = pending)
```

### 3. StallDashboard.jsx
```jsx
/**
 * Dashboard for stall owners
 * Tabs: Payments, Menu, Sales, Settings
 */
Props:
  - stall: object

State:
  - activeTab: 'payments' | 'menu' | 'sales' | 'settings'
  - pendingRequests: array
  - menuItems: array
  - transactions: array
  - stallName: string

Real-time:
  - Subscribe to zaika_transactions where stall_id = this stall
  - On INSERT with status='pending' → Show notification, refresh list

Tabs:
  1. Payments Tab:
     - Total Sales amount (prominent)
     - List of PaymentRequestCard (pending only)
     - Each has Accept/Reject buttons
  
  2. Menu Tab:
     - "Add Item" button → AddMenuItemModal
     - Grid of MenuItemCard with edit/delete
  
  3. Sales Tab:
     - Total sales figure
     - Transaction history (completed only)
  
  4. Settings Tab:
     - Edit stall name input
     - Save button
```

### 4. StallDetail.jsx
```jsx
/**
 * View a specific stall's menu and make purchases
 */
Props: none (get stall_id from URL params)

State:
  - stall: object
  - menuItems: array
  - selectedItem: object | null
  - showPurchaseModal: boolean

Display:
  - Stall header (number, name, description)
  - Menu items grid
  - Each item shows: image, name, price, description
  - "Buy" button on each item → PurchaseModal
```

### 5. PaymentRequestCard.jsx
```jsx
/**
 * Card showing incoming payment request (for stall owners)
 */
Props:
  - transaction: object
  - onAccept: function
  - onReject: function

Display:
  - Buyer avatar/icon
  - Buyer name, roll number
  - Item name, quantity
  - Total amount
  - Accept button (green)
  - Reject button (red)
```

### 6. ManageZaika.jsx (Coordinator)
```jsx
/**
 * Coordinator/Admin panel for Zaika management
 * Sections: Top-up Requests, Transactions, Leaderboard
 */
State:
  - activeSection: 'topups' | 'transactions' | 'leaderboard'
  - pendingTopups: array
  - allTransactions: array
  - leaderboard: array

Sections:
  1. Top-up Requests:
     - List of TopupRequestCard (pending)
     - Shows: user name, roll number, amount, timestamp
     - Approve/Reject buttons
  
  2. Transactions:
     - Filterable table of all transactions
     - Columns: Time, Buyer, Stall, Item, Amount, Status
  
  3. Leaderboard:
     - LeaderboardTable component
     - Rank, Stall Name, Leader Name, Total Sales
```

---

## API & Queries

### Hook: useZaika.js

```javascript
/**
 * Custom hook for all Zaika operations
 */

// READ Operations
- useIsStallOwner(profileId) → boolean
- useMyStall(profileId) → stall object
- useMyWallet(profileId) → wallet object
- useAllStalls() → stalls array
- useStallMenu(stallId) → menu items array
- useMyPendingTransactions(profileId) → transactions array
- useStallPendingRequests(stallId) → transactions array
- useMyTopupRequests(profileId) → requests array
- usePendingTopups() → requests array (admin)
- useLeaderboard() → ranked stalls array

// WRITE Operations
- createTopupRequest(amount) → request object
- approveTopupRequest(requestId) → success
- rejectTopupRequest(requestId, reason) → success
- createPurchase(stallId, menuItemId, quantity) → transaction object
- cancelTransaction(transactionId) → success
- acceptTransaction(transactionId) → success
- rejectTransaction(transactionId) → success
- addMenuItem(stallId, item) → menu item object
- updateMenuItem(itemId, updates) → menu item object
- deleteMenuItem(itemId) → success
- updateStallName(stallId, name) → success
```

---

## Real-time Features

### Subscriptions Needed

```javascript
// 1. Stall owners: Listen for new payment requests
supabase
  .channel('stall-payments')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'zaika_transactions',
    filter: `stall_id=eq.${stallId}`
  }, handleNewRequest)
  .subscribe()

// 2. Buyers: Listen for transaction status changes
supabase
  .channel('my-transactions')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'zaika_transactions',
    filter: `buyer_profile_id=eq.${profileId}`
  }, handleStatusChange)
  .subscribe()

// 3. Buyers: Listen for topup approval
supabase
  .channel('my-topups')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'zaika_topup_requests',
    filter: `profile_id=eq.${profileId}`
  }, handleTopupStatus)
  .subscribe()

// 4. Admin: Listen for new topup requests
supabase
  .channel('all-topups')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'zaika_topup_requests'
  }, handleNewTopup)
  .subscribe()
```

---

## Implementation Phases

### Phase 1: Foundation (Day 1-2)
**Goal:** Database setup + Basic role detection

- [ ] Create SQL migration file ✅ DONE
- [ ] Run migrations in Supabase ⏳ PENDING
- [ ] Create `useZaika.js` hook with role check
- [ ] Create `ZaikaMain.jsx` with role routing
- [ ] Add "Hot Topics" to sidebars (Student + Coordinator)
- [ ] Add routes to App.jsx

**Deliverable:** Clicking Zaika shows "You are a stall owner" or "You are a buyer" based on registration.

### Phase 2: Buyer Wallet (Day 2-3)
**Goal:** Buyers can add money and see balance

- [ ] Create `BuyerDashboard.jsx` with Wallet tab
- [ ] Create `WalletCard.jsx`
- [ ] Create `AddMoneyModal.jsx`
- [ ] Implement topup request creation
- [ ] Add "Manage Zaika" tab to CoordinatorEvents
- [ ] Create basic `ManageZaika.jsx` with topup approval
- [ ] Implement topup approval function

**Deliverable:** Buyer requests ₹100 → Coordinator approves → Balance shows ₹100

### Phase 3: Stall Menu (Day 3-4)
**Goal:** Stall owners can add menu items

- [ ] Create `StallDashboard.jsx` with Menu tab
- [ ] Create `AddMenuItemModal.jsx`
- [ ] Create `MenuItemCard.jsx`
- [ ] Implement CRUD for menu items
- [ ] Create `StallCard.jsx` for listing
- [ ] Add Stalls tab to BuyerDashboard
- [ ] Create `StallDetail.jsx`

**Deliverable:** Stall adds "Samosa - ₹20" → Buyers see it when browsing

### Phase 4: Transactions (Day 4-5)
**Goal:** Full purchase flow working

- [ ] Create `PurchaseModal.jsx`
- [ ] Implement `create_zaika_purchase` function call
- [ ] Create `PaymentRequestCard.jsx`
- [ ] Add Payments tab to StallDashboard
- [ ] Implement accept/reject functions
- [ ] Create `PendingRequestCard.jsx`
- [ ] Add Pending tab to BuyerDashboard
- [ ] Implement cancel function

**Deliverable:** Complete flow: Buyer purchases → Stall accepts → Sales updated

### Phase 5: Real-time & Polish (Day 5-6)
**Goal:** Real-time notifications + Leaderboard

- [ ] Add Supabase real-time subscriptions
- [ ] Add notification sounds/toasts
- [ ] Create `LeaderboardTable.jsx`
- [ ] Add Leaderboard tab to StudentUpdates
- [ ] Add Leaderboard section to ManageZaika
- [ ] Add Sales tab to StallDashboard
- [ ] Polish UI, loading states, error handling

**Deliverable:** Real-time updates + Leaderboard visible

### Phase 6: Testing & Edge Cases (Day 6-7)
**Goal:** Production ready

- [ ] Test all flows end-to-end
- [ ] Test edge cases (insufficient balance, concurrent requests)
- [ ] Test RLS policies
- [ ] Mobile responsiveness check
- [ ] Load testing with multiple users
- [ ] Documentation

---

## Testing Checklist

### Critical Flows
- [ ] Non-registered user sees Buyer Dashboard
- [ ] Registered user (leader) sees Stall Dashboard
- [ ] Registered user (team member) sees Stall Dashboard
- [ ] Buyer can request top-up (min ₹50)
- [ ] Coordinator can approve top-up
- [ ] Balance updates after approval
- [ ] Stall owner can add menu item
- [ ] Buyer can see all stalls
- [ ] Buyer can see stall menu
- [ ] Buyer can purchase item
- [ ] Amount deducted immediately on purchase
- [ ] Stall sees incoming request in real-time
- [ ] Stall can accept request
- [ ] Sales increase on acceptance
- [ ] Buyer can cancel pending request
- [ ] Amount refunded on cancel
- [ ] Stall can reject request
- [ ] Amount refunded on rejection
- [ ] Cannot cancel after acceptance
- [ ] Leaderboard shows correct ranking

### Edge Cases
- [ ] Purchase with insufficient balance → Error message
- [ ] Purchase from own stall → Should be blocked
- [ ] Menu item marked unavailable → Cannot purchase
- [ ] Multiple pending requests → All handled correctly
- [ ] Rapid consecutive purchases → No race conditions
- [ ] Coordinator not assigned to Zaika → Can still see Manage Zaika (if admin)

---

## Security Considerations

1. **RLS Policies:** All tables have row-level security
2. **Function Security:** All functions use `SECURITY DEFINER`
3. **Balance Validation:** Cannot go negative (CHECK constraint)
4. **Minimum Amount:** Enforced at DB level (CHECK constraint)
5. **Status Validation:** Only valid status values allowed
6. **Self-purchase Prevention:** Check in purchase function
7. **Double-spending Prevention:** Deduct immediately, refund on failure

---

## Configuration Constants

```javascript
// src/utils/zaikaConfig.js
export const ZAIKA_CONFIG = {
  MIN_TOPUP_AMOUNT: 50,
  EVENT_NAME: 'Zaika', // Must match event name in DB (case-insensitive)
}
```

---

## Summary

This implementation plan provides a complete roadmap for the Zaika Digital Wallet System. The system is designed to be:

- **Fraud-proof:** Digital transactions instead of physical coupons
- **Real-time:** Instant notifications for payments
- **Fair:** Transparent leaderboard based on actual sales
- **User-friendly:** Single entry point with role-based UI

**Estimated Total Development Time:** 5-7 days

**Priority Order:**
1. Database + Role Detection
2. Wallet + Top-up
3. Menu Management
4. Transaction Flow
5. Real-time + Leaderboard
6. Testing + Polish

---

## 📊 Implementation Status Tracker

| Date | Status | Details | Next Action |
|------|--------|---------|-------------|
| 2026-02-02 | ✅ DONE | Created `zaika_implementation` branch | Run SQL migration |
| 2026-02-02 | ✅ DONE | Created SQL schema file: `supabase/zaika_schema.sql` | User needs to run SQL in Supabase |
| 2026-02-03 | ✅ DONE | SQL migration executed in Supabase | Create React components |
| 2026-02-03 | ✅ DONE | Phase 1 Foundation Complete | Test and move to Phase 2 |

### Current Phase: **Phase 2 - Wallet & Top-up Flow (Testing)**
### Current Task: **Test Phase 1 Foundation**

### Files Created:
**Database:**
- `supabase/zaika_schema.sql` - Complete database schema with tables, RLS policies, functions, and triggers ✅

**Configuration & Hooks:**
- `src/utils/zaikaConfig.js` - Configuration constants (MIN_TOPUP, QUICK_AMOUNTS, STATUS_COLORS) ✅
- `src/hooks/useZaika.js` - All Zaika custom hooks (useZaika, useZaikaWallet, useZaikaStall, etc.) ✅

**Pages:**
- `src/pages/HotTopics.jsx` - Landing page for Hot Topics section ✅
- `src/pages/zaika/ZaikaMain.jsx` - Entry point (role detection) ✅
- `src/pages/zaika/BuyerDashboard.jsx` - Buyer wallet & stall browsing ✅
- `src/pages/zaika/StallDashboard.jsx` - Stall owner payment management ✅
- `src/pages/admin/AdminZaikaDashboard.jsx` - Admin leaderboard & top-up approvals ✅

**Components:**
- `src/components/zaika/AddMoneyModal.jsx` - Top-up request modal ✅
- `src/components/zaika/StallCard.jsx` - Stall display card ✅
- `src/components/zaika/StallMenuModal.jsx` - Menu browsing & ordering ✅
- `src/components/zaika/PendingRequestCard.jsx` - Pending order card ✅
- `src/components/zaika/MenuManagement.jsx` - Stall menu CRUD ✅
- `src/components/zaika/SalesStats.jsx` - Stall sales statistics ✅
- `src/components/zaika/StallSettings.jsx` - Stall settings form ✅

**Navigation & Routes:**
- `StudentShell.jsx` - Added Hot Topics link with Flame icon ✅
- `CoordinatorShell.jsx` - Added Hot Topics link with Flame icon ✅
- `AdminShell.jsx` - Added Zaika link with Flame icon ✅
- `App.jsx` - Added routes for hot-topics, zaika, admin/zaika ✅

### Next Steps:
1. Test the application by navigating to Hot Topics
2. Test Buyer flow (add money, browse stalls)
3. Test Stall owner flow (menu management, receive payments)
4. Test Admin flow (approve top-ups, view leaderboard)
5. Fix any bugs found during testing
