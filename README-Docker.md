# ATMA Backend - Docker Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available for containers
- Ports 3000-3005, 5432, 5672, 6379, 8080, 15672 available

### 1. Deploy All Services
```bash
# Make scripts executable
chmod +x docker-scripts/*.sh

# Deploy entire backend
./docker-scripts/deploy.sh
```

### 2. Scale Analysis Workers
```bash
# Scale to 5 workers
./docker-scripts/scale-workers.sh 5

# Scale to 1 worker
./docker-scripts/scale-workers.sh 1
```

## 📋 Service Configuration

### Environment Files
- **Development**: Use `.env` files in each service directory
- **Docker/Production**: Use `.env.docker` files (automatically used by docker-compose)

### Key Differences: Development vs Docker
| Configuration | Development (.env) | Docker (.env.docker) |
|---------------|-------------------|---------------------|
| Database Host | localhost | postgres |
| Redis Host | localhost | redis |
| RabbitMQ Host | localhost | rabbitmq |
| Service URLs | localhost:port | container-name:port |
| Node Environment | development | production |

## 🔧 Service Details

### Infrastructure Services
- **PostgreSQL**: Database server (port 5432)
- **RabbitMQ**: Message broker (ports 5672, 15672)
- **Redis**: Cache server (port 6379)

### Application Services
- **API Gateway**: Main entry point (port 3000)
- **Auth Service**: Authentication (port 3001)
- **Archive Service**: Data archival (port 3002)
- **Assessment Service**: Assessment processing (port 3003)
- **Notification Service**: Real-time notifications (port 3005)
- **Analysis Workers**: AI processing (3 instances by default)
- **Documentation Service**: API docs (port 8080)

## 🔍 Monitoring & Debugging

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service

# Analysis workers
docker-compose logs -f analysis-worker-1
docker-compose logs -f analysis-worker-2
docker-compose logs -f analysis-worker-3
```

### Service Status
```bash
# Check all services
docker-compose ps

# Check specific service health
docker-compose ps postgres
```

### Access Management Interfaces
- **RabbitMQ Management**: http://localhost:15672 (admin/admin123)
- **API Documentation**: http://localhost:8080

## ⚡ Scaling & Performance

### Analysis Worker Scaling
The system supports horizontal scaling of analysis workers:

```bash
# Scale up for high load
./docker-scripts/scale-workers.sh 5

# Scale down for resource conservation
./docker-scripts/scale-workers.sh 2
```

### Resource Allocation
- **Database Pool**: Optimized for concurrent connections
- **Worker Concurrency**: 5 concurrent jobs per worker
- **Redis Caching**: Enabled for better performance

## 🛠️ Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check what's using the ports
   netstat -tulpn | grep :3000
   
   # Stop conflicting services
   sudo systemctl stop nginx  # if using port 3000
   ```

2. **Database Connection Issues**
   ```bash
   # Check PostgreSQL logs
   docker-compose logs postgres
   
   # Restart database
   docker-compose restart postgres
   ```

3. **RabbitMQ Connection Issues**
   ```bash
   # Check RabbitMQ status
   docker-compose logs rabbitmq
   
   # Access management interface
   open http://localhost:15672
   ```

4. **Worker Not Processing Jobs**
   ```bash
   # Check worker logs
   docker-compose logs analysis-worker-1
   
   # Restart workers
   docker-compose restart analysis-worker-1 analysis-worker-2 analysis-worker-3
   ```

### Health Checks
All services include health checks. Unhealthy services will be automatically restarted.

### Data Persistence
- **PostgreSQL data**: Stored in `postgres_data` volume
- **RabbitMQ data**: Stored in `rabbitmq_data` volume  
- **Redis data**: Stored in `redis_data` volume
- **Logs**: Mapped to local `logs/` directories

## 🔒 Security Notes

### Production Deployment
Before production deployment, update these values:
- `JWT_SECRET`: Use a strong, unique secret
- `INTERNAL_SERVICE_KEY`: Use a strong, unique key
- `GOOGLE_AI_API_KEY`: Use your actual API key
- Database passwords: Use strong passwords
- Redis password: Use a strong password

### Network Security
- All services communicate through the `atma-network` Docker network
- Only necessary ports are exposed to the host
- Internal service communication uses container names

## 📊 Performance Monitoring

### Key Metrics to Monitor
- **Database connections**: Check `DB_POOL_MAX` usage
- **Queue length**: Monitor RabbitMQ queue depth
- **Worker processing time**: Check analysis worker logs
- **Memory usage**: Monitor container resource usage
- **API response times**: Monitor gateway logs

### Scaling Recommendations
- **High assessment load**: Increase analysis workers
- **High user load**: Consider API Gateway replicas
- **Database bottleneck**: Increase connection pool size
- **Memory issues**: Reduce worker concurrency or add more workers
