# Architecture Documentation

Dokumentasi arsitektur lengkap untuk ATMA API Gateway.

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  Web App  │  Mobile App  │  Admin Panel  │  External APIs      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Load Balancer                             │
│                    (Nginx/CloudFlare)                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Gateway                                │
│                   (Port 3000)                                  │
├─────────────────────────────────────────────────────────────────┤
│  Security  │  Rate Limit  │  Auth  │  Proxy  │  Logging       │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │  Auth Service   │ │ Archive Service │ │Assessment Service│
    │   (Port 3001)   │ │   (Port 3002)   │ │   (Port 3003)   │
    └─────────────────┘ └─────────────────┘ └─────────────────┘
                ▼               ▼               ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │Notification Svc │ │ Chatbot Service │ │  Admin Service  │
    │   (Port 3005)   │ │   (Port 3006)   │ │   (Port 3007)   │
    └─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway                               │
├─────────────────────────────────────────────────────────────────┤
│                    Express.js Server                           │
├─────────────────────────────────────────────────────────────────┤
│                     Middleware Stack                           │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Security      │   Authentication│      Rate Limiting          │
│   - Helmet      │   - JWT Verify  │   - Express Rate Limit      │
│   - CORS        │   - Role Check  │   - Per-endpoint limits     │
│   - Compression │   - Token Valid │   - IP-based limiting       │
├─────────────────┼─────────────────┼─────────────────────────────┤
│   Logging       │   Proxy         │      Error Handling         │
│   - Winston     │   - HTTP Proxy  │   - Global error handler    │
│   - Async Log   │   - Connection  │   - 404 handler             │
│   - Request Log │     Pooling     │   - Validation errors       │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

## 🔧 Core Components

### 1. Express Application (`src/app.js`)

**Responsibilities**:
- HTTP server setup
- Middleware configuration
- Route registration
- Error handling

**Key Features**:
- Security middleware (Helmet, CORS)
- Body parsing with size limits
- Compression for responses
- Trust proxy configuration

```javascript
// Core middleware stack
app.use(helmet()); // Security headers
app.use(cors()); // Cross-origin requests
app.use(compression()); // Response compression
app.use(generalLimiter); // Rate limiting
app.use(asyncRequestLogger); // Async logging
```

### 2. Configuration Management (`src/config/index.js`)

**Responsibilities**:
- Environment variable management
- Service URL configuration
- Security settings
- Default value handling

**Configuration Categories**:
- Server settings (port, environment)
- Service URLs (microservices endpoints)
- Security (JWT secret, internal keys)
- Rate limiting (windows, max requests)
- CORS (allowed origins)
- Logging (level, format)
- Health checks (intervals, timeouts)

### 3. Authentication Middleware (`src/middleware/auth.js`)

**Components**:

#### JWT Token Verification
```javascript
const verifyToken = async (req, res, next) => {
  // Extract Bearer token
  // Verify with auth service
  // Attach user to request
};
```

#### Internal Service Authentication
```javascript
const verifyInternalService = (req, res, next) => {
  // Check X-Internal-Service header
  // Verify internal service key
};
```

#### Admin Role Verification
```javascript
const verifyAdmin = (req, res, next) => {
  // Check user role
  // Verify admin permissions
};
```

### 4. Proxy Middleware (`src/middleware/proxy.js`)

**Features**:
- HTTP connection pooling
- Request/response logging
- Error handling and retry logic
- Timeout management
- WebSocket support

**Connection Pool Configuration**:
```javascript
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  freeSocketTimeout: 30000
});
```

### 5. Rate Limiting (`src/middleware/rateLimiter.js`)

**Rate Limit Types**:
- **General Limiter**: 5000 requests/10 minutes
- **Auth Limiter**: 100 requests/15 minutes
- **Assessment Limiter**: 50 requests/10 minutes
- **Admin Limiter**: 200 requests/15 minutes

**Implementation**:
```javascript
const generalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5000,
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false
});
```

### 6. Logging System (`src/middleware/asyncLogger.js`)

**Features**:
- Asynchronous logging (non-blocking)
- Multiple log levels
- Daily log rotation
- Structured JSON logging
- Request/response correlation

**Log Transports**:
- Console (development)
- File rotation (production)
- Error-specific logs
- Access logs

## 🛣️ Request Flow

### 1. Incoming Request Processing

```
Client Request
      │
      ▼
┌─────────────┐
│   Nginx     │ ← Load balancing, SSL termination
│ (Optional)  │
└─────────────┘
      │
      ▼
┌─────────────┐
│ API Gateway │
│   Express   │
└─────────────┘
      │
      ▼
┌─────────────┐
│  Security   │ ← Helmet, CORS, Compression
│ Middleware  │
└─────────────┘
      │
      ▼
┌─────────────┐
│ Body Parser │ ← JSON/URL-encoded parsing
└─────────────┘
      │
      ▼
┌─────────────┐
│   Logging   │ ← Request logging
└─────────────┘
      │
      ▼
┌─────────────┐
│Rate Limiting│ ← IP-based rate limiting
└─────────────┘
      │
      ▼
┌─────────────┐
│    Auth     │ ← JWT verification (if required)
│ Middleware  │
└─────────────┘
      │
      ▼
┌─────────────┐
│   Route     │ ← Route matching
│  Handler    │
└─────────────┘
      │
      ▼
┌─────────────┐
│   Proxy     │ ← Forward to microservice
│ Middleware  │
└─────────────┘
      │
      ▼
┌─────────────┐
│Microservice │ ← Process request
└─────────────┘
      │
      ▼
┌─────────────┐
│  Response   │ ← Return to client
│ Processing  │
└─────────────┘
```

### 2. Authentication Flow

```
Request with JWT Token
         │
         ▼
┌─────────────────┐
│ Extract Bearer  │
│     Token       │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Call Auth       │ ← POST /auth/verify-token
│ Service         │
└─────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│ Valid │ │Invalid│
│ Token │ │ Token │
└───────┘ └───────┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Attach │ │Return │
│ User  │ │ 401   │
│to Req │ │ Error │
└───────┘ └───────┘
    │
    ▼
┌───────┐
│Continue│
│to Route│
└───────┘
```

### 3. Proxy Flow

```
Authenticated Request
         │
         ▼
┌─────────────────┐
│ Route Matching  │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Service URL     │ ← Determine target service
│ Resolution      │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Connection      │ ← Get/create connection
│ Pool            │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Forward         │ ← Proxy request
│ Request         │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Microservice    │ ← Process request
│ Processing      │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Response        │ ← Forward response
│ Forwarding      │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Client          │
│ Response        │
└─────────────────┘
```

## 🔐 Security Architecture

### 1. Defense in Depth

```
┌─────────────────────────────────────────────────────────────────┐
│                      Security Layers                           │
├─────────────────────────────────────────────────────────────────┤
│ 1. Network Security (Firewall, VPN, SSL/TLS)                   │
├─────────────────────────────────────────────────────────────────┤
│ 2. Load Balancer Security (DDoS protection, Rate limiting)     │
├─────────────────────────────────────────────────────────────────┤
│ 3. API Gateway Security                                        │
│    - Helmet (Security headers)                                 │
│    - CORS (Cross-origin protection)                            │
│    - Rate limiting (Abuse protection)                          │
│    - Input validation                                           │
├─────────────────────────────────────────────────────────────────┤
│ 4. Authentication & Authorization                               │
│    - JWT token verification                                     │
│    - Role-based access control                                 │
│    - Internal service authentication                           │
├─────────────────────────────────────────────────────────────────┤
│ 5. Microservice Security                                       │
│    - Service-to-service authentication                         │
│    - Data encryption                                            │
│    - Audit logging                                              │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Authentication Mechanisms

#### JWT Token Flow
```
User Login
    │
    ▼
┌─────────────┐
│Auth Service │ ← Validate credentials
│   Issues    │
│ JWT Token   │
└─────────────┘
    │
    ▼
┌─────────────┐
│   Client    │ ← Store token
│  Receives   │
│   Token     │
└─────────────┘
    │
    ▼
┌─────────────┐
│Subsequent   │ ← Include in Authorization header
│ Requests    │
└─────────────┘
    │
    ▼
┌─────────────┐
│API Gateway  │ ← Verify token with auth service
│ Validates   │
│   Token     │
└─────────────┘
```

#### Internal Service Authentication
```
Microservice Request
         │
         ▼
┌─────────────────┐
│ Include         │ ← X-Internal-Service header
│ Service Key     │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ API Gateway     │ ← Verify service key
│ Validates Key   │
└─────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│ Valid │ │Invalid│
│  Key  │ │  Key  │
└───────┘ └───────┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Allow  │ │Return │
│Access │ │ 403   │
└───────┘ └───────┘
```

## 📊 Performance Architecture

### 1. Connection Pooling

**HTTP Agent Configuration**:
- Keep-alive connections
- Connection reuse
- Pool size optimization
- Timeout management

**Benefits**:
- Reduced connection overhead
- Better resource utilization
- Improved response times
- Lower CPU usage

### 2. Caching Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                      Caching Layers                            │
├─────────────────────────────────────────────────────────────────┤
│ 1. Browser Cache (Static assets, API responses)                │
├─────────────────────────────────────────────────────────────────┤
│ 2. CDN Cache (Global content distribution)                     │
├─────────────────────────────────────────────────────────────────┤
│ 3. Load Balancer Cache (Nginx proxy cache)                     │
├─────────────────────────────────────────────────────────────────┤
│ 4. API Gateway Cache (Response caching)                        │
├─────────────────────────────────────────────────────────────────┤
│ 5. Microservice Cache (Redis, in-memory)                       │
├─────────────────────────────────────────────────────────────────┤
│ 6. Database Cache (Query result caching)                       │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Async Processing

**Non-blocking Operations**:
- Async logging
- Async proxy requests
- Async authentication
- Async health checks

**Benefits**:
- Higher throughput
- Better resource utilization
- Improved scalability
- Reduced latency

## 🔄 Scalability Architecture

### 1. Horizontal Scaling

```
┌─────────────────────────────────────────────────────────────────┐
│                    Load Balancer                               │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  API Gateway    │     │  API Gateway    │     │  API Gateway    │
│   Instance 1    │     │   Instance 2    │     │   Instance 3    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Scaling Strategies**:
- Container orchestration (Kubernetes)
- Auto-scaling based on metrics
- Load balancing algorithms
- Session-less design

### 2. Vertical Scaling

**Resource Optimization**:
- CPU allocation
- Memory management
- Connection limits
- Thread pool sizing

### 3. Database Scaling

**Strategies**:
- Read replicas
- Connection pooling
- Query optimization
- Caching layers

## 🔍 Monitoring Architecture

### 1. Health Check System

```
┌─────────────────────────────────────────────────────────────────┐
│                    Health Check Flow                           │
├─────────────────────────────────────────────────────────────────┤
│ 1. Load Balancer Health Check                                  │
│    └─ GET /health (Basic availability)                         │
├─────────────────────────────────────────────────────────────────┤
│ 2. Kubernetes Probes                                           │
│    ├─ Liveness: GET /health/live                               │
│    └─ Readiness: GET /health/ready                             │
├─────────────────────────────────────────────────────────────────┤
│ 3. Detailed Health Check                                       │
│    └─ GET /health/detailed (Service dependencies)              │
├─────────────────────────────────────────────────────────────────┤
│ 4. Service-specific Health                                     │
│    ├─ Auth Service: GET /api/auth/health                       │
│    ├─ Archive Service: GET /api/archive/health                 │
│    └─ Assessment Service: GET /api/assessment/health           │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Metrics Collection

**Key Metrics**:
- Request rate (requests/second)
- Response time (percentiles)
- Error rate (4xx, 5xx)
- Active connections
- Memory usage
- CPU utilization

**Monitoring Tools**:
- Prometheus (metrics collection)
- Grafana (visualization)
- Winston (logging)
- New Relic (APM)

### 3. Alerting System

**Alert Categories**:
- Critical: Service down, high error rate
- Warning: High response time, resource usage
- Info: Deployment events, configuration changes

## 🚀 Deployment Architecture

### 1. Container Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Docker Container                          │
├─────────────────────────────────────────────────────────────────┤
│ Base Image: node:22-alpine                                     │
├─────────────────────────────────────────────────────────────────┤
│ Application Layer                                               │
│ ├─ Node.js Runtime                                              │
│ ├─ Application Code                                             │
│ ├─ Dependencies (node_modules)                                  │
│ └─ Configuration Files                                          │
├─────────────────────────────────────────────────────────────────┤
│ Security Layer                                                  │
│ ├─ Non-root user (nodejs:1001)                                 │
│ ├─ Minimal attack surface                                       │
│ └─ Security scanning                                            │
├─────────────────────────────────────────────────────────────────┤
│ Monitoring Layer                                                │
│ ├─ Health check endpoint                                        │
│ ├─ Logging configuration                                        │
│ └─ Metrics exposure                                             │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Kubernetes Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                          │
├─────────────────────────────────────────────────────────────────┤
│ Ingress Controller (Nginx)                                     │
│ ├─ SSL termination                                              │
│ ├─ Load balancing                                               │
│ └─ Rate limiting                                                │
├─────────────────────────────────────────────────────────────────┤
│ Service (LoadBalancer)                                          │
│ ├─ Service discovery                                            │
│ ├─ Load balancing                                               │
│ └─ Health checking                                              │
├─────────────────────────────────────────────────────────────────┤
│ Deployment (ReplicaSet)                                         │
│ ├─ Pod replicas (3x)                                            │
│ ├─ Rolling updates                                              │
│ ├─ Auto-scaling                                                 │
│ └─ Resource limits                                              │
├─────────────────────────────────────────────────────────────────┤
│ ConfigMap & Secrets                                             │
│ ├─ Environment variables                                        │
│ ├─ Configuration files                                          │
│ └─ Sensitive data                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

**Last Updated**: 2024-01-01  
**Version**: 1.0.0  
**Architecture Version**: 1.0
