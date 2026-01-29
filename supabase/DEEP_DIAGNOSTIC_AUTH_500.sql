-- ============================================================================
-- DEEP DIAGNOSTIC: Find what's causing "Database error querying schema"
-- The 500 error happens at Supabase auth level - something is malformed
-- ============================================================================

-- ============================================================================
-- CHECK 1: Find duplicate identities (causes 500 error)
-- ============================================================================

SELECT 
    '1. DUPLICATE IDENTITIES' as check,
    user_id,
    provider,
    COUNT(*) as count
FROM auth.identities
GROUP BY user_id, provider
HAVING COUNT(*) > 1;

-- ============================================================================
-- CHECK 2: Find identities with NULL or empty provider_id
-- ============================================================================

SELECT 
    '2. BAD PROVIDER_ID' as check,
    id,
    user_id,
    provider,
    provider_id,
    'provider_id is NULL or empty' as issue
FROM auth.identities
WHERE provider_id IS NULL OR provider_id = '';

-- ============================================================================
-- CHECK 3: Find identities with malformed identity_data
-- ============================================================================

SELECT 
    '3. MALFORMED IDENTITY_DATA' as check,
    id,
    user_id,
    identity_data,
    'identity_data missing sub or email' as issue
FROM auth.identities
WHERE identity_data IS NULL
   OR NOT (identity_data ? 'sub')
   OR NOT (identity_data ? 'email');

-- ============================================================================
-- CHECK 4: Find auth.users with NULL required fields
-- ============================================================================

SELECT 
    '4. AUTH.USERS WITH NULL FIELDS' as check,
    id,
    email,
    CASE WHEN instance_id IS NULL THEN 'instance_id NULL' END as issue1,
    CASE WHEN aud IS NULL THEN 'aud NULL' END as issue2,
    CASE WHEN role IS NULL THEN 'role NULL' END as issue3,
    CASE WHEN encrypted_password IS NULL THEN 'NO PASSWORD' END as issue4
FROM auth.users
WHERE instance_id IS NULL
   OR aud IS NULL
   OR role IS NULL
   OR encrypted_password IS NULL
LIMIT 20;

-- ============================================================================
-- CHECK 5: Find triggers on auth schema that might cause errors
-- ============================================================================

SELECT 
    '5. TRIGGERS ON AUTH TABLES' as check,
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
   OR event_object_schema = 'auth';

-- ============================================================================
-- CHECK 6: Count of users vs identities
-- ============================================================================

SELECT 
    '6. USERS VS IDENTITIES COUNT' as check,
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM auth.identities) as total_identities,
    (SELECT COUNT(*) FROM auth.users) - (SELECT COUNT(*) FROM auth.identities) as difference;

-- ============================================================================
-- CHECK 7: Find users with wrong instance_id (must be all zeros)
-- ============================================================================

SELECT 
    '7. WRONG INSTANCE_ID' as check,
    id,
    email,
    instance_id,
    'instance_id must be 00000000-0000-0000-0000-000000000000' as issue
FROM auth.users
WHERE instance_id != '00000000-0000-0000-0000-000000000000'
LIMIT 20;

-- ============================================================================
-- CHECK 8: Find users where aud or role is wrong
-- ============================================================================

SELECT 
    '8. WRONG AUD OR ROLE' as check,
    id,
    email,
    aud,
    role,
    'aud and role must be "authenticated"' as issue
FROM auth.users
WHERE aud != 'authenticated' OR role != 'authenticated'
LIMIT 20;

-- ============================================================================
-- CHECK 9: Check for any SSO users (should be FALSE for email login)
-- ============================================================================

SELECT 
    '9. SSO USERS (should be FALSE)' as check,
    id,
    email,
    is_sso_user
FROM auth.users
WHERE is_sso_user = TRUE
LIMIT 20;

-- ============================================================================
-- CHECK 10: Sample identity data to verify format
-- ============================================================================

SELECT 
    '10. SAMPLE IDENTITY DATA' as check,
    ai.user_id,
    au.email,
    ai.provider,
    ai.provider_id,
    ai.identity_data
FROM auth.identities ai
JOIN auth.users au ON au.id = ai.user_id
LIMIT 10;

-- ============================================================================
-- CHECK 11: Find identities where provider_id doesn't match user_id
-- ============================================================================

SELECT 
    '11. PROVIDER_ID MISMATCH' as check,
    id,
    user_id,
    provider_id,
    user_id::text as should_be,
    'provider_id must equal user_id as text' as issue
FROM auth.identities
WHERE provider = 'email' AND provider_id != user_id::text
LIMIT 20;

-- ============================================================================
-- CHECK 12: Check raw_app_meta_data format
-- ============================================================================

SELECT 
    '12. RAW_APP_META_DATA CHECK' as check,
    id,
    email,
    raw_app_meta_data,
    CASE 
        WHEN raw_app_meta_data IS NULL THEN '❌ NULL'
        WHEN NOT (raw_app_meta_data ? 'provider') THEN '❌ Missing provider'
        ELSE '✅ OK'
    END as status
FROM auth.users
WHERE raw_app_meta_data IS NULL 
   OR NOT (raw_app_meta_data ? 'provider')
LIMIT 20;
