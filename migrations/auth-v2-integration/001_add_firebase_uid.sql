-- Migration: 001_add_firebase_uid.sql
-- Description: Add firebase_uid column to auth.users table
-- Author: AI Assistant
-- Date: 2025-10-04
-- Dependencies: auth.users table must exist

-- ============================================================================
-- FORWARD MIGRATION
-- ============================================================================

BEGIN;

-- Add firebase_uid column
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(128);

-- Add unique constraint
ALTER TABLE auth.users 
ADD CONSTRAINT uq_users_firebase_uid UNIQUE (firebase_uid);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid 
ON auth.users(firebase_uid);

-- Add constraint for Firebase UID format
ALTER TABLE auth.users 
ADD CONSTRAINT chk_firebase_uid_format 
CHECK (firebase_uid IS NULL OR LENGTH(firebase_uid) >= 20);

-- Add comment
COMMENT ON COLUMN auth.users.firebase_uid IS 
'Firebase Authentication UID - Links to Firebase Auth user. NULL for local users.';

COMMIT;

-- Verify migration
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'auth' 
        AND table_name = 'users' 
        AND column_name = 'firebase_uid'
    ) THEN
        RAISE NOTICE 'Migration 001_add_firebase_uid.sql completed successfully';
    ELSE
        RAISE EXCEPTION 'Migration 001_add_firebase_uid.sql failed';
    END IF;
END $$;

-- ============================================================================
-- ROLLBACK SCRIPT
-- ============================================================================

-- To rollback this migration, run:
-- BEGIN;
-- ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS chk_firebase_uid_format;
-- DROP INDEX IF EXISTS idx_users_firebase_uid;
-- ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS uq_users_firebase_uid;
-- ALTER TABLE auth.users DROP COLUMN IF EXISTS firebase_uid;
-- COMMIT;
