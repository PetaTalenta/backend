#!/bin/bash

# ATMA API Gateway Docker Test Script
# This script tests the Docker deployment of the API Gateway

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="atma-api-gateway"
IMAGE_NAME="atma-api-gateway:latest"
TEST_PORT="3000"
HEALTH_ENDPOINT="http://localhost:${TEST_PORT}/health"
DETAILED_HEALTH_ENDPOINT="http://localhost:${TEST_PORT}/health/detailed"

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

# Function to cleanup
cleanup() {
    print_status "Cleaning up test environment..."
    docker stop $CONTAINER_NAME >/dev/null 2>&1 || true
    docker rm $CONTAINER_NAME >/dev/null 2>&1 || true
}

# Function to wait for service
wait_for_service() {
    local url=$1
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for service to be ready at $url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s $url >/dev/null 2>&1; then
            print_success "Service is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "Service failed to become ready after $max_attempts attempts"
    return 1
}

# Function to test endpoint
test_endpoint() {
    local url=$1
    local description=$2
    
    print_status "Testing $description: $url"
    
    local response=$(curl -s -w "HTTP_CODE:%{http_code}" $url)
    local http_code=$(echo $response | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
    local body=$(echo $response | sed 's/HTTP_CODE:[0-9]*$//')
    
    if [ "$http_code" = "200" ]; then
        print_success "$description test passed (HTTP $http_code)"
        echo "Response: $body" | head -c 200
        echo "..."
        return 0
    else
        print_error "$description test failed (HTTP $http_code)"
        echo "Response: $body"
        return 1
    fi
}

# Main test function
run_tests() {
    local test_failed=0
    
    print_status "Starting API Gateway Docker tests..."
    
    # Test 1: Check if Docker image exists
    print_status "Test 1: Checking if Docker image exists..."
    if docker images | grep -q "$IMAGE_NAME"; then
        print_success "Docker image found: $IMAGE_NAME"
    else
        print_error "Docker image not found: $IMAGE_NAME"
        print_status "Please build the image first using: ./build-docker.sh --build-only"
        return 1
    fi
    
    # Test 2: Start container
    print_status "Test 2: Starting container..."
    cleanup  # Clean up any existing container
    
    if docker run -d \
        --name $CONTAINER_NAME \
        -p $TEST_PORT:3000 \
        -e NODE_ENV=test \
        -e LOG_LEVEL=info \
        $IMAGE_NAME; then
        print_success "Container started successfully"
    else
        print_error "Failed to start container"
        return 1
    fi
    
    # Test 3: Wait for service to be ready
    print_status "Test 3: Waiting for service to be ready..."
    if ! wait_for_service $HEALTH_ENDPOINT; then
        print_error "Service failed to start"
        print_status "Container logs:"
        docker logs $CONTAINER_NAME
        test_failed=1
    fi
    
    # Test 4: Basic health check
    print_status "Test 4: Testing basic health endpoint..."
    if test_endpoint $HEALTH_ENDPOINT "Basic Health Check"; then
        print_success "Basic health check passed"
    else
        test_failed=1
    fi
    
    # Test 5: Detailed health check
    print_status "Test 5: Testing detailed health endpoint..."
    if test_endpoint $DETAILED_HEALTH_ENDPOINT "Detailed Health Check"; then
        print_success "Detailed health check passed"
    else
        print_warning "Detailed health check failed (expected if backend services are not running)"
    fi
    
    # Test 6: Root endpoint
    print_status "Test 6: Testing root endpoint..."
    if test_endpoint "http://localhost:${TEST_PORT}/" "Root Endpoint"; then
        print_success "Root endpoint test passed"
    else
        test_failed=1
    fi
    
    # Test 7: 404 handling
    print_status "Test 7: Testing 404 handling..."
    local response=$(curl -s -w "HTTP_CODE:%{http_code}" "http://localhost:${TEST_PORT}/nonexistent")
    local http_code=$(echo $response | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
    
    if [ "$http_code" = "404" ]; then
        print_success "404 handling test passed"
    else
        print_error "404 handling test failed (expected 404, got $http_code)"
        test_failed=1
    fi
    
    # Test 8: Container health check
    print_status "Test 8: Testing Docker health check..."
    sleep 35  # Wait for health check to run
    
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null || echo "none")
    if [ "$health_status" = "healthy" ]; then
        print_success "Docker health check passed"
    elif [ "$health_status" = "none" ]; then
        print_warning "Docker health check not configured"
    else
        print_error "Docker health check failed (status: $health_status)"
        test_failed=1
    fi
    
    # Test 9: Resource usage
    print_status "Test 9: Checking resource usage..."
    local stats=$(docker stats --no-stream --format "table {{.MemUsage}}\t{{.CPUPerc}}" $CONTAINER_NAME)
    print_status "Resource usage: $stats"
    
    # Test 10: Log output
    print_status "Test 10: Checking log output..."
    local log_lines=$(docker logs $CONTAINER_NAME 2>&1 | wc -l)
    if [ $log_lines -gt 0 ]; then
        print_success "Container is generating logs ($log_lines lines)"
        print_status "Recent logs:"
        docker logs $CONTAINER_NAME --tail 5
    else
        print_warning "No log output detected"
    fi
    
    # Cleanup
    cleanup
    
    # Summary
    if [ $test_failed -eq 0 ]; then
        print_success "All tests passed! API Gateway Docker deployment is working correctly."
        return 0
    else
        print_error "Some tests failed. Please check the output above."
        return 1
    fi
}

# Check prerequisites
print_status "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    print_error "curl is not installed or not in PATH"
    exit 1
fi

if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running"
    exit 1
fi

# Run tests
if run_tests; then
    print_success "Docker test completed successfully!"
    exit 0
else
    print_error "Docker test failed!"
    exit 1
fi
