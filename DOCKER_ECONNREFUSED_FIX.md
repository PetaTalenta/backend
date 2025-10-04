# Docker Services Management - ECONNREFUSED Error Fix

## Overview

After migrating to git submodules, Docker services are automatically started. However, some services (particularly `analysis-worker` and `notification-service`) may experience `ECONNREFUSED` errors due to dependency timing issues.

## Automatic Handling

The migration script (`migrate-to-submodules.sh`) includes automatic handling:

1. Starts all services with `docker-compose up -d`
2. Waits 15 seconds for initialization
3. Checks `analysis-worker` and `notification-service` for ECONNREFUSED errors
4. Automatically restarts affected services
5. Verifies the fix

## Manual Fix Script

If issues persist or occur later, use the dedicated fix script:

```bash
./fix-docker-econnrefused.sh
```

### What the Script Does

1. **Finds Container Names** - Automatically detects the correct container names
2. **Checks Logs** - Scans recent logs for ECONNREFUSED errors
3. **Restarts Services** - Restarts affected containers
4. **Verifies Fix** - Checks if errors are resolved
5. **Provides Status** - Shows current status of all services

## Common ECONNREFUSED Scenarios

### Analysis Worker

**Symptoms:**
- Cannot connect to RabbitMQ
- Cannot connect to MongoDB
- Job queue not processing

**Typical Error:**
```
Error: connect ECONNREFUSED 172.18.0.5:5672
Error: connect ECONNREFUSED 172.18.0.3:27017
```

**Solution:**
```bash
# Quick fix
docker-compose restart analysis-worker

# Check logs
docker-compose logs -f analysis-worker

# Or use fix script
./fix-docker-econnrefused.sh
```

### Notification Service

**Symptoms:**
- Cannot connect to RabbitMQ
- Cannot send notifications
- Queue consumer not starting

**Typical Error:**
```
Error: connect ECONNREFUSED 172.18.0.5:5672
AMQP connection error
```

**Solution:**
```bash
# Quick fix
docker-compose restart notification-service

# Check logs
docker-compose logs -f notification-service

# Or use fix script
./fix-docker-econnrefused.sh
```

## Manual Commands

### Check Service Status

```bash
# All services
docker-compose ps

# Specific service
docker ps | grep analysis-worker
docker ps | grep notification-service
```

### View Logs

```bash
# Follow logs in real-time
docker-compose logs -f analysis-worker
docker-compose logs -f notification-service

# Last 50 lines
docker-compose logs --tail=50 analysis-worker
docker-compose logs --tail=50 notification-service

# All services
docker-compose logs -f
```

### Restart Services

```bash
# Restart specific service
docker-compose restart analysis-worker
docker-compose restart notification-service

# Restart all services
docker-compose restart

# Stop and start (more thorough)
docker-compose down
docker-compose up -d
```

### Check Container Health

```bash
# All running containers
docker ps

# All containers (including stopped)
docker ps -a

# Container stats (CPU, Memory, etc.)
docker stats

# Inspect specific container
docker inspect atma-backend-analysis-worker-1
```

## Dependency Services

The worker services depend on these infrastructure services:

### RabbitMQ
- **Port:** 5672 (AMQP), 15672 (Management UI)
- **Check:** `docker-compose logs rabbitmq`
- **Restart:** `docker-compose restart rabbitmq`

### MongoDB
- **Port:** 27017
- **Check:** `docker-compose logs mongodb`
- **Restart:** `docker-compose restart mongodb`

### Redis
- **Port:** 6379
- **Check:** `docker-compose logs redis`
- **Restart:** `docker-compose restart redis`

## Troubleshooting Steps

### Step 1: Check Dependent Services

```bash
# Check if RabbitMQ is running
docker-compose ps rabbitmq

# Check if MongoDB is running
docker-compose ps mongodb

# Check logs for errors
docker-compose logs rabbitmq
docker-compose logs mongodb
```

### Step 2: Verify Network Connectivity

```bash
# Check Docker networks
docker network ls

# Inspect the backend network
docker network inspect atma-backend_default

# Check if containers can reach each other
docker exec atma-backend-analysis-worker-1 ping -c 3 rabbitmq
docker exec atma-backend-analysis-worker-1 ping -c 3 mongodb
```

### Step 3: Check Environment Variables

```bash
# Check environment variables in container
docker exec atma-backend-analysis-worker-1 env | grep -E 'RABBIT|MONGO|REDIS'

# Compare with docker-compose.yml settings
grep -A 10 "analysis-worker:" docker-compose.yml
```

### Step 4: Restart in Order

```bash
# 1. Stop all services
docker-compose down

# 2. Start infrastructure first
docker-compose up -d mongodb redis rabbitmq

# 3. Wait for infrastructure to be ready
sleep 10

# 4. Start application services
docker-compose up -d

# 5. Check logs
docker-compose logs -f analysis-worker notification-service
```

## Prevention

### Option 1: Use `depends_on` with Health Checks

Update `docker-compose.yml`:

```yaml
analysis-worker:
  depends_on:
    mongodb:
      condition: service_healthy
    rabbitmq:
      condition: service_healthy
  # ... rest of config

mongodb:
  healthcheck:
    test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
    interval: 10s
    timeout: 5s
    retries: 5

rabbitmq:
  healthcheck:
    test: ["CMD", "rabbitmq-diagnostics", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### Option 2: Add Retry Logic

Update service code to retry connections:

```javascript
// Example for RabbitMQ connection
async function connectWithRetry(maxRetries = 5, delay = 3000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await connectToRabbitMQ();
      console.log('Connected to RabbitMQ');
      return;
    } catch (error) {
      console.log(`Connection attempt ${i + 1} failed, retrying...`);
      if (i < maxRetries - 1) {
        await sleep(delay);
      }
    }
  }
  throw new Error('Failed to connect after max retries');
}
```

### Option 3: Use Wait Scripts

Install wait-for-it or dockerize:

```dockerfile
# In Dockerfile
RUN apt-get update && apt-get install -y wait-for-it

# In docker-compose.yml
command: >
  sh -c "wait-for-it rabbitmq:5672 -- 
         wait-for-it mongodb:27017 -- 
         npm start"
```

## Quick Commands Summary

```bash
# Run the fix script
./fix-docker-econnrefused.sh

# Manual restart
docker-compose restart analysis-worker notification-service

# Check logs
docker-compose logs -f analysis-worker notification-service

# Full restart
docker-compose down && docker-compose up -d

# Check all services status
docker-compose ps

# Monitor in real-time
docker-compose logs -f
```

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Handling Container Dependencies](https://docs.docker.com/compose/startup-order/)
- [Docker Networking](https://docs.docker.com/network/)
- [RabbitMQ Docker Guide](https://hub.docker.com/_/rabbitmq)

## Support

If issues persist after trying all solutions:

1. Check `docker-compose.yml` configuration
2. Verify network settings
3. Check firewall/security settings
4. Review service logs for specific errors
5. Consider adjusting service restart policies in docker-compose.yml

```yaml
services:
  analysis-worker:
    restart: unless-stopped  # or "always"
```
