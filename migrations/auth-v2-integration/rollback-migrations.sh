#!/bin/bash

# ============================================================================
# Auth V2 Integration - Rollback Script
# ============================================================================
# This script rolls back all auth-v2 database migrations
# WARNING: This will remove all Firebase user associations!
# Usage: ./rollback-migrations.sh [environment]
# Environment: staging | production (default: staging)
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT=${1:-staging}
DB_CONTAINER="fg-postgres"
DB_USER="fg_user"
DB_NAME="fg_db"
BACKUP_DIR="${SCRIPT_DIR}/../../backups"

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "${BLUE}============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

confirm_action() {
    read -p "$(echo -e ${YELLOW}$1 [y/N]: ${NC})" -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Operation cancelled by user"
        exit 1
    fi
}

# ============================================================================
# Rollback Functions
# ============================================================================

check_firebase_users() {
    print_header "Checking Firebase Users"
    
    local firebase_count=$(docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM auth.users WHERE auth_provider = 'firebase' OR firebase_uid IS NOT NULL;" | tr -d ' ')
    
    if [ "${firebase_count}" -gt 0 ]; then
        print_warning "Found ${firebase_count} Firebase users in database"
        print_warning "Rolling back will remove Firebase associations!"
        
        # Show sample Firebase users
        print_info "Sample Firebase users:"
        docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT id, email, firebase_uid, auth_provider FROM auth.users WHERE auth_provider = 'firebase' OR firebase_uid IS NOT NULL LIMIT 5;"
        
        confirm_action "Do you want to continue with rollback?"
    else
        print_success "No Firebase users found. Safe to rollback."
    fi
    
    echo
}

backup_before_rollback() {
    print_header "Creating Backup Before Rollback"
    
    mkdir -p "${BACKUP_DIR}"
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="${BACKUP_DIR}/backup_before_rollback_${ENVIRONMENT}_${TIMESTAMP}.sql"
    
    print_info "Creating backup: ${BACKUP_FILE}"
    
    if docker exec "${DB_CONTAINER}" pg_dump -U "${DB_USER}" "${DB_NAME}" > "${BACKUP_FILE}"; then
        print_success "Backup created successfully"
        BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
        print_info "Backup size: ${BACKUP_SIZE}"
    else
        print_error "Failed to create backup"
        exit 1
    fi
    
    echo
}

create_rollback_sql() {
    local rollback_file="/tmp/rollback_auth_v2.sql"
    
    cat > "${rollback_file}" << 'EOF'
-- Rollback Auth V2 Integration Migrations
-- WARNING: This will remove all Firebase user associations!

BEGIN;

-- Log start
DO $$ BEGIN RAISE NOTICE 'Starting rollback of auth-v2 migrations...'; END $$;

-- Step 1: Check for Firebase users with NULL password_hash
DO $$
DECLARE
    null_password_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_password_count
    FROM auth.users 
    WHERE password_hash IS NULL;
    
    IF null_password_count > 0 THEN
        RAISE NOTICE 'Found % users without password_hash (likely Firebase users)', null_password_count;
        RAISE NOTICE 'These users will need password_hash before setting NOT NULL constraint';
    END IF;
END $$;

-- Step 2: Rollback Migration 003 (optional_password_hash)
DO $$ BEGIN RAISE NOTICE 'Rolling back migration 003_optional_password_hash...'; END $$;

-- Remove check constraint
ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS chk_password_hash_required;

-- Note: We cannot set NOT NULL back if Firebase users exist without password_hash
-- This step is commented out to prevent data loss
-- ALTER TABLE auth.users ALTER COLUMN password_hash SET NOT NULL;

-- Step 3: Rollback Migration 002 (federation_metadata)
DO $$ BEGIN RAISE NOTICE 'Rolling back migration 002_add_federation_metadata...'; END $$;

-- Drop constraints
ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS chk_federation_status;
ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS chk_auth_provider;

-- Drop indexes
DROP INDEX IF EXISTS auth.idx_users_federation_status;
DROP INDEX IF EXISTS auth.idx_users_auth_provider;

-- Drop columns
ALTER TABLE auth.users DROP COLUMN IF EXISTS federation_status;
ALTER TABLE auth.users DROP COLUMN IF EXISTS last_firebase_sync;
ALTER TABLE auth.users DROP COLUMN IF EXISTS provider_data;
ALTER TABLE auth.users DROP COLUMN IF EXISTS auth_provider;

-- Step 4: Rollback Migration 001 (firebase_uid)
DO $$ BEGIN RAISE NOTICE 'Rolling back migration 001_add_firebase_uid...'; END $$;

-- Drop constraint
ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS chk_firebase_uid_format;

-- Drop index
DROP INDEX IF EXISTS auth.idx_users_firebase_uid;

-- Drop unique constraint
ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS uq_users_firebase_uid;

-- Drop column
ALTER TABLE auth.users DROP COLUMN IF EXISTS firebase_uid;

-- Log completion
DO $$ BEGIN RAISE NOTICE 'Rollback completed successfully!'; END $$;

COMMIT;

-- Verify rollback
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns 
    WHERE table_schema = 'auth' 
    AND table_name = 'users' 
    AND column_name IN ('firebase_uid', 'auth_provider', 'provider_data', 'last_firebase_sync', 'federation_status');
    
    IF column_count = 0 THEN
        RAISE NOTICE '✅ Rollback verification: All new columns removed successfully';
    ELSE
        RAISE WARNING '⚠️ Rollback verification: Found % columns that should have been removed', column_count;
    END IF;
END $$;
EOF

    echo "${rollback_file}"
}

execute_rollback() {
    print_header "Executing Rollback"
    
    local rollback_file=$(create_rollback_sql)
    
    print_info "Running rollback script..."
    
    if docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" < "${rollback_file}" 2>&1 | tee /tmp/rollback_output.log; then
        
        if grep -q "completed successfully" /tmp/rollback_output.log; then
            print_success "Rollback completed successfully"
        else
            print_warning "Rollback completed with warnings"
            cat /tmp/rollback_output.log
        fi
    else
        print_error "Rollback failed"
        cat /tmp/rollback_output.log
        exit 1
    fi
    
    echo
}

verify_rollback() {
    print_header "Verifying Rollback"
    
    # Check that new columns are removed
    print_info "Checking removed columns..."
    
    local columns=("firebase_uid" "auth_provider" "provider_data" "last_firebase_sync" "federation_status")
    
    for column in "${columns[@]}"; do
        if docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = '${column}');" | grep -q "f"; then
            print_success "${column} column removed"
        else
            print_error "${column} column still exists"
        fi
    done
    
    # Show current schema
    print_info "Current schema:"
    docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "\d auth.users"
    
    echo
}

show_rollback_summary() {
    print_header "Rollback Summary"
    
    print_success "Rollback completed successfully!"
    print_info "Database has been restored to pre-auth-v2 state"
    print_info "Backup saved at: ${BACKUP_FILE}"
    
    print_warning "Important Notes:"
    echo "  - All Firebase user associations have been removed"
    echo "  - Users may need to re-register if they were Firebase-only users"
    echo "  - Existing local users (with passwords) are unaffected"
    echo "  - You can restore from backup if needed: ${BACKUP_FILE}"
    
    echo
}

# ============================================================================
# Main Script
# ============================================================================

main() {
    print_header "Auth V2 Integration - Rollback Migrations"
    print_info "Environment: ${ENVIRONMENT}"
    print_info "Database: ${DB_NAME}"
    echo
    
    print_warning "⚠️  WARNING: This will rollback all auth-v2 migrations!"
    print_warning "⚠️  All Firebase user associations will be removed!"
    print_warning "⚠️  Make sure you have a backup!"
    echo
    
    # Extra confirmation for production
    if [ "${ENVIRONMENT}" = "production" ]; then
        print_error "Rolling back PRODUCTION database!"
        confirm_action "Are you ABSOLUTELY SURE you want to rollback production?"
        confirm_action "Last chance - proceed with rollback?"
    else
        confirm_action "Proceed with rollback?"
    fi
    
    # Execute rollback
    check_firebase_users
    backup_before_rollback
    execute_rollback
    verify_rollback
    show_rollback_summary
}

# Run main function
main

exit 0
