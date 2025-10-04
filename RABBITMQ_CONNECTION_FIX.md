# RabbitMQ Connection Fix

## Problem
`notification-service` dan `analysis-worker` kadang mendapatkan error `ECONNREFUSED` saat startup karena RabbitMQ belum sepenuhnya siap menerima koneksi, meskipun container RabbitMQ sudah dalam status "healthy".

## Solution
Implementasi multi-layer protection untuk memastikan RabbitMQ benar-benar siap:

### 1. Enhanced RabbitMQ Healthcheck
**File**: `docker-compose.yml`

```yaml
rabbitmq:
  healthcheck:
    test: ["CMD", "rabbitmq-diagnostics", "check_port_connectivity"]
    interval: 10s        # Check lebih sering
    timeout: 10s
    retries: 10          # Lebih banyak retries
    start_period: 40s    # Waktu startup yang lebih panjang
```

**Perubahan**:
- Ganti `ping` dengan `check_port_connectivity` untuk validasi yang lebih akurat
- Interval dikurangi dari 30s → 10s untuk deteksi lebih cepat
- Retries ditambah dari 5 → 10 untuk lebih toleran
- Start period ditambah dari default → 40s untuk memberikan waktu inisialisasi

### 2. Wait Script
**File**: `docker-scripts/wait-for-rabbitmq.sh`

Script yang menunggu RabbitMQ port (5672) benar-benar terbuka sebelum memulai service:

```bash
#!/bin/sh
# Wait for RabbitMQ to be ready

set -e

host="$1"
shift
cmd="$@"

until nc -z "$host" 5672; do
  >&2 echo "RabbitMQ is unavailable - waiting..."
  sleep 2
done

>&2 echo "RabbitMQ port is open - checking if ready..."
sleep 5  # Additional wait for full initialization

>&2 echo "RabbitMQ is ready - starting service"
exec $cmd
```

**Fitur**:
- Menggunakan `netcat` untuk check port connectivity
- Loop sampai port 5672 terbuka
- Additional wait 5 detik untuk memastikan RabbitMQ fully initialized
- Exec command yang diberikan setelah RabbitMQ ready

### 3. Updated Dockerfiles

#### notification-service/Dockerfile
**Perubahan**:
```dockerfile
# Install netcat
RUN apk add --no-cache dumb-init netcat-openbsd

# Copy wait script
COPY ../docker-scripts/wait-for-rabbitmq.sh /usr/local/bin/wait-for-rabbitmq.sh
RUN chmod +x /usr/local/bin/wait-for-rabbitmq.sh

# Update healthcheck start_period
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3

# Use wait script in CMD
CMD ["/usr/local/bin/wait-for-rabbitmq.sh", "rabbitmq", "npm", "start"]
```

#### analysis-worker/Dockerfile
**Perubahan**:
```dockerfile
# Install netcat
RUN apk add --no-cache dumb-init netcat-openbsd

# Copy wait script
COPY ../docker-scripts/wait-for-rabbitmq.sh /usr/local/bin/wait-for-rabbitmq.sh
RUN chmod +x /usr/local/bin/wait-for-rabbitmq.sh

# Update healthcheck start_period
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3

# Use wait script in CMD
CMD ["/usr/local/bin/wait-for-rabbitmq.sh", "rabbitmq", "npm", "start"]
```

## Testing

### 1. Rebuild Images
```bash
docker-compose build notification-service analysis-worker
```

### 2. Test Startup
```bash
# Start services
docker-compose up -d

# Monitor logs
docker-compose logs -f notification-service analysis-worker rabbitmq
```

**Expected Output**:
```
rabbitmq          | Server startup complete
notification-service | RabbitMQ is unavailable - waiting...
notification-service | RabbitMQ port is open - checking if ready...
notification-service | RabbitMQ is ready - starting service
notification-service | Connected to RabbitMQ successfully
```

### 3. Test with Complete Restart
```bash
# Stop everything
docker-compose down

# Start only RabbitMQ first (to verify depends_on works)
docker-compose up -d rabbitmq

# Wait a bit
sleep 10

# Start dependent services
docker-compose up -d notification-service analysis-worker

# Check logs
docker-compose logs notification-service | grep -i rabbitmq
docker-compose logs analysis-worker | grep -i rabbitmq
```

### 4. Test Rapid Restart
```bash
# Restart RabbitMQ while services are running
docker-compose restart rabbitmq

# Services should reconnect automatically
docker-compose logs -f notification-service analysis-worker
```

## Benefits

1. **No More ECONNREFUSED**: Services wait for RabbitMQ to be truly ready
2. **Graceful Startup**: Clear logging about waiting status
3. **Faster Detection**: Enhanced healthcheck detects readiness sooner
4. **More Reliable**: Multi-layer protection (depends_on + healthcheck + wait script)
5. **Better Monitoring**: Clear log messages for debugging

## Startup Sequence

```
1. docker-compose up
   ↓
2. RabbitMQ container starts
   ↓
3. RabbitMQ healthcheck runs (every 10s, max 10 retries, 40s start period)
   ↓
4. RabbitMQ becomes "healthy"
   ↓
5. notification-service & analysis-worker containers start (depends_on satisfied)
   ↓
6. Wait script runs in containers
   ↓
7. netcat checks port 5672 every 2s
   ↓
8. Port opens → additional 5s wait
   ↓
9. npm start executed
   ↓
10. Services connect to RabbitMQ successfully
```

## Troubleshooting

### Still getting ECONNREFUSED?

1. **Check RabbitMQ logs**:
   ```bash
   docker-compose logs rabbitmq
   ```

2. **Increase wait time in script**:
   Edit `docker-scripts/wait-for-rabbitmq.sh`, increase `sleep 5` to `sleep 10`

3. **Check network connectivity**:
   ```bash
   docker-compose exec notification-service nc -zv rabbitmq 5672
   ```

4. **Manual test**:
   ```bash
   docker-compose exec notification-service sh
   nc -zv rabbitmq 5672
   ```

### Services not starting?

1. **Check depends_on**:
   ```bash
   docker-compose config | grep -A 5 depends_on
   ```

2. **Check healthcheck status**:
   ```bash
   docker ps
   # Look for "healthy" status
   ```

3. **Rebuild images**:
   ```bash
   docker-compose build --no-cache notification-service analysis-worker
   ```

## Rollback

If you need to rollback:

1. **Restore docker-compose.yml**:
   ```bash
   git checkout docker-compose.yml
   ```

2. **Restore Dockerfiles**:
   ```bash
   git checkout notification-service/Dockerfile analysis-worker/Dockerfile
   ```

3. **Rebuild**:
   ```bash
   docker-compose build notification-service analysis-worker
   docker-compose up -d
   ```

## Additional Recommendations

### Application-level Retry Logic
Consider implementing retry logic in the application code:

```javascript
// Example for amqplib
const amqp = require('amqplib');

async function connectWithRetry(url, retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await amqp.connect(url);
      console.log('Connected to RabbitMQ');
      return connection;
    } catch (error) {
      console.log(`Connection attempt ${i + 1} failed: ${error.message}`);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

This provides defense-in-depth alongside the Docker-level protections.

## References

- [Docker Compose depends_on](https://docs.docker.com/compose/compose-file/compose-file-v3/#depends_on)
- [Docker Healthcheck](https://docs.docker.com/engine/reference/builder/#healthcheck)
- [RabbitMQ Docker](https://hub.docker.com/_/rabbitmq)
- [RabbitMQ Diagnostics](https://www.rabbitmq.com/rabbitmq-diagnostics.8.html)
