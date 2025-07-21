#!/bin/bash

echo ""
echo "========================================"
echo "    ATMA Backend Testing Suite"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "ERROR: package.json not found"
    echo "Please run this script from the testing directory"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install dependencies"
        exit 1
    fi
fi

# Parse command line arguments
TEST_TYPE=${1:-all}

echo "Running $TEST_TYPE tests..."
echo ""

# Run the tests
node run-tests.js $TEST_TYPE

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "    Tests completed successfully!"
    echo "========================================"
else
    echo ""
    echo "========================================"
    echo "    Tests failed!"
    echo "========================================"
    exit 1
fi

echo ""
