#!/bin/bash
# Quick test script untuk verify RabbitMQ connection fix

echo "=== Testing RabbitMQ Connection Fix ==="
echo ""

echo "1. Rebuilding affected services..."
docker-compose build notification-service analysis-worker

echo ""
echo "2. Starting services..."
docker-compose up -d

echo ""
echo "3. Waiting for services to start..."
sleep 15

echo ""
echo "4. Checking RabbitMQ status..."
docker-compose ps rabbitmq

echo ""
echo "5. Checking notification-service logs..."
docker-compose logs --tail=20 notification-service | grep -i rabbitmq

echo ""
echo "6. Checking analysis-worker logs..."
docker-compose logs --tail=20 analysis-worker | grep -i rabbitmq

echo ""
echo "7. Service status:"
docker-compose ps notification-service analysis-worker

echo ""
echo "=== Test Complete ==="
echo "Check the logs above for 'RabbitMQ is ready' messages"
echo "No ECONNREFUSED errors should appear"
