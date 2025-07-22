#!/bin/bash

# Script untuk scaling analysis workers
# Usage: ./scale-workers.sh [number_of_workers]

# Default number of workers
DEFAULT_WORKERS=3
WORKERS=${1:-$DEFAULT_WORKERS}

echo "🚀 Scaling Analysis Workers to $WORKERS instances..."

# Validate input
if ! [[ "$WORKERS" =~ ^[0-9]+$ ]] || [ "$WORKERS" -lt 1 ] || [ "$WORKERS" -gt 10 ]; then
    echo "❌ Error: Number of workers must be between 1 and 10"
    exit 1
fi

# Stop existing workers
echo "🛑 Stopping existing analysis workers..."
docker-compose stop analysis-worker-1 analysis-worker-2 analysis-worker-3 2>/dev/null || true
docker-compose rm -f analysis-worker-1 analysis-worker-2 analysis-worker-3 2>/dev/null || true

# Scale workers
echo "📈 Starting $WORKERS analysis worker(s)..."
for i in $(seq 1 $WORKERS); do
    echo "  Starting analysis-worker-$i..."
    docker-compose up -d analysis-worker-$i
    
    if [ $? -eq 0 ]; then
        echo "  ✅ analysis-worker-$i started successfully"
    else
        echo "  ❌ Failed to start analysis-worker-$i"
        exit 1
    fi
    
    # Small delay between starting workers
    sleep 2
done

echo ""
echo "🎉 Successfully scaled to $WORKERS analysis worker(s)!"
echo ""
echo "📊 Current worker status:"
docker-compose ps | grep analysis-worker

echo ""
echo "📝 To monitor logs:"
echo "   docker-compose logs -f analysis-worker-1"
echo "   docker-compose logs -f analysis-worker-2"
echo "   docker-compose logs -f analysis-worker-3"

echo ""
echo "🔍 To check RabbitMQ queue status:"
echo "   Open http://localhost:15672 (admin/admin123)"
