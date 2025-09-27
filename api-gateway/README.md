# ATMA API Documentation Service

Interactive documentation service for the AI-Driven Talent Mapping Assessment (ATMA) backend ecosystem. This service provides comprehensive API documentation for all ATMA services with an intuitive, searchable interface.

## 🚀 Features

- **Interactive API Documentation** - Browse all ATMA API endpoints with detailed examples
- **Real-time Search** - Find endpoints quickly with intelligent search functionality
- **Syntax Highlighting** - Beautiful code highlighting for all programming languages
- **Copy to Clipboard** - One-click copying of code examples and endpoints
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile devices
- **Service Overview** - Comprehensive overview of the ATMA ecosystem architecture

## 📋 Services Documented

### 🔐 Auth Service (Port 3001)
- User registration and authentication
- JWT token management
- Profile management
- Password changes and account deletion

### 🎯 Assessment Service (Port 3003)
- AI-driven personality assessments
- RIASEC, OCEAN, and VIA-IS frameworks
- Job queue monitoring and status tracking
- Assessment submission and processing

### 📊 Archive Service (Port 3002)
- Assessment results retrieval
- Historical data and statistics
- Data export functionality
- Result management and deletion

### 💬 Chatbot Service (Port 3004)
- AI-powered career guidance conversations
- Assessment interpretation and recommendations
- Conversation management
- Intelligent suggestion system

### 🔧 Admin Service (Port 3007)
- Admin orchestrator and proxy service
- Centralized admin authentication and management
- User management and token balance operations
- Proxies requests to auth-service and archive-service

## 🛠 Technology Stack

- **Frontend**: Vanilla JavaScript with Vite
- **Styling**: Custom CSS with modern design principles
- **Syntax Highlighting**: PrismJS
- **Build Tool**: Vite for fast development and optimized builds
- **Base URL**: `api.futureguide.id`

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone or navigate to the documentation service directory**
   ```bash
cd documentation-service
```

2. **Install dependencies**
   ```bash
npm install
```

3. **Start development server**
   ```bash
npm run dev
```

4. **Open your browser**
   Navigate to `http://localhost:3007`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## 📁 Project Structure

```
documentation-service/
├── public/
│   └── favicon.svg              # Service favicon
├── src/
│   ├── data/                    # API documentation data
│   │   ├── auth-service.js      # Auth service endpoints
│   │   ├── assessment-service.js # Assessment service endpoints
│   │   ├── archive-service.js   # Archive service endpoints
│   │   ├── chatbot-service.js   # Chatbot service endpoints
│   │   └── admin-service.js     # Admin service endpoints
│   ├── styles/
│   │   ├── main.css            # Main application styles
│   │   └── prism.css           # Syntax highlighting styles
│   └── main.js                 # Main application logic
├── index.html                  # Main HTML file
├── vite.config.js             # Vite configuration
├── package.json               # Project dependencies
└── README.md                  # This file
```

## 🎨 Features Overview

### Navigation
- **Sticky sidebar** with service navigation
- **Smooth scrolling** to sections
- **Active section highlighting** based on scroll position
- **Responsive mobile menu** for smaller screens

### Search Functionality
- **Real-time filtering** of endpoints
- **Search across** endpoint titles, paths, and descriptions
- **Instant results** with no page reload

### Code Examples
- **Multiple language examples** (JavaScript, Python, cURL)
- **Syntax highlighting** for all code blocks
- **Copy to clipboard** functionality
- **Tabbed interface** for different programming languages

### Interactive Elements
- **Collapsible sections** for better organization
- **Hover effects** and smooth transitions
- **Method badges** with color coding (GET, POST, PUT, DELETE)
- **Authentication indicators** for protected endpoints

## 🔧 Configuration

### Base URL Configuration
The base URL is configured to `api.futureguide.id` and can be updated in the service data files if needed.

### Rate Limiting Information
Each service has different rate limits:
- **Auth Service**: 2500 requests per 15 minutes
- **Assessment Service**: 1000 requests per 1 hour
- **Archive Service**: 2000 requests per 15 minutes
- **Chatbot Service**: 200 requests per 15 minutes

### Development Server
The development server runs on port 3007 by default. This can be changed in `vite.config.js`.

## 📚 API Documentation Structure

Each service documentation includes:
- **Service overview** with description and technical details
- **Authentication requirements** and token usage
- **Rate limiting information** for each endpoint
- **Request/response examples** with real data
- **Parameter documentation** with types and validation rules
- **Error handling** with common error codes and responses

## 🤝 Contributing

To add new endpoints or update existing documentation:

1. **Update service data files** in `src/data/`
2. **Follow the existing structure** for consistency
3. **Test the changes** in development mode
4. **Ensure all examples work** with the actual API

## 📄 License

This documentation service is part of the ATMA backend ecosystem.

## 🔗 Related Services

- **Auth Service**: User authentication and management
- **Assessment Service**: AI-driven personality assessments
- **Archive Service**: Data storage and retrieval
- **Chatbot Service**: AI-powered career guidance
- **Admin Service**: Admin orchestrator and user management

## 📞 Support

For questions about the API documentation or to report issues, please contact the ATMA development team.

---

**Built with ❤️ for the ATMA ecosystem**

---

**Built with ❤️ for the ATMA ecosystem**

---

**Built with ❤️ for the ATMA ecosystem**

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
