#!/bin/bash

# Setup Cloudflare Tunnel for ATMA Backend
# Run this script after getting tunnel token from Cloudflare dashboard

if [ -z "$1" ]; then
    echo "Usage: ./setup-tunnel.sh <TUNNEL_TOKEN>"
    echo "Get your tunnel token from Cloudflare Zero Trust Dashboard"
    exit 1
fi

TUNNEL_TOKEN=$1

echo "Setting up Cloudflare Tunnel for ATMA Backend..."

# Update .env file with tunnel token
cat > .env << EOF
# Cloudflare Tunnel Token
CLOUDFLARE_TUNNEL_TOKEN=$TUNNEL_TOKEN
EOF

echo "✓ Updated .env file with tunnel token"

# Check if Docker is running
if ! docker version > /dev/null 2>&1; then
    echo "✗ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✓ Docker is running"

# Stop existing containers if running
echo "Stopping existing containers..."
docker-compose down

# Build and start services
echo "Building and starting services..."
docker-compose up -d

# Wait for services to start
echo "Waiting for services to start..."
sleep 30

# Check tunnel status
echo "Checking tunnel status..."
docker-compose logs cloudflared

echo ""
echo "Setup completed!"
echo ""
echo "Your services should now be available at:"
echo "  API Gateway: https://api.chhrone.web.id"
echo "  Documentation: https://docs.chhrone.web.id"
echo ""
echo "If the domains are not accessible yet, wait 5-10 minutes for DNS propagation."
echo ""
echo "To check logs:"
echo "  docker-compose logs cloudflared"
echo "  docker-compose logs api-gateway"
echo "  docker-compose logs documentation-service"
