# ATMA API Gateway - Docker Deployment Guide

## Overview

This guide covers the Docker deployment of the ATMA API Gateway service, which serves as the entry point for all requests and routes them to appropriate backend services.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- At least 512MB RAM allocated to Docker
- Network connectivity to backend services

## Quick Start

### 1. Build the Docker Image

```bash
# Build the image
docker build -t atma-api-gateway:latest .

# Or build with specific tag
docker build -t atma-api-gateway:1.0.0 .
```

### 2. Run with Docker Compose

```bash
# Create the network first (if not exists)
docker network create atma-network

# Run in production mode
docker-compose up -d

# Run in development mode (with hot reload)
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

### 3. Verify Deployment

```bash
# Check container status
docker-compose ps

# Check logs
docker-compose logs -f api-gateway

# Test health endpoint
curl http://localhost:3000/health
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Application environment |
| `PORT` | `3000` | Server port |
| `AUTH_SERVICE_URL` | `http://localhost:3001` | Auth service URL |
| `ARCHIVE_SERVICE_URL` | `http://localhost:3002` | Archive service URL |
| `ASSESSMENT_SERVICE_URL` | `http://localhost:3003` | Assessment service URL |
| `JWT_SECRET` | `atma_secure_jwt_secret_key_...` | JWT signing secret |
| `INTERNAL_SERVICE_KEY` | `internal_service_secret_key_...` | Internal service authentication |
| `RATE_LIMIT_WINDOW_MS` | `600000` | Rate limit window (10 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | `5000` | Max requests per window |
| `ALLOWED_ORIGINS` | `http://localhost:3000,...` | CORS allowed origins |
| `LOG_LEVEL` | `info` | Logging level |
| `HEALTH_CHECK_INTERVAL` | `30000` | Health check interval (ms) |
| `SERVICE_TIMEOUT` | `30000` | Service timeout (ms) |

### Custom Configuration

Create a `.env` file in the api-gateway directory:

```env
NODE_ENV=production
PORT=3000
AUTH_SERVICE_URL=http://auth-service:3001
ARCHIVE_SERVICE_URL=http://archive-service:3002
ASSESSMENT_SERVICE_URL=http://assessment-service:3003
JWT_SECRET=your_secure_jwt_secret_here
INTERNAL_SERVICE_KEY=your_internal_service_key_here
RATE_LIMIT_MAX_REQUESTS=10000
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
LOG_LEVEL=info
```

## Health Checks

The API Gateway includes comprehensive health check endpoints:

- **Basic Health**: `GET /health`
- **Detailed Health**: `GET /health/detailed` (includes backend service status)
- **Readiness Probe**: `GET /health/ready` (for Kubernetes)
- **Liveness Probe**: `GET /health/live` (for Kubernetes)

### Docker Health Check

The Dockerfile includes a built-in health check that runs every 30 seconds:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "..." # Health check script
```

## Logging

### Log Levels
- `error`: Error messages only
- `warn`: Warning and error messages
- `info`: Informational, warning, and error messages
- `debug`: All messages including debug information

### Log Files
Logs are stored in the `/app/logs` directory inside the container and can be mounted to the host:

```yaml
volumes:
  - ./logs:/app/logs
```

### Log Rotation
The application uses Winston with daily log rotation:
- `gateway-YYYY-MM-DD.log`: General application logs
- `error-YYYY-MM-DD.log`: Error logs only

## Security Features

### Container Security
- Runs as non-root user (`atma:nodejs`)
- Uses Alpine Linux for minimal attack surface
- Includes security headers via Helmet.js
- Implements rate limiting

### Network Security
- CORS configuration for cross-origin requests
- Internal service authentication
- JWT token validation
- Request validation and sanitization

## Performance Optimization

### Resource Limits
Recommended Docker resource limits:

```yaml
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
    reservations:
      memory: 256M
      cpus: '0.25'
```

### Scaling
The API Gateway is stateless and can be horizontally scaled:

```bash
# Scale to 3 instances
docker-compose up -d --scale api-gateway=3
```

## Troubleshooting

### Common Issues

1. **Container won't start**
   ```bash
   # Check logs
   docker-compose logs api-gateway
   
   # Check container status
   docker-compose ps
   ```

2. **Health check failing**
   ```bash
   # Test health endpoint manually
   docker exec atma-api-gateway curl http://localhost:3000/health/live
   ```

3. **Cannot connect to backend services**
   ```bash
   # Check network connectivity
   docker exec atma-api-gateway ping auth-service
   
   # Verify service URLs
   docker exec atma-api-gateway env | grep SERVICE_URL
   ```

4. **High memory usage**
   ```bash
   # Monitor resource usage
   docker stats atma-api-gateway
   
   # Check for memory leaks in logs
   docker-compose logs api-gateway | grep -i memory
   ```

### Debug Mode

Run in debug mode for troubleshooting:

```bash
# Set debug environment
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d

# Or run with debug logs
docker run -e LOG_LEVEL=debug -p 3000:3000 atma-api-gateway:latest
```

## Production Deployment

### Recommended Production Setup

1. **Use specific image tags** (not `latest`)
2. **Set resource limits**
3. **Configure log aggregation**
4. **Set up monitoring and alerting**
5. **Use secrets management** for sensitive environment variables
6. **Configure reverse proxy** (nginx/traefik) for SSL termination

### Example Production docker-compose.yml

```yaml
version: '3.8'
services:
  api-gateway:
    image: atma-api-gateway:1.0.0
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=warn
    secrets:
      - jwt_secret
      - internal_service_key
    networks:
      - atma-network
      - traefik-network

secrets:
  jwt_secret:
    external: true
  internal_service_key:
    external: true
```

## Monitoring

### Metrics Endpoints
- Application metrics: Available through health endpoints
- Container metrics: Use `docker stats` or monitoring tools

### Recommended Monitoring Stack
- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **Loki**: Log aggregation
- **Jaeger**: Distributed tracing

## Support

For issues related to Docker deployment:
1. Check the logs: `docker-compose logs api-gateway`
2. Verify configuration: `docker exec atma-api-gateway env`
3. Test connectivity: `docker exec atma-api-gateway curl http://localhost:3000/health`
4. Review resource usage: `docker stats atma-api-gateway`
