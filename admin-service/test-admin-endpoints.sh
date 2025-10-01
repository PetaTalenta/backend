#!/bin/bash

# Admin Service Endpoint Testing Script
# This script tests all endpoints of the admin-service

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3000/api/admin-service"
ADMIN_EMAIL="superadmin"
ADMIN_PASSWORD="admin123"
TEST_USER_EMAIL="kasykoi@gmail.com"

# Variables
ADMIN_TOKEN=""
TEST_USER_ID=""
TEST_JOB_ID=""
TEST_RESULT_ID=""

# Counter for tests
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print section header
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Function to print test result
print_result() {
    local test_name=$1
    local status=$2
    local response=$3
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        echo -e "${YELLOW}Response: $response${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Function to make API call
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    
    if [ -n "$token" ]; then
        if [ -n "$data" ]; then
            curl -s -X "$method" "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $token" \
                -d "$data"
        else
            curl -s -X "$method" "$BASE_URL$endpoint" \
                -H "Authorization: Bearer $token"
        fi
    else
        if [ -n "$data" ]; then
            curl -s -X "$method" "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data"
        else
            curl -s -X "$method" "$BASE_URL$endpoint"
        fi
    fi
}

# Start testing
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Admin Service Endpoint Testing       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"

# ===== PHASE 1: ADMIN AUTHENTICATION =====
print_header "PHASE 1: ADMIN AUTHENTICATION"

# Test 1: Admin Login
echo "Test 1: Admin Login"
response=$(api_call "POST" "/admin/login" "{\"username\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
if echo "$response" | grep -q '"success":true'; then
    ADMIN_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    print_result "Admin Login" 0 "$response"
else
    print_result "Admin Login" 1 "$response"
    echo -e "${RED}Cannot proceed without admin token. Exiting...${NC}"
    exit 1
fi

# Test 2: Get Admin Profile
echo "Test 2: Get Admin Profile"
response=$(api_call "GET" "/admin/profile" "" "$ADMIN_TOKEN")
if echo "$response" | grep -q '"success":true'; then
    print_result "Get Admin Profile" 0 "$response"
else
    print_result "Get Admin Profile" 1 "$response"
fi

# Test 3: Update Admin Profile
echo "Test 3: Update Admin Profile"
response=$(api_call "PUT" "/admin/profile" "{\"full_name\":\"Super Admin Updated\"}" "$ADMIN_TOKEN")
if echo "$response" | grep -q '"success":true'; then
    print_result "Update Admin Profile" 0 "$response"
else
    print_result "Update Admin Profile" 1 "$response"
fi

# ===== PHASE 2: USER MANAGEMENT =====
print_header "PHASE 2: USER MANAGEMENT"

# Test 4: Get All Users
echo "Test 4: Get All Users"
response=$(api_call "GET" "/users?limit=10&page=1" "" "$ADMIN_TOKEN")
if echo "$response" | grep -q '"success":true'; then
    TEST_USER_ID=$(echo "$response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    print_result "Get All Users" 0 "$response"
else
    print_result "Get All Users" 1 "$response"
fi

# Test 5: Get User by ID
if [ -n "$TEST_USER_ID" ]; then
    echo "Test 5: Get User by ID"
    response=$(api_call "GET" "/users/$TEST_USER_ID" "" "$ADMIN_TOKEN")
    if echo "$response" | grep -q '"success":true'; then
        print_result "Get User by ID" 0 "$response"
    else
        print_result "Get User by ID" 1 "$response"
    fi
else
    echo -e "${YELLOW}Skipping Test 5: No user ID available${NC}"
fi

# Test 6: Update User Profile
if [ -n "$TEST_USER_ID" ]; then
    echo "Test 6: Update User Profile"
    response=$(api_call "PUT" "/users/$TEST_USER_ID/profile" "{\"full_name\":\"Test User Updated\"}" "$ADMIN_TOKEN")
    if echo "$response" | grep -q '"success":true'; then
        print_result "Update User Profile" 0 "$response"
    else
        print_result "Update User Profile" 1 "$response"
    fi
else
    echo -e "${YELLOW}Skipping Test 6: No user ID available${NC}"
fi

# Test 7: Update Token Balance
if [ -n "$TEST_USER_ID" ]; then
    echo "Test 7: Update Token Balance"
    response=$(api_call "POST" "/users/$TEST_USER_ID/token-balance" "{\"operation\":\"add\",\"amount\":100}" "$ADMIN_TOKEN")
    if echo "$response" | grep -q '"success":true'; then
        print_result "Update Token Balance" 0 "$response"
    else
        print_result "Update Token Balance" 1 "$response"
    fi
else
    echo -e "${YELLOW}Skipping Test 7: No user ID available${NC}"
fi

# ===== PHASE 3: SYSTEM MONITORING & ANALYTICS =====
print_header "PHASE 3: SYSTEM MONITORING & ANALYTICS"

# Test 8: Get Global Statistics
echo "Test 8: Get Global Statistics"
response=$(api_call "GET" "/stats/global" "" "$ADMIN_TOKEN")
if echo "$response" | grep -q '"success":true'; then
    print_result "Get Global Statistics" 0 "$response"
else
    print_result "Get Global Statistics" 1 "$response"
fi

# Test 9: Get Job Monitor
echo "Test 9: Get Job Monitor"
response=$(api_call "GET" "/jobs/monitor" "" "$ADMIN_TOKEN")
if echo "$response" | grep -q '"success":true'; then
    print_result "Get Job Monitor" 0 "$response"
else
    print_result "Get Job Monitor" 1 "$response"
fi

# Test 10: Get Queue Status
echo "Test 10: Get Queue Status"
response=$(api_call "GET" "/jobs/queue" "" "$ADMIN_TOKEN")
if echo "$response" | grep -q '"success":true'; then
    print_result "Get Queue Status" 0 "$response"
else
    print_result "Get Queue Status" 1 "$response"
fi

# Test 11: Get All Jobs (including deleted)
echo "Test 11: Get All Jobs (including deleted)"
response=$(api_call "GET" "/jobs/all?limit=20&include_deleted=true" "" "$ADMIN_TOKEN")
if echo "$response" | grep -q '"success":true'; then
    TEST_JOB_ID=$(echo "$response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    print_result "Get All Jobs" 0 "$response"
else
    print_result "Get All Jobs" 1 "$response"
fi

# ===== PHASE 4: DEEP ANALYTICS =====
print_header "PHASE 4: DEEP ANALYTICS"

# Test 12: Get Daily Analytics
echo "Test 12: Get Daily Analytics"
TODAY=$(date +%Y-%m-%d)
response=$(api_call "GET" "/analytics/daily?date=$TODAY" "" "$ADMIN_TOKEN")
if echo "$response" | grep -q '"success":true'; then
    print_result "Get Daily Analytics" 0 "$response"
else
    print_result "Get Daily Analytics" 1 "$response"
fi

# Test 13: Search Assessments
echo "Test 13: Search Assessments"
response=$(api_call "GET" "/assessments/search?limit=10" "" "$ADMIN_TOKEN")
if echo "$response" | grep -q '"success":true'; then
    TEST_RESULT_ID=$(echo "$response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    print_result "Search Assessments" 0 "$response"
else
    print_result "Search Assessments" 1 "$response"
fi

# Test 14: Get Assessment Details
if [ -n "$TEST_RESULT_ID" ]; then
    echo "Test 14: Get Assessment Details"
    response=$(api_call "GET" "/assessments/$TEST_RESULT_ID/details" "" "$ADMIN_TOKEN")
    if echo "$response" | grep -q '"success":true'; then
        print_result "Get Assessment Details" 0 "$response"
    else
        print_result "Get Assessment Details" 1 "$response"
    fi
else
    echo -e "${YELLOW}Skipping Test 14: No result ID available${NC}"
fi

# ===== PHASE 5: PERFORMANCE & SECURITY =====
print_header "PHASE 5: PERFORMANCE & SECURITY"

# Test 15: Get Performance Report
echo "Test 15: Get Performance Report"
response=$(api_call "GET" "/performance/report" "" "$ADMIN_TOKEN")
if echo "$response" | grep -q '"success":true'; then
    print_result "Get Performance Report" 0 "$response"
else
    print_result "Get Performance Report" 1 "$response"
fi

# Test 16: Get Security Audit
echo "Test 16: Get Security Audit"
response=$(api_call "GET" "/security/audit" "" "$ADMIN_TOKEN")
if echo "$response" | grep -q '"success":true'; then
    print_result "Get Security Audit" 0 "$response"
else
    print_result "Get Security Audit" 1 "$response"
fi

# ===== PHASE 6: ADMIN LOGOUT =====
print_header "PHASE 6: ADMIN LOGOUT"

# Test 17: Admin Logout
echo "Test 17: Admin Logout"
response=$(api_call "POST" "/admin/logout" "" "$ADMIN_TOKEN")
if echo "$response" | grep -q '"success":true'; then
    print_result "Admin Logout" 0 "$response"
else
    print_result "Admin Logout" 1 "$response"
fi

# ===== SUMMARY =====
print_header "TEST SUMMARY"
echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}\n"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed!${NC}\n"
    exit 1
fi

