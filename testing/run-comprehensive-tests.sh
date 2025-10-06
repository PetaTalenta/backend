#!/bin/bash

# Comprehensive Testing Runner for Unified Auth Migration
# This script runs all test suites and generates a consolidated report

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORTS_DIR="$SCRIPT_DIR/reports"
LOGS_DIR="$SCRIPT_DIR/logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create directories
mkdir -p "$REPORTS_DIR"
mkdir -p "$LOGS_DIR"

# Log file
LOG_FILE="$LOGS_DIR/comprehensive-test-$TIMESTAMP.log"

# Function to print colored output
print_header() {
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to check if services are running
check_services() {
    print_header "Checking Services Status"
    
    local services=(
        "http://localhost:3000:API Gateway"
        "http://localhost:3001:Auth Service"
        "http://localhost:3008:Auth-V2 Service"
        "http://localhost:3002:Archive Service"
        "http://localhost:3003:Assessment Service"
        "http://localhost:3006:Chatbot Service"
        "http://localhost:3005:Notification Service"
    )
    
    local all_up=true
    
    for service in "${services[@]}"; do
        IFS=':' read -r url name <<< "$service"
        if curl -s -f -o /dev/null "$url/health" 2>/dev/null || curl -s -f -o /dev/null "$url" 2>/dev/null; then
            print_success "$name is running"
        else
            print_error "$name is NOT running"
            all_up=false
        fi
    done
    
    if [ "$all_up" = false ]; then
        print_error "Not all services are running. Please start all services first."
        exit 1
    fi
    
    print_success "All services are running"
    echo ""
}

# Function to run a test suite
run_test_suite() {
    local test_name=$1
    local test_script=$2
    local log_file="$LOGS_DIR/${test_name}-$TIMESTAMP.log"
    
    print_header "Running: $test_name"
    print_info "Log file: $log_file"
    
    if node "$test_script" 2>&1 | tee "$log_file"; then
        print_success "$test_name completed successfully"
        return 0
    else
        print_error "$test_name failed"
        return 1
    fi
}

# Main execution
main() {
    print_header "Comprehensive Unified Auth Testing Suite"
    echo -e "${CYAN}Start Time: $(date)${NC}\n"
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    # Check if npm packages are installed
    if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
        print_warning "Node modules not found. Installing dependencies..."
        cd "$SCRIPT_DIR"
        npm install
    fi
    
    # Check services
    check_services
    
    # Track results
    local total_suites=0
    local passed_suites=0
    local failed_suites=0
    
    # Test Suite 1: End-to-End with Auth-V2
    print_info "═══════════════════════════════════════════════════════════════════════════════"
    if run_test_suite "Auth-V2 End-to-End" "$SCRIPT_DIR/test-auth-v2-e2e.js"; then
        ((passed_suites++))
    else
        ((failed_suites++))
    fi
    ((total_suites++))
    echo ""
    sleep 2
    
    # Test Suite 2: Fallback Mechanism
    print_info "═══════════════════════════════════════════════════════════════════════════════"
    if run_test_suite "Fallback Mechanism" "$SCRIPT_DIR/test-fallback-mechanism.js"; then
        ((passed_suites++))
    else
        ((failed_suites++))
    fi
    ((total_suites++))
    echo ""
    sleep 2
    
    # Test Suite 3: Comprehensive Testing
    print_info "═══════════════════════════════════════════════════════════════════════════════"
    if run_test_suite "Comprehensive Testing" "$SCRIPT_DIR/comprehensive-unified-auth-test.js"; then
        ((passed_suites++))
    else
        ((failed_suites++))
    fi
    ((total_suites++))
    echo ""
    
    # Generate consolidated report
    print_header "Test Execution Summary"
    
    echo -e "${CYAN}End Time: $(date)${NC}"
    echo ""
    echo -e "${CYAN}Test Suites Summary:${NC}"
    echo -e "  Total Suites: $total_suites"
    echo -e "  ${GREEN}Passed: $passed_suites${NC}"
    echo -e "  ${RED}Failed: $failed_suites${NC}"
    
    local success_rate=$(awk "BEGIN {printf \"%.2f\", ($passed_suites/$total_suites)*100}")
    echo -e "  Success Rate: ${success_rate}%"
    echo ""
    
    # List generated reports
    print_info "Generated Reports:"
    ls -lh "$REPORTS_DIR" | grep "$(date +%Y-%m-%d)" | awk '{print "  - " $9 " (" $5 ")"}'
    echo ""
    
    # Final status
    if [ $failed_suites -eq 0 ]; then
        print_success "🎉 All test suites passed!"
        echo ""
        echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║                                                                               ║${NC}"
        echo -e "${GREEN}║                   ✓ UNIFIED AUTH MIGRATION VALIDATED                          ║${NC}"
        echo -e "${GREEN}║                                                                               ║${NC}"
        echo -e "${GREEN}║  All services successfully accept both Firebase and JWT tokens               ║${NC}"
        echo -e "${GREEN}║  Fallback mechanisms are working correctly                                   ║${NC}"
        echo -e "${GREEN}║  Performance metrics are within acceptable ranges                            ║${NC}"
        echo -e "${GREEN}║                                                                               ║${NC}"
        echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        exit 0
    else
        print_error "⚠️  $failed_suites test suite(s) failed"
        echo ""
        echo -e "${YELLOW}Please review the logs in: $LOGS_DIR${NC}"
        echo -e "${YELLOW}Please review the reports in: $REPORTS_DIR${NC}"
        echo ""
        exit 1
    fi
}

# Handle script interruption
trap 'echo -e "\n${RED}Test execution interrupted${NC}"; exit 130' INT TERM

# Run main function
main "$@"

