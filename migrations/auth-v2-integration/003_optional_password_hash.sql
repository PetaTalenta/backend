-- Migration: 003_optional_password_hash.sql
-- Description: Make password_hash optional for Firebase users
-- Author: AI Assistant
-- Date: 2025-10-04
-- Dependencies: 002_add_federation_metadata.sql
-- WARNING: This migration cannot be rolled back if Firebase users exist without password_hash

-- ============================================================================
-- FORWARD MIGRATION
-- ============================================================================

BEGIN;

-- Remove NOT NULL constraint from password_hash
-- This allows Firebase users to exist without password_hash
ALTER TABLE auth.users 
ALTER COLUMN password_hash DROP NOT NULL;

-- Add validation: password_hash required for local users only
ALTER TABLE auth.users 
ADD CONSTRAINT chk_password_hash_required 
CHECK (
  (auth_provider = 'local' AND password_hash IS NOT NULL) OR
  (auth_provider IN ('firebase', 'hybrid'))
);

-- Update comment
COMMENT ON COLUMN auth.users.password_hash IS 
'Password hash (bcrypt) - Required for local auth (auth_provider = ''local''), NULL for Firebase users';

COMMIT;

-- Verify migration
DO $$
DECLARE
    is_nullable TEXT;
    has_constraint BOOLEAN;
BEGIN
    -- Check if column is now nullable
    SELECT is_nullable INTO is_nullable
    FROM information_schema.columns 
    WHERE table_schema = 'auth' 
    AND table_name = 'users' 
    AND column_name = 'password_hash';
    
    -- Check if constraint exists
    SELECT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'chk_password_hash_required'
        AND conrelid = 'auth.users'::regclass
    ) INTO has_constraint;
    
    IF is_nullable = 'YES' AND has_constraint THEN
        RAISE NOTICE 'Migration 003_optional_password_hash.sql completed successfully';
    ELSE
        RAISE EXCEPTION 'Migration 003_optional_password_hash.sql failed. Nullable: %, Constraint: %', is_nullable, has_constraint;
    END IF;
END $$;

-- ============================================================================
-- ROLLBACK SCRIPT (DANGEROUS - MAY FAIL)
-- ============================================================================

-- WARNING: This rollback will FAIL if there are Firebase users without password_hash
-- Only run if you're sure all users have password_hash values

-- To rollback this migration, run:
-- BEGIN;
-- 
-- -- First, check if there are users without password_hash
-- DO $$
-- DECLARE
--     null_password_count INTEGER;
-- BEGIN
--     SELECT COUNT(*) INTO null_password_count
--     FROM auth.users 
--     WHERE password_hash IS NULL;
--     
--     IF null_password_count > 0 THEN
--         RAISE EXCEPTION 'Cannot rollback: % users exist without password_hash', null_password_count;
--     END IF;
-- END $$;
-- 
-- -- If check passes, proceed with rollback
-- ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS chk_password_hash_required;
-- ALTER TABLE auth.users ALTER COLUMN password_hash SET NOT NULL;
-- 
-- COMMIT;
