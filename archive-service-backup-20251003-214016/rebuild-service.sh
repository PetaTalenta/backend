#!/bin/bash

# Script untuk rebuild dan restart archive-service
# Usage: ./rebuild-service.sh

echo "🔄 Starting archive-service rebuild and restart process..."

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📁 Working directory: $SCRIPT_DIR"
echo "📁 Project root: $PROJECT_ROOT"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the archive-service directory."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker first."
    exit 1
fi

echo "🐳 Checking current Docker containers..."
docker ps --filter "name=archive" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Stop the current archive-service container if running
echo "🛑 Stopping current archive-service container..."
docker stop archive-service 2>/dev/null || echo "ℹ️  No running archive-service container found"

# Remove the container
echo "🗑️  Removing archive-service container..."
docker rm archive-service 2>/dev/null || echo "ℹ️  No archive-service container to remove"

# Remove the old image
echo "🗑️  Removing old archive-service image..."
docker rmi atma-backend-archive-service 2>/dev/null || echo "ℹ️  No old image to remove"

# Build new image
echo "🔨 Building new archive-service image..."
cd "$PROJECT_ROOT"
docker-compose build archive-service

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to build archive-service image"
    exit 1
fi

# Start the service
echo "🚀 Starting archive-service..."
docker-compose up -d archive-service

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to start archive-service"
    exit 1
fi

# Wait a moment for the service to start
echo "⏳ Waiting for service to start..."
sleep 5

# Check if the service is running
echo "🔍 Checking service status..."
docker ps --filter "name=archive-service" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check logs
echo "📋 Recent logs:"
docker logs archive-service --tail 20

# Test the service
echo "🧪 Testing service health..."
sleep 2
curl -s http://localhost:3002/health > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Archive-service is running and responding!"
else
    echo "⚠️  Service might still be starting up. Check logs with: docker logs archive-service"
fi

echo "🎉 Archive-service rebuild and restart completed!"
echo ""
echo "📝 Useful commands:"
echo "  View logs: docker logs archive-service -f"
echo "  Check status: docker ps | grep archive"
echo "  Test health: curl http://localhost:3002/health"
echo "  Stop service: docker stop archive-service"
