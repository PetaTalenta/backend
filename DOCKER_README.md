# ATMA Backend - Docker Setup

## Overview

This Docker setup provides a complete containerized environment for the ATMA (AI-Driven Talent Mapping Assessment) Backend system with all microservices.

## Architecture

### Services
- **API Gateway** (Port 3000) - Main entry point
- **Auth Service** (Port 3001) - Authentication and user management
- **Archive Service** (Port 3002) - Data storage and retrieval
- **Assessment Service** (Port 3003) - Assessment processing
- **Notification Service** (Port 3005) - Real-time notifications
- **Analysis Worker** - AI-powered analysis processing (2 replicas)

### Infrastructure
- **PostgreSQL 17** - Primary database
- **RabbitMQ 4.1** - Message broker with management interface

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available for containers
- Google AI API Key (for analysis worker)

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.docker .env

# Edit the .env file and update:
# - GOOGLE_AI_API_KEY (required for analysis worker)
# - JWT_SECRET (change in production)
# - INTERNAL_SERVICE_KEY (change in production)
# - AUDIT_ENCRYPTION_KEY (change in production)
```

### 2. Start Services

**Linux/Mac:**
```bash
chmod +x docker-start.sh
./docker-start.sh
```

**Windows:**
```cmd
docker-start.bat
```

**Manual:**
```bash
docker-compose up --build -d
```

### 3. Verify Services

Check service health:
```bash
docker-compose ps
docker-compose logs -f
```

Access services:
- API Gateway: http://localhost:3000
- RabbitMQ Management: http://localhost:15672 (user: atma_user, pass: atma_password)

## Configuration

### Environment Variables

All services are configured through environment variables defined in the docker-compose.yml file. Key configurations include:

#### Database
- PostgreSQL 17 with automatic schema initialization
- Connection pooling optimized for each service
- Persistent data storage

#### Message Queue
- RabbitMQ 4.1 with management interface
- Event-driven architecture support
- Dead letter queues for failed messages

#### Security
- JWT token authentication
- Internal service communication keys
- CORS configuration

#### Performance
- Database connection pooling
- Batch processing optimization
- Circuit breaker patterns
- Rate limiting

### Service-Specific Configuration

#### Auth Service
- Redis disabled (no Redis in compose)
- Database connection pooling
- Cache configuration disabled
- Performance monitoring enabled

#### Archive Service
- Batch processing optimization
- Database pool optimization
- Event-driven architecture support

#### Assessment Service
- Idempotency support
- Queue configuration
- Database optimization

#### Analysis Worker
- Google AI integration
- Token counting and pricing
- Batch processing
- Circuit breaker patterns
- Multiple worker instances

#### Notification Service
- Socket.IO configuration
- Real-time event processing

#### API Gateway
- Rate limiting
- Service routing
- Health checks

## Management Commands

### Start/Stop Services
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service
docker-compose logs -f analysis-worker
```

### Scale Services
```bash
# Scale analysis workers
docker-compose up -d --scale analysis-worker=4
```

### Database Management
```bash
# Access PostgreSQL
docker-compose exec postgres psql -U atma_user -d atma_db

# Backup database
docker-compose exec postgres pg_dump -U atma_user atma_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U atma_user atma_db < backup.sql
```

### RabbitMQ Management
```bash
# Access RabbitMQ CLI
docker-compose exec rabbitmq rabbitmqctl status

# View queues
docker-compose exec rabbitmq rabbitmqctl list_queues
```

## Troubleshooting

### Common Issues

1. **Services not starting**
   - Check Docker daemon is running
   - Verify port availability (3000-3005, 5432, 5672, 15672)
   - Check logs: `docker-compose logs [service-name]`

2. **Database connection errors**
   - Wait for PostgreSQL to be ready (health check)
   - Check database credentials in .env file
   - Verify database initialization

3. **RabbitMQ connection errors**
   - Wait for RabbitMQ to be ready (health check)
   - Check RabbitMQ credentials
   - Verify queue configuration

4. **Analysis worker not processing**
   - Check Google AI API key is valid
   - Verify RabbitMQ connection
   - Check worker logs for errors

### Health Checks

All services include health checks. Check status:
```bash
docker-compose ps
```

Healthy services show "healthy" status.

### Performance Monitoring

Monitor resource usage:
```bash
docker stats
```

## Production Considerations

### Security
- Change all default passwords and keys
- Use proper SSL/TLS certificates
- Configure firewall rules
- Enable audit logging

### Scaling
- Use Docker Swarm or Kubernetes for production
- Scale analysis workers based on load
- Configure load balancers
- Use external databases for high availability

### Monitoring
- Add monitoring stack (Prometheus, Grafana)
- Configure log aggregation
- Set up alerting
- Monitor resource usage

### Backup
- Regular database backups
- RabbitMQ configuration backup
- Application logs backup
- Volume snapshots

## Development

### Local Development
```bash
# Use development environment
cp .env.docker .env.dev
# Edit .env.dev for development settings

# Start with development configuration
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Testing
```bash
# Run tests in containers
docker-compose exec auth-service npm test
docker-compose exec assessment-service npm test
```

### Debugging
```bash
# Access service shell
docker-compose exec auth-service sh

# View service files
docker-compose exec auth-service ls -la
```
