# Auth V2 Integration - Database Migrations

This directory contains SQL migration scripts to prepare the database for auth-v2-service integration.

## Overview

These migrations add support for Firebase Authentication while maintaining backward compatibility with the existing local authentication system.

## Migration Files

| File | Description | Status |
|------|-------------|--------|
| `001_add_firebase_uid.sql` | Adds `firebase_uid` column and indexes | ✅ Ready |
| `002_add_federation_metadata.sql` | Adds federation tracking columns | ✅ Ready |
| `003_optional_password_hash.sql` | Makes password optional for Firebase users | ✅ Ready |

## Prerequisites

- PostgreSQL 12+
- Existing `auth.users` table
- Database backup completed
- Test environment available

## How to Apply Migrations

### Step 1: Backup Database

**CRITICAL**: Always backup before running migrations!

```bash
# Full database backup
docker exec atma-postgres pg_dump -U atma_user atma_db \
  > backup_before_auth_v2_$(date +%Y%m%d_%H%M%S).sql

# Auth schema only
docker exec atma-postgres pg_dump -U atma_user -n auth atma_db \
  > backup_auth_schema_$(date +%Y%m%d_%H%M%S).sql

# Verify backup size
ls -lh backup_*.sql
```

### Step 2: Apply Migrations (One by One)

**Important**: Apply migrations in order!

```bash
# Migration 001
docker exec -i atma-postgres psql -U atma_user -d atma_db \
  < 001_add_firebase_uid.sql

# Migration 002
docker exec -i atma-postgres psql -U atma_user -d atma_db \
  < 002_add_federation_metadata.sql

# Migration 003
docker exec -i atma-postgres psql -U atma_user -d atma_db \
  < 003_optional_password_hash.sql
```

### Step 3: Verify Migrations

```bash
# Connect to database
docker exec -it atma-postgres psql -U atma_user -d atma_db

# Check schema
\d+ auth.users

# Check constraints
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'auth.users'::regclass
ORDER BY conname;

# Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users' AND schemaname = 'auth'
ORDER BY indexname;

# Exit
\q
```

## Expected Schema After Migrations

```sql
CREATE TABLE auth.users (
    -- Existing columns
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),  -- NOW NULLABLE
    user_type VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    token_balance INTEGER DEFAULT 0,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- NEW columns
    firebase_uid VARCHAR(128) UNIQUE,
    auth_provider VARCHAR(20) DEFAULT 'local',
    provider_data JSONB,
    last_firebase_sync TIMESTAMP,
    federation_status VARCHAR(20) DEFAULT 'active',
    
    -- Constraints
    CONSTRAINT chk_auth_provider 
        CHECK (auth_provider IN ('local', 'firebase', 'hybrid')),
    CONSTRAINT chk_federation_status 
        CHECK (federation_status IN ('active', 'syncing', 'failed', 'disabled')),
    CONSTRAINT chk_password_hash_required 
        CHECK (
            (auth_provider = 'local' AND password_hash IS NOT NULL) OR
            (auth_provider IN ('firebase', 'hybrid'))
        ),
    CONSTRAINT chk_firebase_uid_format 
        CHECK (firebase_uid IS NULL OR LENGTH(firebase_uid) >= 20)
);
```

## Verification Queries

### Check New Columns Exist

```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'auth' 
AND table_name = 'users'
AND column_name IN (
    'firebase_uid', 
    'auth_provider', 
    'provider_data', 
    'last_firebase_sync', 
    'federation_status'
)
ORDER BY column_name;
```

### Check Constraints

```sql
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'auth.users'::regclass
AND conname LIKE 'chk_%'
ORDER BY conname;
```

### Check Indexes

```sql
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'users' 
AND schemaname = 'auth'
AND indexname LIKE '%firebase%' OR indexname LIKE '%auth_provider%' OR indexname LIKE '%federation%'
ORDER BY indexname;
```

### Test Data Integrity

```sql
-- Should return 0 (all existing users should be 'local')
SELECT COUNT(*) 
FROM auth.users 
WHERE auth_provider IS NULL;

-- Should return all users (existing users are local)
SELECT COUNT(*) 
FROM auth.users 
WHERE auth_provider = 'local';

-- Should return 0 (no Firebase users yet)
SELECT COUNT(*) 
FROM auth.users 
WHERE auth_provider = 'firebase';

-- Check password_hash is still present for local users
SELECT COUNT(*) 
FROM auth.users 
WHERE auth_provider = 'local' 
AND password_hash IS NULL;  -- Should be 0
```

## Rollback Procedures

### Rollback All Migrations

**WARNING**: This will lose all Firebase user associations!

```bash
# Create rollback script
cat > rollback_all.sql << 'EOF'
BEGIN;

-- Rollback 003
ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS chk_password_hash_required;
-- Note: Cannot set NOT NULL back if Firebase users exist

-- Rollback 002
ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS chk_federation_status;
ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS chk_auth_provider;
DROP INDEX IF EXISTS idx_users_federation_status;
DROP INDEX IF EXISTS idx_users_auth_provider;
ALTER TABLE auth.users DROP COLUMN IF EXISTS federation_status;
ALTER TABLE auth.users DROP COLUMN IF EXISTS last_firebase_sync;
ALTER TABLE auth.users DROP COLUMN IF EXISTS provider_data;
ALTER TABLE auth.users DROP COLUMN IF EXISTS auth_provider;

-- Rollback 001
ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS chk_firebase_uid_format;
DROP INDEX IF EXISTS idx_users_firebase_uid;
ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS uq_users_firebase_uid;
ALTER TABLE auth.users DROP COLUMN IF EXISTS firebase_uid;

COMMIT;
EOF

# Apply rollback
docker exec -i atma-postgres psql -U atma_user -d atma_db < rollback_all.sql
```

### Rollback Individual Migration

See rollback scripts at the bottom of each migration file.

## Testing on Staging

### Test Environment Setup

```bash
# 1. Create test database
docker exec -it atma-postgres psql -U atma_user -c "CREATE DATABASE atma_db_test;"

# 2. Copy schema from production
docker exec atma-postgres pg_dump -U atma_user -s atma_db \
  | docker exec -i atma-postgres psql -U atma_user atma_db_test

# 3. Apply migrations to test database
for file in 001_*.sql 002_*.sql 003_*.sql; do
  echo "Applying $file..."
  docker exec -i atma-postgres psql -U atma_user -d atma_db_test < "$file"
done

# 4. Verify
docker exec -it atma-postgres psql -U atma_user -d atma_db_test -c "\d+ auth.users"
```

### Test Data Creation

```sql
-- Test 1: Create Firebase user
INSERT INTO auth.users (
    firebase_uid, 
    auth_provider, 
    email, 
    user_type, 
    is_active, 
    token_balance,
    federation_status
) VALUES (
    'firebase-test-uid-123456789012345678',
    'firebase',
    'firebase-test@example.com',
    'user',
    true,
    0,
    'active'
);

-- Test 2: Create local user (should still work)
INSERT INTO auth.users (
    auth_provider, 
    email, 
    password_hash,
    user_type, 
    is_active, 
    token_balance
) VALUES (
    'local',
    'local-test@example.com',
    '$2b$10$abcdefghijklmnopqrstuvwxyz123456789',
    'user',
    true,
    0
);

-- Test 3: Try to create local user without password (should FAIL)
INSERT INTO auth.users (
    auth_provider, 
    email, 
    user_type
) VALUES (
    'local',
    'bad-test@example.com',
    'user'
);
-- Expected error: new row for relation "users" violates check constraint "chk_password_hash_required"

-- Verify tests
SELECT 
    id,
    firebase_uid,
    auth_provider,
    email,
    password_hash IS NOT NULL as has_password,
    federation_status
FROM auth.users
WHERE email LIKE '%test@example.com'
ORDER BY created_at DESC;
```

## Common Issues & Solutions

### Issue 1: Migration Fails Due to Existing Constraints

**Error**: `constraint "..." already exists`

**Solution**:
```sql
-- Check existing constraints
SELECT conname FROM pg_constraint WHERE conrelid = 'auth.users'::regclass;

-- Drop conflicting constraint before migration
ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS <constraint_name>;
```

### Issue 2: Column Already Exists

**Error**: `column "firebase_uid" already exists`

**Solution**:
All migrations use `IF NOT EXISTS` and `IF EXISTS`, so they're idempotent. You can safely re-run them.

### Issue 3: Cannot Set NOT NULL on password_hash (Rollback)

**Error**: `column "password_hash" contains null values`

**Solution**:
This is expected if Firebase users exist. You cannot rollback migration 003 without first migrating all Firebase users to local auth or deleting them.

```sql
-- Check Firebase users
SELECT COUNT(*) FROM auth.users WHERE auth_provider = 'firebase';

-- Option 1: Migrate to local (set dummy passwords)
UPDATE auth.users 
SET password_hash = '$2b$10$DUMMY_HASH_FOR_MIGRATION'
WHERE auth_provider = 'firebase' AND password_hash IS NULL;

-- Option 2: Delete Firebase users (DESTRUCTIVE)
DELETE FROM auth.users WHERE auth_provider = 'firebase';
```

## Performance Considerations

### Index Usage

The migrations create indexes on:
- `firebase_uid` (for user lookup by Firebase)
- `auth_provider` (for filtering by provider type)
- `federation_status` (for monitoring sync status)

These indexes will be used by:
```sql
-- Fast lookup by Firebase UID
SELECT * FROM auth.users WHERE firebase_uid = ?;

-- Fast filtering by provider
SELECT * FROM auth.users WHERE auth_provider = 'firebase';

-- Monitor failed syncs
SELECT * FROM auth.users WHERE federation_status = 'failed';
```

### Storage Impact

Estimated additional storage per user:
- `firebase_uid`: ~60 bytes
- `auth_provider`: ~10 bytes
- `provider_data`: ~100-500 bytes (JSON)
- `last_firebase_sync`: 8 bytes
- `federation_status`: ~10 bytes

**Total**: ~200-600 bytes per user

For 100,000 users: ~20-60 MB additional storage (negligible)

## Monitoring

### Monitor Migration Status

```sql
-- Check migration was applied
SELECT 
    column_name,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'auth' 
        AND table_name = 'users' 
        AND column_name = 'firebase_uid'
    ) as firebase_uid_exists,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'auth' 
        AND table_name = 'users' 
        AND column_name = 'auth_provider'
    ) as auth_provider_exists,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'auth' 
        AND table_name = 'users' 
        AND column_name = 'provider_data'
    ) as provider_data_exists;
```

### Monitor User Distribution

```sql
-- User distribution by auth provider
SELECT 
    auth_provider,
    COUNT(*) as user_count,
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM auth.users
GROUP BY auth_provider
ORDER BY user_count DESC;

-- Federation status distribution
SELECT 
    federation_status,
    COUNT(*) as user_count
FROM auth.users
GROUP BY federation_status
ORDER BY user_count DESC;

-- Users with sync issues
SELECT 
    id,
    email,
    auth_provider,
    federation_status,
    last_firebase_sync,
    EXTRACT(EPOCH FROM (NOW() - last_firebase_sync))/3600 as hours_since_sync
FROM auth.users
WHERE federation_status != 'active'
OR (last_firebase_sync IS NOT NULL AND last_firebase_sync < NOW() - INTERVAL '24 hours')
ORDER BY last_firebase_sync ASC;
```

## Next Steps

After successfully applying these migrations:

1. ✅ Verify all migrations completed
2. ✅ Test with sample data
3. ✅ Update auth-v2-service configuration
4. ✅ Implement user federation service
5. ✅ Test end-to-end authentication flow
6. ✅ Deploy to staging
7. ✅ Monitor and validate
8. ✅ Deploy to production

## Support

For issues or questions:
- Check logs: `docker logs atma-postgres`
- Review migration files for rollback scripts
- Test on staging environment first
- Always have database backup ready

---

**Last Updated**: 2025-10-04  
**Version**: 1.0  
**Status**: ✅ Ready for Use
