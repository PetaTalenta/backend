#!/bin/bash

# ATMA Backend Deployment Script
# This script deploys the entire ATMA backend with proper service dependencies

echo "🚀 Starting ATMA Backend Deployment..."

# Function to check if a service is healthy
check_service_health() {
    local service_name=$1
    local max_attempts=30
    local attempt=1
    
    echo "🔍 Checking health of $service_name..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps $service_name | grep -q "healthy\|Up"; then
            echo "✅ $service_name is healthy"
            return 0
        fi
        
        echo "⏳ Waiting for $service_name... (attempt $attempt/$max_attempts)"
        sleep 10
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service_name failed to become healthy"
    return 1
}

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build all images
echo "🔨 Building Docker images..."
docker-compose build

# Start infrastructure services first
echo "📦 Starting infrastructure services..."
docker-compose up -d postgres rabbitmq redis

# Wait for infrastructure to be ready
check_service_health "postgres" || exit 1
check_service_health "rabbitmq" || exit 1
check_service_health "redis" || exit 1

# Start core services
echo "🏗️ Starting core services..."
docker-compose up -d auth-service archive-service

# Wait for core services
sleep 15

# Start application services
echo "🎯 Starting application services..."
docker-compose up -d assessment-service notification-service

# Wait for application services
sleep 10

# Start API Gateway
echo "🌐 Starting API Gateway..."
docker-compose up -d api-gateway

# Start Analysis Workers (default 3 instances)
echo "⚡ Starting Analysis Workers..."
docker-compose up -d analysis-worker-1 analysis-worker-2 analysis-worker-3

# Start Documentation Service
echo "📚 Starting Documentation Service..."
docker-compose up -d documentation-service

# Final health check
echo ""
echo "🔍 Final health check..."
sleep 10

echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "🎉 ATMA Backend Deployment Complete!"
echo ""
echo "🌐 Available Services:"
echo "   API Gateway:      http://localhost:3000"
echo "   Auth Service:     http://localhost:3001"
echo "   Archive Service:  http://localhost:3002"
echo "   Assessment Service: http://localhost:3003"
echo "   Notification Service: http://localhost:3005"
echo "   Documentation:    http://localhost:8080"
echo "   RabbitMQ Management: http://localhost:15672 (admin/admin123)"
echo "   PostgreSQL:       localhost:5432 (atma_user/secret-passworrd)"
echo "   Redis:            localhost:6379 (password: redis123)"

echo ""
echo "📝 Useful Commands:"
echo "   View logs:        docker-compose logs -f [service-name]"
echo "   Scale workers:    ./docker-scripts/scale-workers.sh [number]"
echo "   Stop all:         docker-compose down"
echo "   Restart service:  docker-compose restart [service-name]"
