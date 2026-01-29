-- ============================================================================
-- CHECK AND FIX USER: 23ec41@aiktc.ac.in
-- ============================================================================

-- 1. Check if user exists in auth.users
SELECT 
    '1. AUTH.USERS' as table_name,
    id,
    email,
    encrypted_password IS NOT NULL as has_password,
    email_confirmed_at,
    created_at
FROM auth.users
WHERE email = '23ec41@aiktc.ac.in';

-- 2. Check if profile exists
SELECT 
    '2. PROFILES' as table_name,
    id,
    college_email,
    full_name,
    roll_number,
    auth_user_id,
    is_admin_created
FROM profiles
WHERE college_email = '23ec41@aiktc.ac.in';

-- 3. Check auth.identities
SELECT 
    '3. AUTH.IDENTITIES' as table_name,
    i.id,
    i.user_id,
    i.provider,
    i.provider_id
FROM auth.identities i
JOIN auth.users au ON au.id = i.user_id
WHERE au.email = '23ec41@aiktc.ac.in';

-- ============================================================================
-- 4. UPDATE PASSWORD TO "password"
-- ============================================================================

UPDATE auth.users
SET 
    encrypted_password = crypt('password', gen_salt('bf')),
    updated_at = NOW()
WHERE email = '23ec41@aiktc.ac.in';

-- 5. Verify the update
SELECT 
    '5. AFTER UPDATE' as status,
    email,
    encrypted_password IS NOT NULL as has_password,
    'Password set to: password' as new_password
FROM auth.users
WHERE email = '23ec41@aiktc.ac.in';
