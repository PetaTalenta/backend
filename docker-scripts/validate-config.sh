#!/bin/bash

# Configuration Validation Script
# Validates that docker-compose.yml is consistent with .env.docker files

echo "🔍 ATMA Backend Configuration Validation"
echo "========================================"

VALIDATION_PASSED=true

# Function to check if a value exists in docker-compose.yml
check_docker_compose_value() {
    local service=$1
    local key=$2
    local expected_value=$3
    
    # Extract value from docker-compose.yml
    local actual_value=$(grep -A 50 "^  $service:" docker-compose.yml | grep "      $key:" | head -1 | sed "s/.*$key: *//")
    
    if [ "$actual_value" = "$expected_value" ]; then
        echo "  ✅ $service.$key: $actual_value"
    else
        echo "  ❌ $service.$key: Expected '$expected_value', got '$actual_value'"
        VALIDATION_PASSED=false
    fi
}

# Function to validate service configuration
validate_service() {
    local service=$1
    local env_file="$service/.env.docker"
    
    echo ""
    echo "🔧 Validating $service..."
    
    if [ ! -f "$env_file" ]; then
        echo "  ❌ Missing .env.docker file"
        VALIDATION_PASSED=false
        return
    fi
    
    # Read key configurations from .env.docker
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ $key =~ ^#.*$ ]] && continue
        [[ -z $key ]] && continue
        
        # Remove quotes from value
        value=$(echo "$value" | sed 's/^"//;s/"$//')
        
        # Check important configurations
        case $key in
            PORT|NODE_ENV|JWT_SECRET|DB_HOST|DB_USER|DB_PASSWORD|RABBITMQ_URL|REDIS_HOST)
                check_docker_compose_value "$service" "$key" "$value"
                ;;
        esac
    done < "$env_file"
}

# Validate each service
validate_service "api-gateway"
validate_service "auth-service" 
validate_service "assessment-service"
validate_service "archive-service"
validate_service "notification-service"

# Special validation for analysis workers
echo ""
echo "🔧 Validating analysis workers..."
for i in 1 2 3; do
    echo "  Checking analysis-worker-$i..."
    check_docker_compose_value "analysis-worker-$i" "WORKER_ID" "worker-$i"
    check_docker_compose_value "analysis-worker-$i" "RABBITMQ_URL" "amqp://admin:admin123@rabbitmq:5672"
done

# Check port mappings
echo ""
echo "🔧 Validating port mappings..."
declare -A expected_ports=(
    ["api-gateway"]="3000"
    ["auth-service"]="3001"
    ["archive-service"]="3002"
    ["assessment-service"]="3003"
    ["notification-service"]="3005"
    ["postgres"]="5432"
    ["rabbitmq"]="5672"
    ["redis"]="6379"
    ["documentation-service"]="8080"
)

for service in "${!expected_ports[@]}"; do
    port="${expected_ports[$service]}"
    if grep -q "\"$port:$port\"" docker-compose.yml; then
        echo "  ✅ $service port mapping: $port:$port"
    else
        echo "  ❌ $service port mapping missing or incorrect"
        VALIDATION_PASSED=false
    fi
done

# Check network configuration
echo ""
echo "🔧 Validating network configuration..."
if grep -q "atma-network" docker-compose.yml; then
    echo "  ✅ atma-network defined"
else
    echo "  ❌ atma-network missing"
    VALIDATION_PASSED=false
fi

# Check volume configuration
echo ""
echo "🔧 Validating volume configuration..."
declare -a expected_volumes=("postgres_data" "rabbitmq_data" "redis_data")
for volume in "${expected_volumes[@]}"; do
    if grep -q "$volume:" docker-compose.yml; then
        echo "  ✅ Volume $volume defined"
    else
        echo "  ❌ Volume $volume missing"
        VALIDATION_PASSED=false
    fi
done

# Check health checks
echo ""
echo "🔧 Validating health checks..."
declare -a services_with_health=("postgres" "rabbitmq" "redis")
for service in "${services_with_health[@]}"; do
    if grep -A 10 "^  $service:" docker-compose.yml | grep -q "healthcheck:"; then
        echo "  ✅ $service has health check"
    else
        echo "  ❌ $service missing health check"
        VALIDATION_PASSED=false
    fi
done

# Final result
echo ""
echo "========================================"
if [ "$VALIDATION_PASSED" = true ]; then
    echo "🎉 All validations passed! Configuration is consistent."
    echo ""
    echo "✅ Ready for deployment:"
    echo "   ./docker-scripts/deploy.sh"
    exit 0
else
    echo "❌ Validation failed! Please fix the issues above."
    echo ""
    echo "🔧 Common fixes:"
    echo "   - Update docker-compose.yml to match .env.docker files"
    echo "   - Ensure all required environment variables are set"
    echo "   - Check port mappings and service names"
    exit 1
fi
