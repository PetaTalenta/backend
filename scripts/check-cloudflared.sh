#!/bin/bash

# Cloudflared Health Check Script
echo "🔍 Checking Cloudflared Status..."
echo "=================================="

# Check if container is running
CONTAINER_STATUS=$(docker ps --filter "name=atma-cloudflared" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}")

if [ -z "$CONTAINER_STATUS" ]; then
    echo "❌ Cloudflared container is not running"
    
    # Check if container exists but stopped
    STOPPED_CONTAINER=$(docker ps -a --filter "name=atma-cloudflared" --format "table {{.Names}}\t{{.Status}}")
    if [ ! -z "$STOPPED_CONTAINER" ]; then
        echo "📋 Container exists but is stopped:"
        echo "$STOPPED_CONTAINER"
        
        echo ""
        echo "📝 Recent logs:"
        docker logs --tail 20 atma-cloudflared
    else
        echo "❌ Cloudflared container does not exist"
    fi
else
    echo "✅ Cloudflared container status:"
    echo "$CONTAINER_STATUS"
    
    echo ""
    echo "📝 Recent logs:"
    docker logs --tail 10 atma-cloudflared
fi

echo ""
echo "🔧 Troubleshooting Tips:"
echo "1. Check if CLOUDFLARE_TUNNEL_TOKEN is set in .env file"
echo "2. Verify the tunnel token is valid and not expired"
echo "3. Ensure the tunnel is configured in Cloudflare dashboard"
echo "4. Check network connectivity to Cloudflare"

# Check if tunnel token is set
if [ -z "$CLOUDFLARE_TUNNEL_TOKEN" ]; then
    echo ""
    echo "⚠️  CLOUDFLARE_TUNNEL_TOKEN environment variable is not set"
    echo "   Please check your .env file"
else
    echo ""
    echo "✅ CLOUDFLARE_TUNNEL_TOKEN is set"
fi

echo ""
echo "🔄 To restart cloudflared:"
echo "   docker-compose restart cloudflared"
echo ""
echo "🛠️  To check cloudflared configuration:"
echo "   docker exec atma-cloudflared cloudflared tunnel info"
