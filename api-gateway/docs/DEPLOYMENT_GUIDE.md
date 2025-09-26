# Deployment Guide

Panduan lengkap untuk deployment ATMA API Gateway di berbagai environment.

## 📋 Prerequisites

### System Requirements

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **Memory**: Minimum 512MB, Recommended 2GB
- **CPU**: Minimum 1 core, Recommended 2+ cores
- **Storage**: Minimum 1GB free space

### Dependencies

- Docker (optional, untuk containerized deployment)
- PM2 (untuk production deployment)
- Nginx (untuk reverse proxy)
- SSL certificates (untuk HTTPS)

## 🚀 Deployment Methods

### 1. Local Development

```bash
# Clone repository
git clone <repository-url>
cd api-gateway

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env file with your configuration

# Start development server
npm run dev
```

### 2. Production Server (PM2)

#### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Create application user
sudo useradd -m -s /bin/bash atma
sudo usermod -aG sudo atma
```

#### Step 2: Application Deployment

```bash
# Switch to application user
sudo su - atma

# Clone repository
git clone <repository-url> /home/atma/api-gateway
cd /home/atma/api-gateway

# Install dependencies
npm ci --only=production

# Setup environment
cp .env.example .env
# Configure production environment variables

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'atma-api-gateway',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

# Start application with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions provided by PM2
```

#### Step 3: Nginx Configuration

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/atma-api-gateway << 'EOF'
upstream api_gateway {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://api_gateway;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://api_gateway;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://api_gateway;
        access_log off;
    }

    # Static files (if any)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/atma-api-gateway /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

#### Step 4: SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Test automatic renewal
sudo certbot renew --dry-run

# Setup automatic renewal cron job
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### 3. Docker Deployment

#### Single Container

```bash
# Build image
docker build -t atma-api-gateway .

# Run container
docker run -d \
  --name atma-gateway \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  atma-api-gateway
```

#### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  api-gateway:
    build: .
    container_name: atma-api-gateway
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - AUTH_SERVICE_URL=http://auth-service:3001
      - ARCHIVE_SERVICE_URL=http://archive-service:3002
      - ASSESSMENT_SERVICE_URL=http://assessment-service:3003
      - NOTIFICATION_SERVICE_URL=http://notification-service:3005
      - CHATBOT_SERVICE_URL=http://chatbot-service:3006
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    depends_on:
      - auth-service
      - archive-service
      - assessment-service
    networks:
      - atma-network

  nginx:
    image: nginx:alpine
    container_name: atma-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - api-gateway
    restart: unless-stopped
    networks:
      - atma-network

networks:
  atma-network:
    driver: bridge
```

Deploy with Docker Compose:

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f api-gateway

# Scale gateway instances
docker-compose up -d --scale api-gateway=3

# Stop services
docker-compose down
```

### 4. Kubernetes Deployment

#### Deployment YAML

Create `k8s-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: atma-api-gateway
  labels:
    app: atma-api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: atma-api-gateway
  template:
    metadata:
      labels:
        app: atma-api-gateway
    spec:
      containers:
      - name: api-gateway
        image: atma-api-gateway:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: atma-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: atma-api-gateway-service
spec:
  selector:
    app: atma-api-gateway
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: atma-api-gateway-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: atma-api-gateway-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: atma-api-gateway-service
            port:
              number: 80
```

Deploy to Kubernetes:

```bash
# Apply deployment
kubectl apply -f k8s-deployment.yaml

# Check deployment status
kubectl get deployments
kubectl get pods
kubectl get services

# View logs
kubectl logs -f deployment/atma-api-gateway

# Scale deployment
kubectl scale deployment atma-api-gateway --replicas=5
```

## 🔧 Environment Configuration

### Production Environment Variables

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# Service URLs (Production)
AUTH_SERVICE_URL=https://auth.yourdomain.com
ARCHIVE_SERVICE_URL=https://archive.yourdomain.com
ASSESSMENT_SERVICE_URL=https://assessment.yourdomain.com
NOTIFICATION_SERVICE_URL=https://notification.yourdomain.com
CHATBOT_SERVICE_URL=https://chatbot.yourdomain.com
ADMIN_SERVICE_URL=https://admin.yourdomain.com

# Security (Use strong, unique values)
JWT_SECRET=your_super_secure_jwt_secret_key_here
INTERNAL_SERVICE_KEY=your_super_secure_internal_service_key_here

# Rate Limiting (Production values)
RATE_LIMIT_WINDOW_MS=600000
RATE_LIMIT_MAX_REQUESTS=10000

# CORS (Restrict to your domains)
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Logging
LOG_LEVEL=info
LOG_FORMAT=combined

# Health Check
HEALTH_CHECK_INTERVAL=30000
SERVICE_TIMEOUT=30000

# Database (if applicable)
DATABASE_URL=postgresql://user:password@localhost:5432/atma_gateway

# Redis (for session storage)
REDIS_URL=redis://localhost:6379

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
NEW_RELIC_LICENSE_KEY=your-new-relic-license-key
```

### Security Checklist

- [ ] Use strong, unique JWT secret
- [ ] Use strong, unique internal service key
- [ ] Restrict CORS origins to your domains
- [ ] Enable HTTPS in production
- [ ] Use environment variables for sensitive data
- [ ] Implement proper rate limiting
- [ ] Enable security headers (Helmet)
- [ ] Use non-root user in containers
- [ ] Keep dependencies updated
- [ ] Enable audit logging

## 📊 Monitoring Setup

### Health Check Monitoring

```bash
# Setup health check monitoring script
cat > /home/atma/health-check.sh << 'EOF'
#!/bin/bash

GATEWAY_URL="http://localhost:3000"
HEALTH_ENDPOINT="$GATEWAY_URL/health"

# Check health endpoint
response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_ENDPOINT)

if [ $response -eq 200 ]; then
    echo "$(date): API Gateway is healthy"
    exit 0
else
    echo "$(date): API Gateway is unhealthy (HTTP $response)"
    # Send alert (email, Slack, etc.)
    exit 1
fi
EOF

chmod +x /home/atma/health-check.sh

# Add to crontab for regular monitoring
echo "*/5 * * * * /home/atma/health-check.sh >> /home/atma/health-check.log 2>&1" | crontab -
```

### Log Rotation

```bash
# Setup logrotate for application logs
sudo tee /etc/logrotate.d/atma-api-gateway << 'EOF'
/home/atma/api-gateway/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 atma atma
    postrotate
        pm2 reload atma-api-gateway
    endscript
}
EOF
```

## 🔄 Deployment Automation

### CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy API Gateway

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    - name: Deploy to production
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /home/atma/api-gateway
          git pull origin main
          npm ci --only=production
          pm2 reload atma-api-gateway
```

### Deployment Script

Create `deploy.sh`:

```bash
#!/bin/bash

set -e

echo "Starting deployment..."

# Pull latest code
git pull origin main

# Install dependencies
npm ci --only=production

# Run tests
npm test

# Reload PM2 process
pm2 reload atma-api-gateway

# Wait for health check
sleep 10

# Verify deployment
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "Deployment successful!"
else
    echo "Deployment failed - health check failed"
    exit 1
fi
```

## 🚨 Rollback Procedures

### PM2 Rollback

```bash
# View PM2 process list
pm2 list

# Restart specific process
pm2 restart atma-api-gateway

# View logs
pm2 logs atma-api-gateway

# Rollback to previous version
git checkout HEAD~1
npm ci --only=production
pm2 reload atma-api-gateway
```

### Docker Rollback

```bash
# List available images
docker images atma-api-gateway

# Rollback to previous image
docker stop atma-gateway
docker rm atma-gateway
docker run -d --name atma-gateway -p 3000:3000 --env-file .env atma-api-gateway:previous-tag
```

### Kubernetes Rollback

```bash
# View rollout history
kubectl rollout history deployment/atma-api-gateway

# Rollback to previous version
kubectl rollout undo deployment/atma-api-gateway

# Rollback to specific revision
kubectl rollout undo deployment/atma-api-gateway --to-revision=2
```

---

**Last Updated**: 2024-01-01  
**Version**: 1.0.0
