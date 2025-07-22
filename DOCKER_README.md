# ATMA Backend - Docker Setup

This document provides instructions for running the ATMA Backend services using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available for containers
- At least 10GB disk space

## Services Overview

The ATMA Backend consists of the following services:

### Infrastructure Services
- **PostgreSQL 17**: Main database with automatic initialization
- **RabbitMQ 4.1**: Message broker for async processing
- **Redis 7**: Caching and session storage

### Application Services
- **API Gateway** (Port 3000): Main entry point and request routing
- **Auth Service** (Port 3001): Authentication and authorization
- **Assessment Service** (Port 3002): Assessment management
- **Archive Service** (Port 3003): Data archiving and retrieval
- **Notification Service** (Port 3004): Real-time notifications
- **Analysis Worker**: Background AI analysis processing
- **Documentation Service** (Port 8080): API documentation

## Quick Start

1. **Clone and navigate to the project directory**:
   ```bash
   cd atma-backend
   ```

2. **Start all services**:
   ```bash
   docker-compose up -d
   ```

3. **Check service status**:
   ```bash
   docker-compose ps
   ```

4. **View logs**:
   ```bash
   # All services
   docker-compose logs -f
   
   # Specific service
   docker-compose logs -f api-gateway
   ```

## Environment Configuration

### Required Environment Variables

Before running, you should update the following in `docker-compose.yml`:

```yaml
# Security - Change these in production!
JWT_SECRET: your-super-secret-jwt-key-change-in-production
POSTGRES_PASSWORD: postgres123
RABBITMQ_DEFAULT_PASS: admin123
REDIS_PASSWORD: redis123
GOOGLE_AI_API_KEY: your-google-ai-api-key-here
```

### Database Configuration

The database is automatically initialized with:
- **Database**: `atma_db`
- **User**: `postgres`
- **Password**: `postgres123` (change in production)
- **Schemas**: `auth`, `assessment`, `archive`, `public`

## Service URLs

- **API Gateway**: http://localhost:3000
- **Documentation**: http://localhost:8080
- **RabbitMQ Management**: http://localhost:15672 (admin/admin123)
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Development Commands

### Build specific service
```bash
docker-compose build api-gateway
```

### Restart specific service
```bash
docker-compose restart auth-service
```

### Scale analysis workers
```bash
docker-compose up -d --scale analysis-worker=3
```

### Access service shell
```bash
docker-compose exec api-gateway sh
```

### Database access
```bash
docker-compose exec postgres psql -U postgres -d atma_db
```

## Monitoring and Health Checks

All services include health checks. Check health status:

```bash
docker-compose ps
```

Healthy services will show "healthy" status.

## Data Persistence

The following data is persisted in Docker volumes:
- **postgres_data**: Database files
- **rabbitmq_data**: Message queue data
- **redis_data**: Cache data
- **Service logs**: Mounted to local directories

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000-3004, 5432, 5672, 6379, 8080, 15672 are available
2. **Memory issues**: Increase Docker memory limit to at least 4GB
3. **Database connection**: Wait for PostgreSQL health check to pass before services start

### Reset everything
```bash
docker-compose down -v
docker-compose up -d
```

### View service logs
```bash
docker-compose logs -f [service-name]
```

## Production Considerations

1. **Change default passwords** in all services
2. **Use environment files** instead of hardcoded values
3. **Set up proper logging** aggregation
4. **Configure backup** for PostgreSQL data
5. **Use secrets management** for sensitive data
6. **Set resource limits** for containers
7. **Configure monitoring** and alerting

## Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: This deletes all data)
docker-compose down -v
```
