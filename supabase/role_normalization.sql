-- Role Normalization Migration (ENUM Fix)

BEGIN;

-- 1. Add new values to the ENUM type 'user_role'
-- Postgres allows adding values inside a transaction if not inside a block, 
-- but sometimes it must be done separately. 
-- If this transaction fails, run the ALTER TYPE commands separately.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'coordinator';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'student';

COMMIT;

BEGIN;

-- 2. Update existing 'faculty' to 'coordinator'
UPDATE public.profiles
SET role = 'coordinator'
WHERE role = 'faculty';

-- 3. Update existing 'user' to 'student'
UPDATE public.profiles
SET role = 'student'
WHERE role = 'user';

-- 4. Set Default Role to 'student'
ALTER TABLE public.profiles
ALTER COLUMN role SET DEFAULT 'student'::user_role;

COMMIT;
