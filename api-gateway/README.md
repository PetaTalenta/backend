# ATMA API Gateway

API Gateway untuk sistem ATMA (AI-Driven Talent Mapping Assessment) yang berfungsi sebagai entry point tunggal untuk semua microservices backend.

## 📋 Daftar Isi

- [Overview](#overview)
- [Arsitektur](#arsitektur)
- [Fitur Utama](#fitur-utama)
- [Instalasi](#instalasi)
- [Konfigurasi](#konfigurasi)
- [Penggunaan](#penggunaan)
- [API Routes](#api-routes)
- [Middleware](#middleware)
- [Testing](#testing)
- [Deployment](#deployment)
- [Monitoring](#monitoring)

## 🎯 Overview

ATMA API Gateway adalah komponen central yang mengelola routing, authentication, rate limiting, dan proxy untuk semua microservices dalam ekosistem ATMA. Gateway ini dibangun menggunakan Node.js dengan Express.js dan menyediakan layer abstraksi yang aman dan efisien.

### Microservices yang Dikelola

- **Auth Service** (Port 3001) - Authentication & User Management
- **Archive Service** (Port 3002) - Data Storage & Analytics
- **Assessment Service** (Port 3003) - AI Assessment Processing
- **Notification Service** (Port 3005) - Real-time Notifications & WebSocket
- **Chatbot Service** (Port 3006) - AI Chatbot Integration
- **Admin Service** (Port 3007) - Administrative Functions

## 🏗️ Arsitektur

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client Apps   │───▶│   API Gateway    │───▶│  Microservices  │
│                 │    │   (Port 3000)    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │  Middleware  │
                       │  - Auth      │
                       │  - Rate Limit│
                       │  - Logging   │
                       │  - Proxy     │
                       └──────────────┘
```

## ✨ Fitur Utama

### 🔐 Security
- **JWT Authentication** - Token-based authentication
- **Rate Limiting** - Perlindungan dari abuse
- **CORS Configuration** - Cross-origin resource sharing
- **Helmet Security** - Security headers
- **Input Validation** - Request validation

### 🚀 Performance
- **Connection Pooling** - HTTP agent optimization
- **Compression** - Response compression
- **Async Logging** - Non-blocking logging
- **Caching Headers** - Browser caching optimization

### 📊 Monitoring
- **Health Checks** - Service health monitoring
- **Request Logging** - Comprehensive request tracking
- **Error Handling** - Centralized error management
- **Metrics Collection** - Performance metrics

### 🔄 Proxy Features
- **Load Balancing** - Request distribution
- **Timeout Handling** - Request timeout management
- **Error Recovery** - Automatic retry mechanisms
- **WebSocket Support** - Real-time communication

## 🚀 Instalasi

### Prerequisites
- Node.js >= 18.0.0
- npm atau yarn
- Docker (optional)

### Local Development

```bash
# Clone repository
git clone <repository-url>
cd api-gateway

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Start development server
npm run dev
```

### Docker Deployment

```bash
# Build image
docker build -t atma-api-gateway .

# Run container
docker run -p 3000:3000 --env-file .env atma-api-gateway
```

## ⚙️ Konfigurasi

### Environment Variables

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Service URLs
AUTH_SERVICE_URL=http://localhost:3001
ARCHIVE_SERVICE_URL=http://localhost:3002
ASSESSMENT_SERVICE_URL=http://localhost:3003
NOTIFICATION_SERVICE_URL=http://localhost:3005
CHATBOT_SERVICE_URL=http://localhost:3006
ADMIN_SERVICE_URL=http://localhost:3007

# Security
JWT_SECRET=your_jwt_secret_key
INTERNAL_SERVICE_KEY=your_internal_service_key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=600000
RATE_LIMIT_MAX_REQUESTS=5000

# CORS
ALLOWED_ORIGINS=*

# Logging
LOG_LEVEL=info
LOG_FORMAT=combined

# Health Check
HEALTH_CHECK_INTERVAL=30000
SERVICE_TIMEOUT=30000
```

### Configuration Structure

```javascript
const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    archive: process.env.ARCHIVE_SERVICE_URL || 'http://localhost:3002',
    // ... other services
  },
  jwt: {
    secret: process.env.JWT_SECRET
  },
  rateLimit: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 5000
  }
};
```

## 📖 Penggunaan

### Starting the Gateway

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Run tests
npm test

# Run tests with watch mode
npm run test:watch
```

### Health Check

```bash
# Basic health check
curl http://localhost:3000/health

# Detailed health check
curl http://localhost:3000/health/detailed

# Readiness probe
curl http://localhost:3000/health/ready

# Liveness probe
curl http://localhost:3000/health/live
```

### Example API Calls

```bash
# User registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# User login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get user profile (with token)
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Submit assessment
curl -X POST http://localhost:3000/api/assessment/submit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"answers":["A","B","C"]}'
```

## 🛣️ API Routes

### Authentication Routes (`/api/auth/*`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/register` | ❌ | User registration |
| POST | `/api/auth/login` | ❌ | User login |
| POST | `/api/auth/logout` | ✅ | User logout |
| GET | `/api/auth/profile` | ✅ | Get user profile |
| PUT | `/api/auth/profile` | ✅ | Update user profile |
| POST | `/api/auth/change-password` | ✅ | Change password |
| GET | `/api/auth/token-balance` | ✅ | Get token balance |

### Admin Routes (`/api/admin/*`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/admin/login` | ❌ | Admin login |
| GET | `/api/admin/profile` | ✅ Admin | Get admin profile |
| POST | `/api/admin/register` | ✅ Superadmin | Create new admin |

### Archive Routes (`/api/archive/*`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/archive/results` | ✅ | Get user results |
| GET | `/api/archive/results/:id` | ❌ | Get specific result |
| POST | `/api/archive/results` | 🔧 Internal | Create result |
| GET | `/api/archive/jobs` | ✅ | Get analysis jobs |
| GET | `/api/archive/stats` | ✅ | Get statistics |

### Assessment Routes (`/api/assessment/*`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/assessment/submit` | ✅ | Submit assessment |
| POST | `/api/assessment/retry` | ✅ | Retry assessment |
| GET | `/api/assessment/status` | ✅ | Check status |
| GET | `/api/assessment/health` | ❌ | Health check |

### Chatbot Routes (`/api/chatbot/*`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/chatbot/conversations` | ✅ | Get conversations |
| POST | `/api/chatbot/conversations` | ✅ | Create conversation |
| GET | `/api/chatbot/assessment-ready/:userId` | ✅ | Check assessment readiness |

### Notification Routes (`/api/notifications/*`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/notifications` | ✅ | Get notifications |
| POST | `/api/notifications` | ✅ | Create notification |
| GET | `/api/notifications/health` | ❌ | Health check |

### Health Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health status |
| GET | `/health/detailed` | Detailed health with services |
| GET | `/health/ready` | Readiness probe |
| GET | `/health/live` | Liveness probe |

## 🔧 Middleware

### Authentication Middleware

```javascript
// JWT Token Verification
const verifyToken = async (req, res, next) => {
  // Verifies JWT token via auth service
};

// Internal Service Verification
const verifyInternalService = (req, res, next) => {
  // Verifies internal service key
};

// Admin Role Verification
const verifyAdmin = (req, res, next) => {
  // Verifies admin role
};
```

### Rate Limiting

```javascript
// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5000, // limit each IP to 5000 requests per windowMs
});

// Auth-specific rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
```

### Proxy Configuration

```javascript
const createServiceProxy = (serviceUrl, options = {}) => {
  return createProxyMiddleware({
    target: serviceUrl,
    changeOrigin: true,
    timeout: 60000,
    agent: httpAgent, // Connection pooling
    onError: errorHandler,
    onProxyReq: requestLogger,
    onProxyRes: responseLogger
  });
};
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- tests/health.test.js
```

### Test Structure

```
tests/
├── setup.js          # Test setup configuration
├── health.test.js     # Health endpoint tests
└── ...               # Additional test files
```

### Example Test

```javascript
describe('Health Check Endpoints', () => {
  it('should return basic health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      status: 'healthy',
      service: 'api-gateway'
    });
  });
});
```

## 🚀 Deployment

### Docker Deployment

#### Single Container

```bash
# Build image
docker build -t atma-api-gateway .

# Run container
docker run -d \
  --name atma-gateway \
  -p 3000:3000 \
  --env-file .env \
  atma-api-gateway
```

#### Docker Compose

```yaml
version: '3.8'
services:
  api-gateway:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - AUTH_SERVICE_URL=http://auth-service:3001
      - ARCHIVE_SERVICE_URL=http://archive-service:3002
    depends_on:
      - auth-service
      - archive-service
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Production Deployment

#### Environment Setup

```bash
# Production environment variables
export NODE_ENV=production
export PORT=3000
export JWT_SECRET=your_production_jwt_secret
export INTERNAL_SERVICE_KEY=your_production_internal_key

# Service URLs (production)
export AUTH_SERVICE_URL=https://auth.atma.com
export ARCHIVE_SERVICE_URL=https://archive.atma.com
export ASSESSMENT_SERVICE_URL=https://assessment.atma.com
```

#### PM2 Deployment

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start src/server.js --name "atma-gateway"

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

#### Nginx Configuration

```nginx
upstream api_gateway {
    server localhost:3000;
    server localhost:3001 backup;
}

server {
    listen 80;
    server_name api.atma.com;

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
}
```

## 📊 Monitoring

### Health Monitoring

#### Health Check Endpoints

```bash
# Basic health check
curl http://localhost:3000/health

# Response:
{
  "success": true,
  "status": "healthy",
  "service": "api-gateway",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

#### Detailed Health Check

```bash
curl http://localhost:3000/health/detailed

# Response:
{
  "success": true,
  "status": "healthy",
  "service": "api-gateway",
  "services": {
    "auth": { "status": "healthy", "responseTime": 45 },
    "archive": { "status": "healthy", "responseTime": 32 },
    "assessment": { "status": "degraded", "responseTime": 1200 }
  },
  "summary": {
    "total": 6,
    "healthy": 5,
    "unhealthy": 1
  }
}
```

### Logging

#### Log Levels

- **ERROR** - Error conditions
- **WARN** - Warning conditions
- **INFO** - Informational messages
- **DEBUG** - Debug-level messages

#### Log Format

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "message": "Request processed",
  "method": "GET",
  "url": "/api/auth/profile",
  "statusCode": 200,
  "responseTime": 45,
  "userAgent": "Mozilla/5.0...",
  "ip": "192.168.1.1"
}
```

#### Log Files

```
logs/
├── gateway-2024-01-01.log    # General application logs
├── error-2024-01-01.log      # Error logs only
└── access-2024-01-01.log     # Access logs
```

### Performance Metrics

#### Key Metrics to Monitor

1. **Response Time**
   - Average response time per endpoint
   - 95th percentile response time
   - Maximum response time

2. **Throughput**
   - Requests per second
   - Concurrent connections
   - Queue length

3. **Error Rates**
   - HTTP error rates (4xx, 5xx)
   - Service availability
   - Failed proxy requests

4. **Resource Usage**
   - CPU utilization
   - Memory usage
   - Network I/O

#### Monitoring Tools Integration

##### Prometheus Metrics

```javascript
// Example metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(`
# HELP gateway_requests_total Total number of requests
# TYPE gateway_requests_total counter
gateway_requests_total{method="GET",status="200"} 1234

# HELP gateway_request_duration_seconds Request duration
# TYPE gateway_request_duration_seconds histogram
gateway_request_duration_seconds_bucket{le="0.1"} 100
gateway_request_duration_seconds_bucket{le="0.5"} 200
  `);
});
```

##### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "ATMA API Gateway",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(gateway_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, gateway_request_duration_seconds)"
          }
        ]
      }
    ]
  }
}
```

### Alerting

#### Alert Rules

```yaml
groups:
  - name: api-gateway
    rules:
      - alert: HighErrorRate
        expr: rate(gateway_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, gateway_request_duration_seconds) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Service Connection Errors

**Problem**: Gateway cannot connect to backend services

**Solution**:
```bash
# Check service URLs
echo $AUTH_SERVICE_URL
echo $ARCHIVE_SERVICE_URL

# Test connectivity
curl http://localhost:3001/health
curl http://localhost:3002/health

# Check network connectivity
ping auth-service
telnet auth-service 3001
```

#### 2. Authentication Failures

**Problem**: JWT token verification fails

**Solution**:
```bash
# Check JWT secret configuration
echo $JWT_SECRET

# Verify token manually
node -e "
const jwt = require('jsonwebtoken');
const token = 'YOUR_TOKEN_HERE';
const secret = process.env.JWT_SECRET;
console.log(jwt.verify(token, secret));
"

# Check auth service health
curl http://localhost:3001/health
```

#### 3. Rate Limiting Issues

**Problem**: Requests being blocked by rate limiter

**Solution**:
```bash
# Check rate limit configuration
echo $RATE_LIMIT_MAX_REQUESTS
echo $RATE_LIMIT_WINDOW_MS

# Monitor rate limit headers
curl -I http://localhost:3000/api/auth/profile

# Adjust rate limits if needed
export RATE_LIMIT_MAX_REQUESTS=10000
```

#### 4. Memory Leaks

**Problem**: Gateway memory usage keeps increasing

**Solution**:
```bash
# Monitor memory usage
ps aux | grep node
top -p $(pgrep node)

# Enable heap profiling
node --inspect src/server.js

# Use clinic.js for profiling
npm install -g clinic
clinic doctor -- node src/server.js
```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug
export NODE_ENV=development

# Start with debugging
node --inspect=0.0.0.0:9229 src/server.js

# Use Chrome DevTools
# Open chrome://inspect in Chrome browser
```

### Performance Tuning

#### Connection Pool Optimization

```javascript
// Adjust connection pool settings
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 100,        // Increase for high traffic
  maxFreeSockets: 20,     // Increase for better reuse
  timeout: 30000,         // Adjust based on service response times
  freeSocketTimeout: 15000
});
```

#### Rate Limit Tuning

```javascript
// Adjust rate limits based on traffic patterns
const config = {
  rateLimit: {
    windowMs: 5 * 60 * 1000,  // Shorter window for burst traffic
    maxRequests: 10000,       // Higher limit for production
    skipSuccessfulRequests: true, // Don't count successful requests
    skipFailedRequests: false     // Count failed requests
  }
};
```

## 📚 Additional Resources

### Documentation Links

- [Express.js Documentation](https://expressjs.com/)
- [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware)
- [JWT.io](https://jwt.io/)
- [Winston Logging](https://github.com/winstonjs/winston)

### API Testing Tools

- [Postman Collection](./docs/postman-collection.json)
- [Insomnia Workspace](./docs/insomnia-workspace.json)
- [curl Examples](./docs/curl-examples.md)

### Development Guidelines

- [Coding Standards](./docs/coding-standards.md)
- [Security Guidelines](./docs/security-guidelines.md)
- [Performance Best Practices](./docs/performance-guidelines.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **ATMA Development Team**
- **Maintainer**: [Your Name]
- **Contact**: [your.email@example.com]

---

**Last Updated**: 2024-01-01
**Version**: 1.0.0
**Node.js Version**: >= 18.0.0
