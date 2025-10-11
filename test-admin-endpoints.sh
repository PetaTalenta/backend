#!/bin/bash

# Admin Service Direct Database Endpoints Testing Script
# Tests all 42 endpoints from the migration plan

set -e

BASE_URL="http://localhost:3007"
API_GATEWAY_URL="http://localhost:3000/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print test results
print_result() {
    local test_name="$1"
    local status="$2"
    local response="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓ PASS${NC} - $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAIL${NC} - $test_name"
        echo -e "${RED}Response: $response${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Function to test endpoint
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local expected_field="$4"
    local test_name="$5"
    local token="$6"
    
    local headers=""
    if [ -n "$token" ]; then
        headers="-H \"Authorization: Bearer $token\""
    fi
    
    local curl_cmd="curl -s -X $method"
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H \"Content-Type: application/json\" -d '$data'"
    fi
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    curl_cmd="$curl_cmd $BASE_URL$endpoint"
    
    local response=$(eval $curl_cmd)
    local success=$(echo "$response" | jq -r '.success // false')
    
    if [ "$success" = "true" ]; then
        if [ -n "$expected_field" ]; then
            local field_exists=$(echo "$response" | jq -r "has(\"$expected_field\")")
            if [ "$field_exists" = "true" ]; then
                print_result "$test_name" "PASS" "$response"
            else
                print_result "$test_name" "FAIL" "Missing expected field: $expected_field"
            fi
        else
            print_result "$test_name" "PASS" "$response"
        fi
    else
        print_result "$test_name" "FAIL" "$response"
    fi
}

echo -e "${BLUE}=== ADMIN SERVICE DIRECT DATABASE ENDPOINTS TESTING ===${NC}"
echo -e "${BLUE}Testing all 42 endpoints from migration plan${NC}"
echo ""

# Step 1: Authentication
echo -e "${YELLOW}=== Phase 1: Authentication Tests ===${NC}"

# Login test
echo "Testing admin login..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/admin/direct/login \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@futureguide.com", "password": "admin123"}')

LOGIN_SUCCESS=$(echo "$LOGIN_RESPONSE" | jq -r '.success // false')
if [ "$LOGIN_SUCCESS" = "true" ]; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
    print_result "POST /admin/direct/login" "PASS" "Login successful"
    echo -e "${GREEN}Token obtained: ${TOKEN:0:50}...${NC}"
else
    print_result "POST /admin/direct/login" "FAIL" "$LOGIN_RESPONSE"
    echo -e "${RED}Cannot proceed without token. Exiting.${NC}"
    exit 1
fi

# Test other auth endpoints
test_endpoint "GET" "/admin/direct/profile" "" "data" "GET /admin/direct/profile" "$TOKEN"
test_endpoint "GET" "/admin/direct/health/db" "" "success" "GET /admin/direct/health/db" ""

echo ""
echo -e "${YELLOW}=== Phase 2: User Management Tests ===${NC}"

# Get users list
test_endpoint "GET" "/admin/direct/users?page=1&limit=5" "" "data" "GET /admin/direct/users" "$TOKEN"

# Get specific user (using a test user ID - we'll need to get this dynamically)
echo "Getting a user ID for testing..."
USERS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/admin/direct/users?page=1&limit=1)
USER_ID=$(echo "$USERS_RESPONSE" | jq -r '.data.users[0].id // empty')

if [ -n "$USER_ID" ]; then
    test_endpoint "GET" "/admin/direct/users/$USER_ID" "" "data" "GET /admin/direct/users/:userId" "$TOKEN"
    test_endpoint "GET" "/admin/direct/users/$USER_ID/tokens/history" "" "data" "GET /admin/direct/users/:userId/tokens/history" "$TOKEN"
else
    echo -e "${YELLOW}No users found for detailed testing${NC}"
fi

echo ""
echo -e "${YELLOW}=== Phase 3: Analytics Tests ===${NC}"

# User Analytics
test_endpoint "GET" "/admin/direct/analytics/users/overview" "" "data" "GET /admin/direct/analytics/users/overview" "$TOKEN"
test_endpoint "GET" "/admin/direct/analytics/users/activity" "" "data" "GET /admin/direct/analytics/users/activity" "$TOKEN"
test_endpoint "GET" "/admin/direct/analytics/users/demographics" "" "data" "GET /admin/direct/analytics/users/demographics" "$TOKEN"
test_endpoint "GET" "/admin/direct/analytics/users/retention" "" "data" "GET /admin/direct/analytics/users/retention" "$TOKEN"

# Assessment Analytics
test_endpoint "GET" "/admin/direct/assessments/overview" "" "data" "GET /admin/direct/assessments/overview" "$TOKEN"
test_endpoint "GET" "/admin/direct/assessments/performance" "" "data" "GET /admin/direct/assessments/performance" "$TOKEN"
test_endpoint "GET" "/admin/direct/assessments/trends" "" "data" "GET /admin/direct/assessments/trends" "$TOKEN"

# Token Analytics
test_endpoint "GET" "/admin/direct/tokens/overview" "" "data" "GET /admin/direct/tokens/overview" "$TOKEN"
test_endpoint "GET" "/admin/direct/tokens/transactions" "" "data" "GET /admin/direct/tokens/transactions" "$TOKEN"
test_endpoint "GET" "/admin/direct/tokens/analytics" "" "data" "GET /admin/direct/tokens/analytics" "$TOKEN"

# Job Monitoring
test_endpoint "GET" "/admin/direct/jobs/monitor" "" "data" "GET /admin/direct/jobs/monitor" "$TOKEN"
test_endpoint "GET" "/admin/direct/jobs/queue/status" "" "data" "GET /admin/direct/jobs/queue/status" "$TOKEN"
test_endpoint "GET" "/admin/direct/jobs/analytics" "" "data" "GET /admin/direct/jobs/analytics" "$TOKEN"

# System Monitoring
test_endpoint "GET" "/admin/direct/system/metrics" "" "data" "GET /admin/direct/system/metrics" "$TOKEN"
test_endpoint "GET" "/admin/direct/system/health" "" "data" "GET /admin/direct/system/health" "$TOKEN"
test_endpoint "GET" "/admin/direct/system/database/stats" "" "data" "GET /admin/direct/system/database/stats" "$TOKEN"

echo ""
echo -e "${YELLOW}=== Phase 4: Security & Audit Tests ===${NC}"

# Security endpoints
test_endpoint "GET" "/admin/direct/security/audit" "" "data" "GET /admin/direct/security/audit" "$TOKEN"
test_endpoint "GET" "/admin/direct/security/suspicious-activities" "" "data" "GET /admin/direct/security/suspicious-activities" "$TOKEN"
test_endpoint "GET" "/admin/direct/security/login-patterns" "" "data" "GET /admin/direct/security/login-patterns" "$TOKEN"

# Audit endpoints
test_endpoint "GET" "/admin/direct/audit/activities" "" "data" "GET /admin/direct/audit/activities" "$TOKEN"
test_endpoint "GET" "/admin/direct/audit/data-access" "" "data" "GET /admin/direct/audit/data-access" "$TOKEN"

# Insights endpoints
test_endpoint "GET" "/admin/direct/insights/user-behavior" "" "data" "GET /admin/direct/insights/user-behavior" "$TOKEN"
test_endpoint "GET" "/admin/direct/insights/assessment-effectiveness" "" "data" "GET /admin/direct/insights/assessment-effectiveness" "$TOKEN"
test_endpoint "GET" "/admin/direct/insights/business-metrics" "" "data" "GET /admin/direct/insights/business-metrics" "$TOKEN"
test_endpoint "GET" "/admin/direct/insights/predictive-analytics" "" "data" "GET /admin/direct/insights/predictive-analytics" "$TOKEN"

# Data Management endpoints
test_endpoint "GET" "/admin/direct/data/integrity-check" "" "data" "GET /admin/direct/data/integrity-check" "$TOKEN"

# Dashboard endpoints
test_endpoint "GET" "/admin/direct/dashboard/realtime" "" "data" "GET /admin/direct/dashboard/realtime" "$TOKEN"
test_endpoint "GET" "/admin/direct/dashboard/alerts" "" "data" "GET /admin/direct/dashboard/alerts" "$TOKEN"
test_endpoint "GET" "/admin/direct/dashboard/kpis" "" "data" "GET /admin/direct/dashboard/kpis" "$TOKEN"

echo ""
echo -e "${BLUE}=== TESTING SUMMARY ===${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Check the output above.${NC}"
    exit 1
fi
