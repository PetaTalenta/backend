-- Migration: 002_add_federation_metadata.sql
-- Description: Add federation metadata columns for hybrid authentication
-- Author: AI Assistant
-- Date: 2025-10-04
-- Dependencies: 001_add_firebase_uid.sql

-- ============================================================================
-- FORWARD MIGRATION
-- ============================================================================

BEGIN;

-- Add auth_provider column
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'local';

-- Add provider_data column (JSONB for flexible provider-specific data)
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS provider_data JSONB;

-- Add last_firebase_sync column
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS last_firebase_sync TIMESTAMP;

-- Add federation_status column
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS federation_status VARCHAR(20) DEFAULT 'active';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_provider 
ON auth.users(auth_provider);

CREATE INDEX IF NOT EXISTS idx_users_federation_status 
ON auth.users(federation_status);

-- Add constraints
ALTER TABLE auth.users 
ADD CONSTRAINT chk_auth_provider 
CHECK (auth_provider IN ('local', 'firebase', 'hybrid'));

ALTER TABLE auth.users 
ADD CONSTRAINT chk_federation_status 
CHECK (federation_status IN ('active', 'syncing', 'failed', 'disabled'));

-- Add comments
COMMENT ON COLUMN auth.users.auth_provider IS 
'Authentication provider: local (password-based), firebase (Firebase Auth), hybrid (both)';

COMMENT ON COLUMN auth.users.provider_data IS 
'Additional provider-specific data stored as JSON. Examples: email_verified, sign_in_provider, etc.';

COMMENT ON COLUMN auth.users.last_firebase_sync IS 
'Timestamp of last successful synchronization with Firebase Auth';

COMMENT ON COLUMN auth.users.federation_status IS 
'Federation status: active (normal), syncing (in progress), failed (sync error), disabled (federation off)';

-- Update existing users to have auth_provider = 'local'
UPDATE auth.users 
SET auth_provider = 'local' 
WHERE auth_provider IS NULL;

COMMIT;

-- Verify migration
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns 
    WHERE table_schema = 'auth' 
    AND table_name = 'users' 
    AND column_name IN ('auth_provider', 'provider_data', 'last_firebase_sync', 'federation_status');
    
    IF column_count = 4 THEN
        RAISE NOTICE 'Migration 002_add_federation_metadata.sql completed successfully';
    ELSE
        RAISE EXCEPTION 'Migration 002_add_federation_metadata.sql failed. Expected 4 columns, found %', column_count;
    END IF;
END $$;

-- ============================================================================
-- ROLLBACK SCRIPT
-- ============================================================================

-- To rollback this migration, run:
-- BEGIN;
-- ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS chk_federation_status;
-- ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS chk_auth_provider;
-- DROP INDEX IF EXISTS idx_users_federation_status;
-- DROP INDEX IF EXISTS idx_users_auth_provider;
-- ALTER TABLE auth.users DROP COLUMN IF EXISTS federation_status;
-- ALTER TABLE auth.users DROP COLUMN IF EXISTS last_firebase_sync;
-- ALTER TABLE auth.users DROP COLUMN IF EXISTS provider_data;
-- ALTER TABLE auth.users DROP COLUMN IF EXISTS auth_provider;
-- COMMIT;
