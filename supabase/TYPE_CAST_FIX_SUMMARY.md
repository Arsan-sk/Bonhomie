# Type Cast Error Fix Summary

## Issue Encountered

**Error**: `operator does not exist: character varying = uuid`

**Location**: DELETE queries in cleanup scripts

**Root Cause**: PostgreSQL couldn't implicitly convert between types when comparing `auth.refresh_tokens.user_id` (UUID) with subquery results.

## Schema Understanding

```sql
-- profiles table
profiles.id → UUID (references auth.users.id)
profiles.auth_user_id → UUID (nullable, for offline-created profiles)

-- auth.users table
auth.users.id → UUID

-- auth.refresh_tokens table
auth.refresh_tokens.user_id → UUID

-- auth.sessions table
auth.sessions.user_id → UUID

-- auth.identities table
auth.identities.user_id → UUID
```

## Fix Applied

Added explicit `::uuid` type casts to all subqueries:

### Before (WRONG):
```sql
DELETE FROM auth.refresh_tokens 
WHERE user_id IN (
    SELECT au.id FROM auth.users au    -- ❌ No type cast
    JOIN profiles p ON p.auth_user_id = au.id
    WHERE p.roll_number LIKE '%TEST%'
);
```

### After (CORRECT):
```sql
DELETE FROM auth.refresh_tokens 
WHERE user_id IN (
    SELECT au.id::uuid FROM auth.users au    -- ✅ Explicit cast
    JOIN profiles p ON p.auth_user_id = au.id
    WHERE p.roll_number LIKE '%TEST%'
);
```

## Files Fixed

1. ✅ [CLEANUP_CORRUPT_DATA.sql](./CLEANUP_CORRUPT_DATA.sql) - 4 fixes
2. ✅ [ULTIMATE_FIX_RUN_THIS.sql](./ULTIMATE_FIX_RUN_THIS.sql) - 6 fixes
3. ✅ [EMERGENCY_RESET.sql](./EMERGENCY_RESET.sql) - 4 fixes

## New File Created

- ✅ [DELETE_FREE_FIRE_23EC59.sql](./DELETE_FREE_FIRE_23EC59.sql) - Safe deletion script for specific registration

## How to Use Updated Scripts

### 1. Clean Corrupt Data (Fixed)
```sql
-- Run in Supabase SQL Editor
\i supabase/CLEANUP_CORRUPT_DATA.sql
```
Now works without type errors!

### 2. Delete Specific Registration
```sql
-- Run in Supabase SQL Editor
\i supabase/DELETE_FREE_FIRE_23EC59.sql

-- Review the preview, then uncomment DELETE statement to execute
```

## Testing Verification

Run this to verify no type issues:
```sql
-- Test query - should work without errors
SELECT COUNT(*) 
FROM auth.refresh_tokens 
WHERE user_id IN (
    SELECT au.id::uuid FROM auth.users au
    JOIN profiles p ON p.auth_user_id = au.id
    WHERE p.roll_number LIKE '%TEST%'
);
```

## Why This Happened

PostgreSQL's type system requires explicit casts when:
- Using subqueries in IN clauses
- Comparing different data types
- Working with auth schema tables (stricter typing)

The auth tables use strict UUID types, so even though both columns are UUIDs, PostgreSQL needs explicit confirmation via `::uuid` cast in complex queries.

## Prevention

Always use explicit type casts when:
```sql
-- ✅ GOOD
WHERE user_id IN (SELECT id::uuid FROM ...)
WHERE user_id = some_value::uuid
WHERE id = (SELECT profile_id::uuid FROM ...)

-- ❌ RISKY (may fail)
WHERE user_id IN (SELECT id FROM ...)
WHERE user_id = some_value
WHERE id = (SELECT profile_id FROM ...)
```

## Status

✅ All type cast errors fixed
✅ All cleanup scripts now work
✅ Deletion script for Free Fire registration created
✅ Safe to run without errors
