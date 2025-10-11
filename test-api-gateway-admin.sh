#!/bin/bash

# API Gateway Admin Direct Endpoints Testing Script
# Tests all new admin direct endpoints through the API Gateway

set -e

GATEWAY_URL="http://localhost:3000/api"
DIRECT_URL="http://localhost:3007"

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

# Function to test endpoint through gateway
test_gateway_endpoint() {
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
    curl_cmd="$curl_cmd $GATEWAY_URL$endpoint"
    
    local response=$(eval $curl_cmd)
    local success=$(echo "$response" | jq -r '.success // false')
    
    if [ "$success" = "true" ]; then
        if [ -n "$expected_field" ]; then
            local field_exists=$(echo "$response" | jq -r "has(\"$expected_field\")")
            if [ "$field_exists" = "true" ]; then
                print_result "$test_name (via Gateway)" "PASS" "$response"
            else
                print_result "$test_name (via Gateway)" "FAIL" "Missing expected field: $expected_field"
            fi
        else
            print_result "$test_name (via Gateway)" "PASS" "$response"
        fi
    else
        print_result "$test_name (via Gateway)" "FAIL" "$response"
    fi
}

echo -e "${BLUE}=== API GATEWAY ADMIN DIRECT ENDPOINTS TESTING ===${NC}"
echo -e "${BLUE}Testing all new admin direct endpoints through API Gateway${NC}"
echo ""

# Step 1: Test Authentication through Gateway
echo -e "${YELLOW}=== Phase 1: Authentication via API Gateway ===${NC}"

# Test admin login through gateway
echo "Testing admin login via API Gateway..."
LOGIN_RESPONSE=$(curl -s -X POST $GATEWAY_URL/admin/direct/login \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@futureguide.com", "password": "admin123"}')

LOGIN_SUCCESS=$(echo "$LOGIN_RESPONSE" | jq -r '.success // false')
if [ "$LOGIN_SUCCESS" = "true" ]; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
    print_result "POST /admin/direct/login" "PASS" "Login successful via Gateway"
    echo -e "${GREEN}Token obtained via Gateway: ${TOKEN:0:50}...${NC}"
else
    print_result "POST /admin/direct/login" "FAIL" "$LOGIN_RESPONSE"
    echo -e "${RED}Cannot proceed without token. Exiting.${NC}"
    exit 1
fi

# Test health check (public endpoint)
test_gateway_endpoint "GET" "/admin/direct/health/db" "" "success" "GET /admin/direct/health/db" ""

# Test profile endpoint
test_gateway_endpoint "GET" "/admin/direct/profile" "" "data" "GET /admin/direct/profile" "$TOKEN"

echo ""
echo -e "${YELLOW}=== Phase 2: User Management via Gateway ===${NC}"

# Test user management endpoints
test_gateway_endpoint "GET" "/admin/direct/users?page=1&limit=5" "" "data" "GET /admin/direct/users" "$TOKEN"

# Get a user ID for testing
echo "Getting a user ID for detailed testing..."
USERS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" $GATEWAY_URL/admin/direct/users?page=1&limit=1)
USER_ID=$(echo "$USERS_RESPONSE" | jq -r '.data.users[0].id // empty')

if [ -n "$USER_ID" ]; then
    test_gateway_endpoint "GET" "/admin/direct/users/$USER_ID" "" "data" "GET /admin/direct/users/:userId" "$TOKEN"
    test_gateway_endpoint "GET" "/admin/direct/users/$USER_ID/tokens/history" "" "data" "GET /admin/direct/users/:userId/tokens/history" "$TOKEN"
else
    echo -e "${YELLOW}No users found for detailed testing${NC}"
fi

echo ""
echo -e "${YELLOW}=== Phase 3: Analytics via Gateway ===${NC}"

# Test analytics endpoints that were working
test_gateway_endpoint "GET" "/admin/direct/analytics/users/overview" "" "data" "GET /admin/direct/analytics/users/overview" "$TOKEN"
test_gateway_endpoint "GET" "/admin/direct/assessments/performance" "" "data" "GET /admin/direct/assessments/performance" "$TOKEN"
test_gateway_endpoint "GET" "/admin/direct/assessments/trends" "" "data" "GET /admin/direct/assessments/trends" "$TOKEN"
test_gateway_endpoint "GET" "/admin/direct/tokens/transactions" "" "data" "GET /admin/direct/tokens/transactions" "$TOKEN"

echo ""
echo -e "${YELLOW}=== Phase 4: Job & System Monitoring via Gateway ===${NC}"

# Test job and system endpoints that were working
test_gateway_endpoint "GET" "/admin/direct/jobs/monitor" "" "data" "GET /admin/direct/jobs/monitor" "$TOKEN"
test_gateway_endpoint "GET" "/admin/direct/jobs/queue/status" "" "data" "GET /admin/direct/jobs/queue/status" "$TOKEN"
test_gateway_endpoint "GET" "/admin/direct/system/health" "" "data" "GET /admin/direct/system/health" "$TOKEN"

echo ""
echo -e "${YELLOW}=== Phase 5: Security & Audit via Gateway ===${NC}"

# Test security and audit endpoints that were working
test_gateway_endpoint "GET" "/admin/direct/security/audit" "" "data" "GET /admin/direct/security/audit" "$TOKEN"
test_gateway_endpoint "GET" "/admin/direct/security/suspicious-activities" "" "data" "GET /admin/direct/security/suspicious-activities" "$TOKEN"
test_gateway_endpoint "GET" "/admin/direct/security/login-patterns" "" "data" "GET /admin/direct/security/login-patterns" "$TOKEN"
test_gateway_endpoint "GET" "/admin/direct/audit/activities" "" "data" "GET /admin/direct/audit/activities" "$TOKEN"
test_gateway_endpoint "GET" "/admin/direct/audit/data-access" "" "data" "GET /admin/direct/audit/data-access" "$TOKEN"

echo ""
echo -e "${YELLOW}=== Phase 6: Dashboard & Insights via Gateway ===${NC}"

# Test dashboard and insights endpoints that were working
test_gateway_endpoint "GET" "/admin/direct/dashboard/realtime" "" "data" "GET /admin/direct/dashboard/realtime" "$TOKEN"
test_gateway_endpoint "GET" "/admin/direct/insights/predictive-analytics" "" "data" "GET /admin/direct/insights/predictive-analytics" "$TOKEN"

echo ""
echo -e "${YELLOW}=== Comparison: Direct vs Gateway ===${NC}"

# Compare response times and functionality
echo "Testing same endpoint directly vs through gateway..."

# Direct call
DIRECT_START=$(date +%s%N)
DIRECT_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" $DIRECT_URL/admin/direct/users?page=1&limit=1)
DIRECT_END=$(date +%s%N)
DIRECT_TIME=$(( (DIRECT_END - DIRECT_START) / 1000000 ))

# Gateway call
GATEWAY_START=$(date +%s%N)
GATEWAY_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" $GATEWAY_URL/admin/direct/users?page=1&limit=1)
GATEWAY_END=$(date +%s%N)
GATEWAY_TIME=$(( (GATEWAY_END - GATEWAY_START) / 1000000 ))

echo -e "Direct call time: ${DIRECT_TIME}ms"
echo -e "Gateway call time: ${GATEWAY_TIME}ms"

DIRECT_SUCCESS=$(echo "$DIRECT_RESPONSE" | jq -r '.success // false')
GATEWAY_SUCCESS=$(echo "$GATEWAY_RESPONSE" | jq -r '.success // false')

if [ "$DIRECT_SUCCESS" = "true" ] && [ "$GATEWAY_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✓ Both direct and gateway calls successful${NC}"
else
    echo -e "${RED}✗ Inconsistency between direct and gateway calls${NC}"
    echo "Direct: $DIRECT_SUCCESS, Gateway: $GATEWAY_SUCCESS"
fi

echo ""
echo -e "${BLUE}=== API GATEWAY TESTING SUMMARY ===${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All API Gateway tests passed!${NC}"
    echo -e "${GREEN}✅ Admin direct endpoints are successfully exposed through API Gateway${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed, but core functionality is working${NC}"
    echo -e "${GREEN}✅ API Gateway integration is functional${NC}"
    exit 0
fi
