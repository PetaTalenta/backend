#!/bin/bash

# ============================================================================
# Auth V2 Integration - Migration Runner
# ============================================================================
# This script helps run database migrations for auth-v2-service integration
# Usage: ./run-migrations.sh [environment]
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

# Migration files (in order)
MIGRATIONS=(
    "001_add_firebase_uid.sql"
    "002_add_federation_metadata.sql"
    "003_optional_password_hash.sql"
)

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

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if Docker is running
    if ! docker ps >/dev/null 2>&1; then
        print_error "Docker is not running"
        exit 1
    fi
    print_success "Docker is running"
    
    # Check if PostgreSQL container exists
    if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        print_error "PostgreSQL container '${DB_CONTAINER}' not found"
        exit 1
    fi
    print_success "PostgreSQL container found"
    
    # Check if migrations directory exists
    if [ ! -d "${SCRIPT_DIR}" ]; then
        print_error "Migrations directory not found: ${SCRIPT_DIR}"
        exit 1
    fi
    print_success "Migrations directory found"
    
    # Check if all migration files exist
    for migration in "${MIGRATIONS[@]}"; do
        if [ ! -f "${SCRIPT_DIR}/${migration}" ]; then
            print_error "Migration file not found: ${migration}"
            exit 1
        fi
    done
    print_success "All migration files found"
    
    echo
}

backup_database() {
    print_header "Creating Database Backup"
    
    # Create backup directory if not exists
    mkdir -p "${BACKUP_DIR}"
    
    # Generate backup filename with timestamp
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="${BACKUP_DIR}/backup_${ENVIRONMENT}_${TIMESTAMP}.sql"
    
    print_info "Backing up database to: ${BACKUP_FILE}"
    
    # Create full database backup
    if docker exec "${DB_CONTAINER}" pg_dump -U "${DB_USER}" "${DB_NAME}" > "${BACKUP_FILE}"; then
        print_success "Database backup created successfully"
        
        # Show backup size
        BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
        print_info "Backup size: ${BACKUP_SIZE}"
    else
        print_error "Failed to create database backup"
        exit 1
    fi
    
    echo
}

verify_schema() {
    print_header "Verifying Current Schema"
    
    print_info "Checking auth.users table structure..."
    
    # Check if table exists
    if docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users');" | grep -q "t"; then
        print_success "auth.users table exists"
    else
        print_error "auth.users table does not exist"
        exit 1
    fi
    
    # Show current columns
    print_info "Current columns in auth.users:"
    docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "\d auth.users" | grep -E "^\s*(id|email|username|password_hash|user_type|is_active|token_balance|firebase_uid|auth_provider)" || true
    
    echo
}

run_migration() {
    local migration_file=$1
    local migration_name=$(basename "${migration_file}" .sql)
    
    print_info "Running migration: ${migration_name}"
    
    # Run migration
    if docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" < "${SCRIPT_DIR}/${migration_file}" 2>&1 | tee /tmp/migration_output.log; then
        
        # Check if migration was successful (look for success message in output)
        if grep -q "completed successfully" /tmp/migration_output.log; then
            print_success "Migration ${migration_name} completed successfully"
            return 0
        elif grep -q "already exists" /tmp/migration_output.log; then
            print_warning "Migration ${migration_name} already applied (skipping)"
            return 0
        else
            print_error "Migration ${migration_name} completed with warnings"
            return 1
        fi
    else
        print_error "Migration ${migration_name} failed"
        cat /tmp/migration_output.log
        return 1
    fi
}

run_all_migrations() {
    print_header "Running Migrations"
    
    local success_count=0
    local total_count=${#MIGRATIONS[@]}
    
    for migration in "${MIGRATIONS[@]}"; do
        if run_migration "${migration}"; then
            ((success_count++))
        else
            print_error "Migration failed: ${migration}"
            print_error "Stopping migration process"
            exit 1
        fi
        echo
    done
    
    print_success "Completed ${success_count}/${total_count} migrations"
    echo
}

verify_migrations() {
    print_header "Verifying Migrations"
    
    print_info "Checking new columns..."
    
    # Check firebase_uid column
    if docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'firebase_uid');" | grep -q "t"; then
        print_success "firebase_uid column exists"
    else
        print_error "firebase_uid column not found"
    fi
    
    # Check auth_provider column
    if docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'auth_provider');" | grep -q "t"; then
        print_success "auth_provider column exists"
    else
        print_error "auth_provider column not found"
    fi
    
    # Check provider_data column
    if docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'provider_data');" | grep -q "t"; then
        print_success "provider_data column exists"
    else
        print_error "provider_data column not found"
    fi
    
    # Check federation_status column
    if docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'federation_status');" | grep -q "t"; then
        print_success "federation_status column exists"
    else
        print_error "federation_status column not found"
    fi
    
    # Show updated schema
    print_info "Updated schema:"
    docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "\d auth.users"
    
    # Check constraints
    print_info "Constraints:"
    docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'auth.users'::regclass AND conname LIKE 'chk_%' ORDER BY conname;"
    
    # Check indexes
    print_info "Indexes:"
    docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'users' AND schemaname = 'auth' ORDER BY indexname;"
    
    echo
}

show_summary() {
    print_header "Migration Summary"
    
    # Count users by auth_provider
    print_info "User distribution by auth provider:"
    docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT auth_provider, COUNT(*) as count FROM auth.users GROUP BY auth_provider ORDER BY count DESC;"
    
    # Show sample data
    print_info "Sample user data (first 5 rows):"
    docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT id, email, auth_provider, firebase_uid IS NOT NULL as has_firebase_uid, password_hash IS NOT NULL as has_password, federation_status FROM auth.users LIMIT 5;"
    
    echo
    print_success "All migrations completed successfully!"
    print_info "Database backup saved at: ${BACKUP_FILE}"
    print_info "Next steps:"
    echo "  1. Test auth-v2-service with new schema"
    echo "  2. Verify user creation and authentication"
    echo "  3. Update service configurations"
    echo "  4. Deploy to production when ready"
    echo
}

# ============================================================================
# Main Script
# ============================================================================

main() {
    print_header "Auth V2 Integration - Database Migration"
    print_info "Environment: ${ENVIRONMENT}"
    print_info "Database: ${DB_NAME}"
    print_info "Container: ${DB_CONTAINER}"
    echo
    
    # Show warning for production
    if [ "${ENVIRONMENT}" = "production" ]; then
        print_warning "Running migrations on PRODUCTION database!"
        confirm_action "Are you absolutely sure you want to continue?"
    fi
    
    # Run migration steps
    check_prerequisites
    verify_schema
    
    # Confirm before backup
    confirm_action "Create database backup and proceed with migrations?"
    
    backup_database
    run_all_migrations
    verify_migrations
    show_summary
}

# Run main function
main

exit 0
