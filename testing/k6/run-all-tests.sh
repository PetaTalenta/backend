#!/bin/bash

###############################################################################
# ATMA K6 Testing Suite - Run All Tests
# This script runs all test levels sequentially and generates reports
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RESULTS_DIR="./results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="${RESULTS_DIR}/${TIMESTAMP}"

# Create results directory
mkdir -p "${REPORT_DIR}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}ATMA K6 Testing Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Timestamp: ${TIMESTAMP}"
echo -e "Results Directory: ${REPORT_DIR}"
echo ""

# Function to run a test
run_test() {
    local test_name=$1
    local test_script=$2
    local output_file="${REPORT_DIR}/${test_name}.json"
    
    echo -e "${YELLOW}Running ${test_name}...${NC}"
    
    if k6 run \
        --out json="${output_file}" \
        --summary-export="${REPORT_DIR}/${test_name}_summary.json" \
        "${test_script}"; then
        echo -e "${GREEN}✓ ${test_name} completed successfully${NC}"
        return 0
    else
        echo -e "${RED}✗ ${test_name} failed${NC}"
        return 1
    fi
}

# Run tests sequentially
echo -e "${BLUE}Starting test execution...${NC}"
echo ""

# 1. Smoke Test
echo -e "${BLUE}[1/7] Smoke Test${NC}"
run_test "smoke-test" "scripts/smoke-test.js"
echo ""
sleep 5

# 2. E2E Full Flow
echo -e "${BLUE}[2/7] E2E Full Flow Test${NC}"
run_test "e2e-full-flow" "scripts/e2e-full-flow.js"
echo ""
sleep 10

# 3. Load Test Level 1 (Baseline)
echo -e "${BLUE}[3/7] Load Test Level 1 - Baseline (1 user)${NC}"
run_test "load-test-level1" "scripts/load-test-level1.js"
echo ""
sleep 10

# 4. Load Test Level 2 (Light Load)
echo -e "${BLUE}[4/7] Load Test Level 2 - Light Load (5 users)${NC}"
run_test "load-test-level2" "scripts/load-test-level2.js"
echo ""
sleep 15

# 5. Load Test Level 3 (Medium Load)
echo -e "${BLUE}[5/7] Load Test Level 3 - Medium Load (25 users)${NC}"
run_test "load-test-level3" "scripts/load-test-level3.js"
echo ""
sleep 20

# 6. Load Test Level 4 (High Load)
echo -e "${BLUE}[6/7] Load Test Level 4 - High Load (100 users)${NC}"
echo -e "${YELLOW}Warning: This test will take approximately 1 hour${NC}"
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    run_test "load-test-level4" "scripts/load-test-level4.js"
    echo ""
    sleep 30
else
    echo -e "${YELLOW}Skipping Level 4${NC}"
fi

# 7. Load Test Level 5 (Peak Load)
echo -e "${BLUE}[7/7] Load Test Level 5 - Peak Load (200 users)${NC}"
echo -e "${YELLOW}Warning: This test will take approximately 2 hours${NC}"
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    run_test "load-test-level5" "scripts/load-test-level5.js"
    echo ""
else
    echo -e "${YELLOW}Skipping Level 5${NC}"
fi

# Generate summary report
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Execution Complete${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Results saved to: ${REPORT_DIR}"
echo ""
echo -e "${GREEN}Summary:${NC}"
ls -lh "${REPORT_DIR}"
echo ""

# Create a simple HTML report index
cat > "${REPORT_DIR}/index.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>ATMA K6 Test Results - ${TIMESTAMP}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .test-result { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { background-color: #d4edda; }
        .failed { background-color: #f8d7da; }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>ATMA K6 Test Results</h1>
    <p>Test Run: ${TIMESTAMP}</p>
    <h2>Test Results</h2>
    <div class="test-result">
        <h3>Smoke Test</h3>
        <a href="smoke-test_summary.json">View Summary</a> | 
        <a href="smoke-test.json">View Full Results</a>
    </div>
    <div class="test-result">
        <h3>E2E Full Flow</h3>
        <a href="e2e-full-flow_summary.json">View Summary</a> | 
        <a href="e2e-full-flow.json">View Full Results</a>
    </div>
    <div class="test-result">
        <h3>Load Test Level 1 (Baseline)</h3>
        <a href="load-test-level1_summary.json">View Summary</a> | 
        <a href="load-test-level1.json">View Full Results</a>
    </div>
    <div class="test-result">
        <h3>Load Test Level 2 (Light Load)</h3>
        <a href="load-test-level2_summary.json">View Summary</a> | 
        <a href="load-test-level2.json">View Full Results</a>
    </div>
    <div class="test-result">
        <h3>Load Test Level 3 (Medium Load)</h3>
        <a href="load-test-level3_summary.json">View Summary</a> | 
        <a href="load-test-level3.json">View Full Results</a>
    </div>
    <div class="test-result">
        <h3>Load Test Level 4 (High Load)</h3>
        <a href="load-test-level4_summary.json">View Summary</a> | 
        <a href="load-test-level4.json">View Full Results</a>
    </div>
    <div class="test-result">
        <h3>Load Test Level 5 (Peak Load)</h3>
        <a href="load-test-level5_summary.json">View Summary</a> | 
        <a href="load-test-level5.json">View Full Results</a>
    </div>
</body>
</html>
EOF

echo -e "${GREEN}HTML report generated: ${REPORT_DIR}/index.html${NC}"
echo ""
echo -e "${BLUE}Done!${NC}"

