#!/bin/bash

echo "=========================================="
echo "ATMA Backend - Docker Compose Startup"
echo "=========================================="
echo

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "❌ docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.docker template..."
    cp .env.docker .env
    echo "⚠️  Please edit .env file and update the GOOGLE_AI_API_KEY and other secrets!"
    echo
fi

# Build and start services
echo "🔨 Building and starting ATMA services..."
docker-compose up --build -d

echo
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
echo

# Check PostgreSQL
if docker-compose exec -T postgres pg_isready -U atma_user -d atma_db > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
else
    echo "❌ PostgreSQL is not ready"
fi

# Check RabbitMQ
if docker-compose exec -T rabbitmq rabbitmq-diagnostics ping > /dev/null 2>&1; then
    echo "✅ RabbitMQ is ready"
else
    echo "❌ RabbitMQ is not ready"
fi

echo
echo "🚀 ATMA Backend services are starting up!"
echo
echo "Services:"
echo "- API Gateway: http://localhost:3000"
echo "- Auth Service: http://localhost:3001"
echo "- Archive Service: http://localhost:3002"
echo "- Assessment Service: http://localhost:3003"
echo "- Notification Service: http://localhost:3005"
echo "- RabbitMQ Management: http://localhost:15672 (user: atma_user, pass: atma_password)"
echo
echo "To view logs: docker-compose logs -f [service-name]"
echo "To stop services: docker-compose down"
echo "To stop and remove volumes: docker-compose down -v"
echo
