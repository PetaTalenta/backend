#!/bin/bash

###############################################################################
# Database Backup Script for Auth V2 Integration
# 
# Purpose: Create timestamped backups of the PostgreSQL database
# Usage: ./scripts/backup-database.sh [backup_name]
# 
# Created: October 4, 2025
# Phase: 5 - Migration & Deployment
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${1:-backup_${TIMESTAMP}}"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.sql"
CONTAINER_NAME="atma-postgres"
DB_NAME="atma_db"
DB_USER="atma_user"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Database Backup Script - Auth V2 Integration             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Docker container is running
echo -e "${YELLOW}[1/5]${NC} Checking Docker container status..."
if ! docker ps | grep -q "${CONTAINER_NAME}"; then
    echo -e "${RED}✗ Error: PostgreSQL container '${CONTAINER_NAME}' is not running${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Container is running${NC}"
echo ""

# Check database connectivity
echo -e "${YELLOW}[2/5]${NC} Testing database connectivity..."
if ! docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}✗ Error: Cannot connect to database${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Database connection successful${NC}"
echo ""

# Get database statistics before backup
echo -e "${YELLOW}[3/5]${NC} Gathering database statistics..."
TOTAL_USERS=$(docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM auth.users;" | tr -d ' ')
FIREBASE_USERS=$(docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM auth.users WHERE auth_provider = 'firebase';" | tr -d ' ')
LOCAL_USERS=$(docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM auth.users WHERE auth_provider = 'local';" | tr -d ' ')

echo -e "  Total Users: ${TOTAL_USERS}"
echo -e "  Firebase Users: ${FIREBASE_USERS}"
echo -e "  Local Users: ${LOCAL_USERS}"
echo ""

# Create backup
echo -e "${YELLOW}[4/5]${NC} Creating database backup..."
echo -e "  Backup file: ${BACKUP_FILE}"

if docker exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists > "${BACKUP_FILE}"; then
    echo -e "${GREEN}✓ Backup created successfully${NC}"
else
    echo -e "${RED}✗ Error: Backup failed${NC}"
    exit 1
fi
echo ""

# Verify backup
echo -e "${YELLOW}[5/5]${NC} Verifying backup..."
BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
BACKUP_LINES=$(wc -l < "${BACKUP_FILE}")

if [ -s "${BACKUP_FILE}" ]; then
    echo -e "${GREEN}✓ Backup verified${NC}"
    echo -e "  Size: ${BACKUP_SIZE}"
    echo -e "  Lines: ${BACKUP_LINES}"
else
    echo -e "${RED}✗ Error: Backup file is empty${NC}"
    exit 1
fi
echo ""

# Create backup metadata
METADATA_FILE="${BACKUP_FILE}.meta"
cat > "${METADATA_FILE}" << EOF
Backup Metadata
===============
Timestamp: ${TIMESTAMP}
Database: ${DB_NAME}
Container: ${CONTAINER_NAME}
Backup File: ${BACKUP_FILE}
Size: ${BACKUP_SIZE}
Lines: ${BACKUP_LINES}

Database Statistics:
- Total Users: ${TOTAL_USERS}
- Firebase Users: ${FIREBASE_USERS}
- Local Users: ${LOCAL_USERS}

Created by: backup-database.sh
Phase: 5 - Migration & Deployment
EOF

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Backup Completed Successfully ✓                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Backup Details:"
echo -e "  File: ${BACKUP_FILE}"
echo -e "  Metadata: ${METADATA_FILE}"
echo -e "  Size: ${BACKUP_SIZE}"
echo ""
echo -e "${BLUE}To restore this backup, run:${NC}"
echo -e "  docker exec -i ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} < ${BACKUP_FILE}"
echo ""

