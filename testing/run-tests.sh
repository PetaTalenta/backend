#!/bin/bash

# ATMA E2E Testing Suite Runner
# This script provides a convenient way to run the complete E2E testing suite

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${CYAN}$1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Node.js version
check_node_version() {
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js v16 or higher."
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_VERSION="16.0.0"

    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        print_error "Node.js version $NODE_VERSION is too old. Please upgrade to v16.0.0 or higher."
        exit 1
    fi

    print_success "Node.js version: $NODE_VERSION"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Are you in the testing directory?"
        exit 1
    fi

    npm install
    
    if [ $? -eq 0 ]; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
}

# Function to check services
check_services() {
    print_status "Checking ATMA services..."
    
    if [ -f "scripts/check-services.js" ]; then
        node scripts/check-services.js
        SERVICE_CHECK_EXIT_CODE=$?
        
        if [ $SERVICE_CHECK_EXIT_CODE -eq 0 ]; then
            print_success "All required services are healthy"
            return 0
        else
            print_error "Some required services are not healthy"
            return 1
        fi
    else
        print_warning "Service check script not found, skipping service check"
        return 0
    fi
}

# Function to run specific test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    print_header "Running $test_name..."
    echo "Command: $test_command"
    echo ""
    
    eval "$test_command"
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        print_success "$test_name completed successfully"
    else
        print_error "$test_name failed with exit code $exit_code"
    fi
    
    echo ""
    return $exit_code
}

# Function to show usage
show_usage() {
    echo "ATMA E2E Testing Suite Runner"
    echo ""
    echo "Usage: $0 [OPTIONS] [TEST_TYPE]"
    echo ""
    echo "TEST_TYPE:"
    echo "  all         Run all tests (default)"
    echo "  single      Run single user test"
    echo "  dual        Run dual user test"
    echo "  websocket   Run WebSocket test"
    echo "  chatbot     Run chatbot test"
    echo "  stress      Run stress test"
    echo ""
    echo "OPTIONS:"
    echo "  -h, --help          Show this help message"
    echo "  -i, --install       Install dependencies first"
    echo "  -c, --check         Check services before running tests"
    echo "  -s, --skip-check    Skip service health check"
    echo "  -v, --verbose       Enable verbose output"
    echo "  --no-cleanup        Disable test data cleanup"
    echo "  --stress-users N    Set number of stress test users"
    echo "  --parallel-users N  Set number of parallel users"
    echo ""
    echo "Examples:"
    echo "  $0                          # Run all tests"
    echo "  $0 single                   # Run single user test"
    echo "  $0 -i -c all               # Install deps, check services, run all tests"
    echo "  $0 stress --stress-users 10 # Run stress test with 10 users"
    echo "  $0 --no-cleanup single      # Run single test without cleanup"
}

# Parse command line arguments
INSTALL_DEPS=false
CHECK_SERVICES=true
SKIP_CHECK=false
VERBOSE=false
NO_CLEANUP=false
TEST_TYPE="all"
STRESS_USERS=""
PARALLEL_USERS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -i|--install)
            INSTALL_DEPS=true
            shift
            ;;
        -c|--check)
            CHECK_SERVICES=true
            shift
            ;;
        -s|--skip-check)
            SKIP_CHECK=true
            CHECK_SERVICES=false
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            export ENABLE_DETAILED_LOGS=true
            shift
            ;;
        --no-cleanup)
            NO_CLEANUP=true
            export ENABLE_CLEANUP=false
            shift
            ;;
        --stress-users)
            STRESS_USERS="$2"
            shift 2
            ;;
        --parallel-users)
            PARALLEL_USERS="$2"
            shift 2
            ;;
        all|single|dual|websocket|chatbot|stress)
            TEST_TYPE="$1"
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    print_header "🚀 ATMA E2E Testing Suite Runner"
    print_header "=================================="
    echo ""

    # Check Node.js
    check_node_version

    # Install dependencies if requested
    if [ "$INSTALL_DEPS" = true ]; then
        install_dependencies
        echo ""
    fi

    # Set environment variables
    if [ -n "$STRESS_USERS" ]; then
        export STRESS_TEST_USERS="$STRESS_USERS"
        print_status "Set stress test users to: $STRESS_USERS"
    fi

    if [ -n "$PARALLEL_USERS" ]; then
        export PARALLEL_USERS="$PARALLEL_USERS"
        print_status "Set parallel users to: $PARALLEL_USERS"
    fi

    if [ "$NO_CLEANUP" = true ]; then
        export ENABLE_CLEANUP=false
        print_warning "Test data cleanup disabled"
    fi

    if [ "$VERBOSE" = true ]; then
        print_status "Verbose logging enabled"
    fi

    echo ""

    # Check services if not skipped
    if [ "$CHECK_SERVICES" = true ] && [ "$SKIP_CHECK" = false ]; then
        if ! check_services; then
            print_error "Service check failed. Use --skip-check to bypass this check."
            exit 1
        fi
        echo ""
    fi

    # Run tests based on type
    case $TEST_TYPE in
        all)
            print_header "Running All Tests"
            run_test "Single User Test" "npm run test:single" || true
            run_test "Dual User Test" "npm run test:dual" || true
            run_test "WebSocket Test" "npm run test:websocket" || true
            run_test "Chatbot Test" "npm run test:chatbot" || true
            print_status "Stress test skipped (use 'stress' test type to run)"
            ;;
        single)
            run_test "Single User Test" "npm run test:single"
            ;;
        dual)
            run_test "Dual User Test" "npm run test:dual"
            ;;
        websocket)
            run_test "WebSocket Test" "npm run test:websocket"
            ;;
        chatbot)
            run_test "Chatbot Test" "npm run test:chatbot"
            ;;
        stress)
            run_test "Stress Test" "npm run test:stress"
            ;;
        *)
            print_error "Unknown test type: $TEST_TYPE"
            show_usage
            exit 1
            ;;
    esac

    print_header "🎉 Test execution completed!"
    print_status "Check the reports/ directory for detailed test results."
}

# Run main function
main "$@"
