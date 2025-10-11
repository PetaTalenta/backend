#!/bin/bash

# Comprehensive Admin Endpoints Testing Script
# Tests all endpoints documented in docs/admin-endpoint.md

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:3000/api"
ADMIN_EMAIL="superadmin@atma.com"
ADMIN_PASSWORD="admin123"
TOKEN=""
TEST_USER_ID=""

# Results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
ISSUES_FOUND=()

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
    ISSUES_FOUND+=("$1")
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    local expected_status=${5:-200}
    
    ((TOTAL_TESTS++))
    log_info "Testing: $method $endpoint - $description"
    
    local curl_cmd="curl -s -w '%{http_code}' -X $method '$API_BASE$endpoint' -H 'Content-Type: application/json'"
    if [[ -n "$TOKEN" ]]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $TOKEN'"
    fi
    if [[ -n "$data" ]]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    local response=$(eval "$curl_cmd")
    local status_code="${response: -3}"
    local body="${response%???}"
    
    if [[ "$status_code" == "$expected_status" ]]; then
        log_success "$method $endpoint returned $status_code"
        echo "$body" | jq . 2>/dev/null || echo "$body"
    else
        log_error "$method $endpoint returned $status_code (expected $expected_status)"
        echo "$body" | jq . 2>/dev/null || echo "$body"
    fi
    
    echo "---"
}

# Start testing
log_info "Starting Comprehensive Admin Endpoints Testing"
log_info "=============================================="

# Phase 1: Authentication
log_info "Phase 1: Testing Authentication Endpoints"

# Test admin login
test_endpoint "POST" "/admin/direct/login" "Admin login" \
    '{"email":"'$ADMIN_EMAIL'","password":"'$ADMIN_PASSWORD'"}'

# Extract token from login response
log_info "Extracting authentication token..."
LOGIN_RESPONSE=$(curl -s -X POST $API_BASE/admin/direct/login \
    -H "Content-Type: application/json" \
    -d '{"email":"'$ADMIN_EMAIL'","password":"'$ADMIN_PASSWORD'"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token // empty')

if [[ -z "$TOKEN" ]]; then
    log_error "Failed to get authentication token"
    exit 1
fi

log_success "Authentication token obtained"

# Test admin profile
test_endpoint "GET" "/admin/direct/profile" "Get admin profile"

# Test update admin profile
test_endpoint "PUT" "/admin/direct/profile" "Update admin profile" \
    '{"username":"testadminupdated"}'

# Test admin logout
test_endpoint "POST" "/admin/direct/logout" "Admin logout"

# Re-login for subsequent tests
LOGIN_RESPONSE=$(curl -s -X POST $API_BASE/admin/direct/login \
    -H "Content-Type: application/json" \
    -d '{"email":"'$ADMIN_EMAIL'","password":"'$ADMIN_PASSWORD'"}')
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token // empty')

# Phase 2: User Management
log_info "Phase 2: Testing User Management Endpoints"

# Test get users list
test_endpoint "GET" "/admin/direct/users" "Get users list"

# Test get users with pagination
test_endpoint "GET" "/admin/direct/users?page=1&limit=5" "Get users with pagination"

# Test get users with search
test_endpoint "GET" "/admin/direct/users?search=kasykoi" "Get users with search"

# Test get users with filters
test_endpoint "GET" "/admin/direct/users?userType=user&isActive=true" "Get users with filters"

# Get a test user ID for subsequent tests
USERS_RESPONSE=$(curl -s -X GET "$API_BASE/admin/direct/users?limit=1" \
    -H "Authorization: Bearer $TOKEN")
TEST_USER_ID=$(echo $USERS_RESPONSE | jq -r '.data.users[0].id // empty')

if [[ -n "$TEST_USER_ID" ]]; then
    log_info "Using test user ID: $TEST_USER_ID"
    
    # Test get specific user
    test_endpoint "GET" "/admin/direct/users/$TEST_USER_ID" "Get specific user details"
    
    # Test update user profile
    test_endpoint "PUT" "/admin/direct/users/$TEST_USER_ID/profile" "Update user profile" \
        '{"username":"updatedtestuser"}'
        
    # Phase 3: Token Management
    log_info "Phase 3: Testing Token Management Endpoints"
    
    # Test add tokens
    test_endpoint "POST" "/admin/direct/users/$TEST_USER_ID/tokens/add" "Add tokens to user" \
        '{"amount":5,"reason":"Testing token addition"}'
    
    # Test deduct tokens
    test_endpoint "POST" "/admin/direct/users/$TEST_USER_ID/tokens/deduct" "Deduct tokens from user" \
        '{"amount":2,"reason":"Testing token deduction"}'
    
    # Test token history
    test_endpoint "GET" "/admin/direct/users/$TEST_USER_ID/tokens/history" "Get token history"
else
    log_warning "No test user found, skipping user-specific tests"
fi

# Phase 4: Health Check
log_info "Phase 4: Testing Health Check Endpoints"

# Test database health
test_endpoint "GET" "/admin/direct/health/db" "Database health check"

# Phase 5: Analytics Endpoints
log_info "Phase 5: Testing Analytics Endpoints"

# Test user analytics overview
test_endpoint "GET" "/admin/direct/analytics/users/overview" "User analytics overview"

# Test user analytics with parameters
test_endpoint "GET" "/admin/direct/analytics/users/overview?period=daily" "User analytics with period"

# Test user demographics
test_endpoint "GET" "/admin/direct/analytics/users/demographics" "User demographics"

# Test user demographics with date range
test_endpoint "GET" "/admin/direct/analytics/users/demographics?startDate=2025-10-01&endDate=2025-10-11" "User demographics with date range"

# Phase 6: Assessment Management
log_info "Phase 6: Testing Assessment Management Endpoints"

# Test assessment overview
test_endpoint "GET" "/admin/direct/assessments/overview" "Assessment overview"

# Test assessment overview with parameters
test_endpoint "GET" "/admin/direct/assessments/overview?period=weekly" "Assessment overview with period"

# Phase 7: Token Analytics
log_info "Phase 7: Testing Token Analytics Endpoints"

# Test token analytics
test_endpoint "GET" "/admin/direct/tokens/analytics" "Token analytics"

# Test token analytics with parameters
test_endpoint "GET" "/admin/direct/tokens/analytics?period=monthly" "Token analytics with period"

# Phase 8: Job Analytics
log_info "Phase 8: Testing Job Analytics Endpoints"

# Test job analytics
test_endpoint "GET" "/admin/direct/jobs/analytics" "Job analytics"

# Test job analytics with parameters
test_endpoint "GET" "/admin/direct/jobs/analytics?period=hourly" "Job analytics with period"

# Phase 9: System Performance
log_info "Phase 9: Testing System Performance Endpoints"

# Test system health
test_endpoint "GET" "/admin/direct/system/health" "System health check"

# Test database stats
test_endpoint "GET" "/admin/direct/system/database/stats" "Database statistics"

# Phase 10: Security Endpoints
log_info "Phase 10: Testing Security Endpoints"

# Test security audit
test_endpoint "GET" "/admin/direct/security/audit" "Security audit report"

# Phase 11: Insights Endpoints
log_info "Phase 11: Testing Insights Endpoints"

# Test user behavior insights
test_endpoint "GET" "/admin/direct/insights/user-behavior" "User behavior analysis"

# Test user behavior with parameters
test_endpoint "GET" "/admin/direct/insights/user-behavior?period=weekly" "User behavior with period"

# Test assessment effectiveness
test_endpoint "GET" "/admin/direct/insights/assessment-effectiveness" "Assessment effectiveness metrics"

# Test business metrics
test_endpoint "GET" "/admin/direct/insights/business-metrics" "Business intelligence metrics"

# Phase 12: Dashboard Endpoints
log_info "Phase 12: Testing Dashboard Endpoints"

# Test dashboard alerts
test_endpoint "GET" "/admin/direct/dashboard/alerts" "Dashboard alerts"

# Test dashboard KPIs
test_endpoint "GET" "/admin/direct/dashboard/kpis" "Dashboard KPIs"

echo ""
log_info "Testing Summary"
log_info "==============="
log_info "Total tests: $TOTAL_TESTS"
log_success "Passed: $PASSED_TESTS"
log_error "Failed: $FAILED_TESTS"

if [[ ${#ISSUES_FOUND[@]} -gt 0 ]]; then
    log_warning "Issues found:"
    for issue in "${ISSUES_FOUND[@]}"; do
        echo "  - $issue"
    done
fi
