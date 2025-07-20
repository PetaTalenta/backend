# 🚀 API Gateway Optimization Plan

## Overview
Rencana implementasi optimisasi untuk **Proxy Configuration** dan **Async Logging** pada ATMA API Gateway untuk meningkatkan performa dan mengurangi bottleneck.

---

## 1. 🔄 Optimasi Proxy Configuration

### 1.1 Masalah Saat Ini

#### File: `src/middleware/proxy.js`
- **Timeout terlalu lama**: 30 detik untuk semua request
- **Tidak ada connection pooling**: Setiap request membuat koneksi baru
- **Double body parsing**: Body di-parse di gateway kemudian di-stringify lagi
- **Logging synchronous**: Setiap proxy request di-log secara blocking

### 1.2 Perubahan yang Akan Dilakukan

#### A. Connection Pooling Implementation
```javascript
// Tambah di bagian atas proxy.js
const http = require('http');
const https = require('https');

// HTTP Agent dengan connection pooling
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,        // Max concurrent connections per host
  maxFreeSockets: 10,    // Max idle connections per host
  timeout: 5000,         // Socket timeout
  freeSocketTimeout: 30000 // Idle socket timeout
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 5000,
  freeSocketTimeout: 30000
});
```

#### B. Timeout Optimization
```javascript
// Ganti timeout configuration
const createServiceProxy = (serviceUrl, options = {}) => {
  return createProxyMiddleware({
    target: serviceUrl,
    changeOrigin: true,
    timeout: 5000,          // Reduced from 30s to 5s
    proxyTimeout: 5000,     // Reduced from 30s to 5s
    agent: serviceUrl.startsWith('https') ? httpsAgent : httpAgent,
    
    // Optimize body handling
    parseReqBody: false,    // Avoid double parsing
    buffer: require('stream').PassThrough,
    
    // ... rest of config
  });
};
```

#### C. Request/Response Optimization
```javascript
// Optimized onProxyReq
onProxyReq: (proxyReq, req, res) => {
  // Minimal logging (akan dipindah ke async)
  
  // Essential headers only
  proxyReq.setHeader('X-Forwarded-For', req.ip);
  proxyReq.setHeader('X-Original-Host', req.get('host'));
  
  // User info (if available)
  if (req.user?.id) {
    proxyReq.setHeader('X-User-ID', req.user.id);
    proxyReq.setHeader('X-User-Type', req.user.user_type || 'user');
  }
  
  // Internal service flag
  if (req.isInternalService) {
    proxyReq.setHeader('X-Internal-Service', 'true');
  }
  
  // Remove body handling (let proxy handle it directly)
},

// Optimized onProxyRes
onProxyRes: (proxyRes, req, res) => {
  // Minimal response headers
  proxyRes.headers['X-Gateway'] = 'ATMA-API-Gateway';
  proxyRes.headers['X-Gateway-Version'] = '1.0.0';
  
  // Async logging akan handle response logging
},
```

### 1.3 Tujuan Optimisasi

1. **Mengurangi Latency**: Timeout 5 detik vs 30 detik sebelumnya
2. **Meningkatkan Throughput**: Connection pooling mengurangi overhead koneksi
3. **Mengurangi Memory Usage**: Avoid double body parsing
4. **Meningkatkan Reliability**: Better error handling dengan timeout yang realistis

### 1.4 Efek yang Diharapkan

- **Latency**: Berkurang 60-80% untuk request normal
- **Throughput**: Meningkat 30-50% dengan connection pooling
- **Memory**: Berkurang 20-30% dengan menghindari double parsing
- **Error Rate**: Berkurang dengan timeout yang lebih realistis

### 1.5 Yang Harus Diperhatikan

⚠️ **Risiko dan Mitigasi:**

1. **Timeout terlalu pendek**: Monitor error rate, adjust jika perlu
2. **Connection pool exhaustion**: Monitor active connections
3. **Memory leaks**: Implement proper cleanup untuk agents
4. **Service compatibility**: Test dengan semua backend services

---

## 2. 📝 Implementasi Async Logging

### 2.1 Masalah Saat Ini

#### File: `src/app.js` dan `src/middleware/proxy.js`
- **Morgan logging synchronous**: Blocking I/O untuk setiap request
- **Console.log blocking**: Error logging menggunakan console.log
- **No structured logging**: Sulit untuk monitoring dan debugging
- **No log rotation**: Log files bisa membesar tanpa batas

### 2.2 Perubahan yang Akan Dilakukan

#### A. Winston Logger Implementation
```javascript
// File baru: src/middleware/asyncLogger.js
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Daily rotating file
    new DailyRotateFile({
      filename: 'logs/gateway-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info'
    }),
    
    // Error file
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error'
    })
  ]
});

// Console transport for development
if (process.env.NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}
```

#### B. Async Request Logger Middleware
```javascript
// Async request logging middleware
const asyncRequestLogger = (req, res, next) => {
  const startTime = Date.now();
  const startHrTime = process.hrtime();
  
  // Capture request info
  const requestInfo = {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    userType: req.user?.user_type,
    isInternal: req.isInternalService,
    timestamp: new Date().toISOString()
  };
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const hrDuration = process.hrtime(startHrTime);
    const hrDurationMs = hrDuration[0] * 1000 + hrDuration[1] / 1e6;
    
    // Async logging (non-blocking)
    setImmediate(() => {
      logger.info({
        type: 'request',
        ...requestInfo,
        statusCode: res.statusCode,
        duration: duration,
        hrDuration: hrDurationMs,
        contentLength: res.get('Content-Length')
      });
    });
  });
  
  // Log errors
  res.on('error', (error) => {
    setImmediate(() => {
      logger.error({
        type: 'request_error',
        ...requestInfo,
        error: error.message,
        stack: error.stack
      });
    });
  });
  
  next();
};
```

#### C. Async Proxy Logger
```javascript
// File: src/middleware/asyncProxyLogger.js
const { logger } = require('./asyncLogger');

const logProxyRequest = (serviceUrl, req) => {
  setImmediate(() => {
    logger.info({
      type: 'proxy_request',
      service: serviceUrl,
      method: req.method,
      url: req.url,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
  });
};

const logProxyResponse = (serviceUrl, req, proxyRes, duration) => {
  setImmediate(() => {
    logger.info({
      type: 'proxy_response',
      service: serviceUrl,
      method: req.method,
      url: req.url,
      statusCode: proxyRes.statusCode,
      duration: duration,
      timestamp: new Date().toISOString()
    });
  });
};

const logProxyError = (serviceUrl, req, error) => {
  setImmediate(() => {
    logger.error({
      type: 'proxy_error',
      service: serviceUrl,
      method: req.method,
      url: req.url,
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
  });
};

module.exports = {
  logProxyRequest,
  logProxyResponse,
  logProxyError
};
```

### 2.3 Tujuan Async Logging

1. **Non-blocking I/O**: Logging tidak memperlambat response time
2. **Structured Logging**: JSON format untuk easy parsing dan monitoring
3. **Log Rotation**: Automatic log rotation untuk mencegah disk full
4. **Better Monitoring**: Structured logs untuk metrics dan alerting

### 2.4 Efek yang Diharapkan

- **Response Time**: Berkurang 10-20% dengan menghilangkan blocking I/O
- **Throughput**: Meningkat 15-25% dengan async logging
- **Disk Management**: Automatic rotation mencegah disk issues
- **Monitoring**: Better observability dengan structured logs

### 2.5 Yang Harus Diperhatikan

⚠️ **Risiko dan Mitigasi:**

1. **Memory usage**: Async logging bisa menggunakan lebih banyak memory
2. **Log loss**: Implement graceful shutdown untuk flush logs
3. **Disk space**: Monitor log rotation dan disk usage
4. **Performance monitoring**: Track logging performance impact

---

## 3. 📋 Implementation Steps

### Phase 1: Proxy Optimization (Week 1)
1. **Day 1-2**: Implement connection pooling
2. **Day 3-4**: Optimize timeout settings
3. **Day 5**: Testing dan performance measurement
4. **Day 6-7**: Bug fixes dan fine-tuning

### Phase 2: Async Logging (Week 2)
1. **Day 1-2**: Setup Winston dan async logger
2. **Day 3-4**: Replace Morgan dengan async request logger
3. **Day 5**: Implement proxy async logging
4. **Day 6-7**: Testing dan monitoring setup

### Phase 3: Monitoring & Validation (Week 3)
1. **Day 1-3**: Performance testing
2. **Day 4-5**: Load testing dengan optimisasi
3. **Day 6-7**: Documentation dan deployment preparation

---

## 4. 🧪 Testing Strategy

### Performance Testing
```bash
# Before optimization
ab -n 10000 -c 100 http://localhost:3000/api/auth/profile

# After optimization
ab -n 10000 -c 100 http://localhost:3000/api/auth/profile
```

### Load Testing
```bash
# Artillery.js testing
artillery run load-test.yml
```

### Monitoring Metrics
- Response time percentiles (p50, p95, p99)
- Throughput (requests/second)
- Error rate
- Memory usage
- CPU usage
- Active connections

---

## 5. 📊 Success Criteria

### Performance Targets
- **Response Time**: Reduce average response time by 30%
- **Throughput**: Increase requests/second by 40%
- **Error Rate**: Maintain <1% error rate
- **Memory**: No significant memory increase (max 10%)

### Monitoring Targets
- **Log Processing**: <1ms average logging time
- **Disk Usage**: Controlled growth with rotation
- **Observability**: 100% request/response logging coverage

---

## 6. 🚨 Rollback Plan

### Rollback Triggers
- Error rate >5%
- Response time increase >50%
- Memory usage increase >30%
- Service unavailability

### Rollback Steps
1. Revert to previous proxy configuration
2. Disable async logging, fallback to Morgan
3. Monitor system recovery
4. Investigate issues

---

## 7. 📝 Dependencies

### New Dependencies
```json
{
  "winston": "^3.11.0",
  "winston-daily-rotate-file": "^4.7.1"
}
```

### Configuration Changes
- Add log directory creation
- Environment variables for log levels
- Connection pool configuration

---

*Dokumen ini akan diupdate seiring dengan progress implementasi.*
