#!/bin/bash

# ATMA E2E Testing Suite Installation Script

echo "🚀 Installing ATMA E2E Testing Suite..."
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="16.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to v16.0.0 or higher."
    exit 1
fi

echo "✅ Node.js version: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm is available"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create reports directory
echo "📁 Creating reports directory..."
mkdir -p reports
echo "✅ Reports directory created"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Using default configuration."
    echo "   You may want to customize the .env file for your environment."
else
    echo "✅ .env file found"
fi

# Verify installation
echo "🔍 Verifying installation..."

# Check if all required files exist
REQUIRED_FILES=(
    "package.json"
    "single-user-test.js"
    "dual-user-test.js"
    "websocket-test.js"
    "chatbot-test.js"
    "stress-test.js"
    "test-runner.js"
    "cleanup.js"
    "lib/api-client.js"
    "lib/websocket-client.js"
    "lib/test-data.js"
    "lib/test-logger.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (missing)"
        exit 1
    fi
done

echo ""
echo "🎉 Installation completed successfully!"
echo ""
echo "📋 Available commands:"
echo "  npm test              - Run all tests"
echo "  npm run test:single   - Run single user test"
echo "  npm run test:dual     - Run dual user test"
echo "  npm run test:websocket - Run WebSocket test"
echo "  npm run test:chatbot  - Run chatbot test"
echo "  npm run test:stress   - Run stress test"
echo "  npm run clean         - Clean test data"
echo ""
echo "📖 For more information, see README.md"
echo ""
echo "⚠️  Make sure ATMA backend services are running before executing tests!"
