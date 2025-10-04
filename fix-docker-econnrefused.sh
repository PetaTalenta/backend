#!/bin/bash

# Script to fix ECONNREFUSED errors in Docker services
# Specifically targets analysis-worker and notification-service

echo "========================================="
echo "Docker ECONNREFUSED Error Fixer"
echo "========================================="
echo ""

BACKEND_ROOT="/home/rayin/Desktop/atma-backend"
cd "$BACKEND_ROOT"

# Function to find container name
find_container() {
    local service=$1
    local possible_names=(
        "atma-backend-${service}-1"
        "atma-backend_${service}_1"
        "${service}_1"
        "${service}"
        "atma-backend-${service}"
    )
    
    for name in "${possible_names[@]}"; do
        if docker ps -a --format '{{.Names}}' | grep -q "^${name}$"; then
            echo "$name"
            return 0
        fi
    done
    
    return 1
}

# Function to check and restart service if needed
check_and_restart() {
    local service=$1
    local container_name=$(find_container "$service")
    
    if [ -z "$container_name" ]; then
        echo "❌ Container for $service not found"
        echo "   Possible container names checked:"
        echo "   - atma-backend-${service}-1"
        echo "   - atma-backend_${service}_1"
        echo "   - ${service}_1"
        echo "   - ${service}"
        echo ""
        return 1
    fi
    
    echo "📦 Checking $service (container: $container_name)..."
    
    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        echo "⚠️  Container is not running, starting it..."
        docker start "$container_name"
        sleep 5
    fi
    
    # Check logs for ECONNREFUSED
    local logs=$(docker logs "$container_name" 2>&1 | tail -50)
    
    if echo "$logs" | grep -q "ECONNREFUSED"; then
        echo "⚠️  Found ECONNREFUSED error in logs"
        echo ""
        echo "Last 10 lines of logs:"
        echo "─────────────────────────────────────"
        docker logs "$container_name" 2>&1 | tail -10
        echo "─────────────────────────────────────"
        echo ""
        echo "🔄 Restarting $service..."
        docker restart "$container_name"
        
        echo "⏳ Waiting 10 seconds for service to stabilize..."
        sleep 10
        
        # Check again
        local new_logs=$(docker logs "$container_name" 2>&1 | tail -20)
        if echo "$new_logs" | grep -q "ECONNREFUSED"; then
            echo "❌ Service still has ECONNREFUSED errors"
            echo ""
            echo "Recent logs:"
            echo "─────────────────────────────────────"
            echo "$new_logs"
            echo "─────────────────────────────────────"
            echo ""
            echo "💡 Troubleshooting steps:"
            echo "   1. Check if dependent services (Redis, RabbitMQ, MongoDB) are running"
            echo "   2. Verify network connectivity between containers"
            echo "   3. Check docker-compose.yml for correct service dependencies"
            echo "   4. Try: docker-compose down && docker-compose up -d"
            return 1
        else
            echo "✅ Service restarted successfully - no more errors detected"
            echo ""
            echo "Recent logs:"
            echo "─────────────────────────────────────"
            docker logs "$container_name" 2>&1 | tail -5
            echo "─────────────────────────────────────"
        fi
    else
        echo "✅ No ECONNREFUSED errors found - service is healthy"
    fi
    
    echo ""
    return 0
}

# Main execution
echo "Checking Docker services for ECONNREFUSED errors..."
echo ""

# Check critical services
check_and_restart "analysis-worker"
check_and_restart "notification-service"

# Optional: Check other services
read -p "Do you want to check other services? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Checking additional services..."
    check_and_restart "api-gateway"
    check_and_restart "admin-service"
    check_and_restart "chatbot-service"
    check_and_restart "documentation-service"
fi

echo ""
echo "========================================="
echo "Current Docker Status"
echo "========================================="
docker-compose ps

echo ""
echo "========================================="
echo "All running containers:"
echo "========================================="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "========================================="
echo "✅ Check complete!"
echo "========================================="
echo ""
echo "If services still have issues, try:"
echo "  1. docker-compose logs <service-name>"
echo "  2. docker-compose restart <service-name>"
echo "  3. docker-compose down && docker-compose up -d"
echo ""
