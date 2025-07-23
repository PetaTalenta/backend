# Phase 5: Performance Optimization & Production Monitoring

## 🎯 Tujuan Fase

**Mengoptimalkan performa sistem dan mengimplementasikan comprehensive monitoring** dengan fokus pada:
- Production-ready performance optimization
- Comprehensive monitoring dan alerting system
- Scalability improvements untuk high-volume usage
- Cost optimization dan resource management
- Production deployment dan DevOps automation

**Mengapa Fase Ini Penting:**
- Memastikan sistem siap untuk production load
- Memberikan visibility penuh terhadap system health dan performance
- Mengoptimalkan cost efficiency dengan free models
- Membangun foundation untuk long-term scalability dan maintenance

## 🏗️ Komponen Utama

### 1. Performance Optimization
- **Database Query Optimization**: Indexing strategy dan query performance
- **Connection Pooling**: Optimal database connection management
- **Caching Strategy**: Redis caching untuk frequent data
- **Free Model Performance**: Optimization khusus untuk free model usage

### 2. Comprehensive Monitoring
- **Prometheus Metrics**: Custom metrics untuk chatbot-specific KPIs
- **Health Check System**: Multi-level health monitoring
- **Performance Analytics**: Response time, throughput, error rate tracking
- **Cost Analytics**: Token usage dan cost optimization insights

### 3. Production Deployment
- **Docker Optimization**: Production-ready containerization
- **Load Balancing**: Horizontal scaling preparation
- **CI/CD Pipeline**: Automated testing dan deployment
- **Environment Management**: Production, staging, development environments

### 4. Alerting & Observability
- **Alert System**: Proactive monitoring dengan intelligent alerting
- **Log Aggregation**: Centralized logging dengan structured data
- **Error Tracking**: Comprehensive error monitoring dan resolution
- **User Analytics**: Usage patterns dan engagement metrics

## 📋 Implementasi Detail

### Performance Metrics Collection
```javascript
// src/middleware/performanceMetrics.js
const prometheus = require('prom-client');

// Custom metrics for chatbot service
const httpRequestDuration = new prometheus.Histogram({
  name: 'chatbot_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const openrouterRequestsTotal = new prometheus.Counter({
  name: 'chatbot_openrouter_requests_total',
  help: 'Total number of requests to OpenRouter API',
  labelNames: ['model', 'status', 'is_free_model']
});

const tokenUsageTotal = new prometheus.Counter({
  name: 'chatbot_token_usage_total',
  help: 'Total tokens used',
  labelNames: ['model', 'type', 'user_tier'] // type: prompt, completion
});

const conversationsActive = new prometheus.Gauge({
  name: 'chatbot_conversations_active_total',
  help: 'Number of active conversations'
});

const messageResponseTime = new prometheus.Histogram({
  name: 'chatbot_message_response_time_seconds',
  help: 'Time to generate AI response',
  labelNames: ['model', 'context_type'],
  buckets: [1, 2, 5, 10, 15, 30, 60]
});

const freeModelUsageEfficiency = new prometheus.Gauge({
  name: 'chatbot_free_model_efficiency_ratio',
  help: 'Ratio of free model usage vs total usage',
  labelNames: ['time_period']
});

// Middleware to collect HTTP metrics
const collectHttpMetrics = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
};

// Function to update OpenRouter metrics
const recordOpenRouterRequest = (model, status, responseTime, isFreeModel) => {
  openrouterRequestsTotal
    .labels(model, status, isFreeModel.toString())
    .inc();
    
  messageResponseTime
    .labels(model, 'general')
    .observe(responseTime / 1000);
};

// Function to update token usage
const recordTokenUsage = (model, promptTokens, completionTokens, userTier = 'free') => {
  tokenUsageTotal
    .labels(model, 'prompt', userTier)
    .inc(promptTokens);
    
  tokenUsageTotal
    .labels(model, 'completion', userTier)
    .inc(completionTokens);
};

module.exports = {
  collectHttpMetrics,
  recordOpenRouterRequest,
  recordTokenUsage,
  httpRequestDuration,
  openrouterRequestsTotal,
  tokenUsageTotal,
  conversationsActive,
  messageResponseTime,
  freeModelUsageEfficiency,
  register: prometheus.register
};
```

### Advanced Health Check System
```javascript
// src/routes/healthCheck.js
const express = require('express');
const router = express.Router();
const database = require('../config/database');
const openrouterService = require('../services/openrouterService');
const queueService = require('../services/queueService');
const redis = require('../config/redis');

class HealthCheckService {
  async performHealthCheck(includeExternal = false) {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'chatbot-service',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      dependencies: {},
      performance: {}
    };

    try {
      // Database health check
      const dbStart = Date.now();
      await database.authenticate();
      health.dependencies.database = {
        status: 'healthy',
        responseTime: Date.now() - dbStart
      };
    } catch (error) {
      health.dependencies.database = {
        status: 'unhealthy',
        error: error.message
      };
      health.status = 'degraded';
    }

    try {
      // Redis health check
      const redisStart = Date.now();
      await redis.ping();
      health.dependencies.redis = {
        status: 'healthy',
        responseTime: Date.now() - redisStart
      };
    } catch (error) {
      health.dependencies.redis = {
        status: 'unhealthy',
        error: error.message
      };
      health.status = 'degraded';
    }

    try {
      // RabbitMQ health check
      const queueStart = Date.now();
      const queueStatus = await queueService.checkConnection();
      health.dependencies.rabbitmq = {
        status: queueStatus ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - queueStart
      };
    } catch (error) {
      health.dependencies.rabbitmq = {
        status: 'unhealthy',
        error: error.message
      };
      health.status = 'degraded';
    }

    // Performance metrics
    health.performance = {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      activeConnections: await this.getActiveConnections(),
      averageResponseTime: await this.getAverageResponseTime()
    };

    // External service checks (optional, expensive)
    if (includeExternal) {
      try {
        const openrouterStart = Date.now();
        await openrouterService.generateResponse([
          { role: 'user', content: 'health check' }
        ], { maxTokens: 1 });
        health.dependencies.openrouter = {
          status: 'healthy',
          responseTime: Date.now() - openrouterStart
        };
      } catch (error) {
        health.dependencies.openrouter = {
          status: 'unhealthy',
          error: error.message
        };
        health.status = 'degraded';
      }
    }

    return health;
  }

  async getActiveConnections() {
    try {
      const result = await database.query(
        'SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = \'active\''
      );
      return parseInt(result[0][0].active_connections);
    } catch (error) {
      return 0;
    }
  }

  async getAverageResponseTime() {
    try {
      const result = await database.query(`
        SELECT AVG(processing_time_ms) as avg_response_time 
        FROM chat.usage_tracking 
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `);
      return parseFloat(result[0][0].avg_response_time) || 0;
    } catch (error) {
      return 0;
    }
  }
}

const healthCheckService = new HealthCheckService();

// Basic health check
router.get('/health', async (req, res) => {
  try {
    const health = await healthCheckService.performHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Detailed health check with external services
router.get('/health/detailed', async (req, res) => {
  try {
    const health = await healthCheckService.performHealthCheck(true);
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness probe (simple)
router.get('/health/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Readiness probe
router.get('/health/ready', async (req, res) => {
  try {
    await database.authenticate();
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Metrics endpoint for Prometheus
router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', prometheus.register.contentType);
    res.end(await prometheus.register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
});

module.exports = router;
```

### Database Performance Optimization
```sql
-- Database optimization queries
-- migrations/002_performance_optimization.sql

-- Additional indexes for performance
CREATE INDEX CONCURRENTLY idx_conversations_context_type_status 
ON chat.conversations(context_type, status) WHERE status = 'active';

CREATE INDEX CONCURRENTLY idx_messages_conversation_created 
ON chat.messages(conversation_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_usage_tracking_model_created 
ON chat.usage_tracking(model_used, created_at);

CREATE INDEX CONCURRENTLY idx_messages_content_search 
ON chat.messages USING gin(to_tsvector('english', content));

-- Partitioning for large tables (future-proofing)
-- Partition messages table by month
CREATE TABLE chat.messages_y2024m01 PARTITION OF chat.messages
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE chat.messages_y2024m02 PARTITION OF chat.messages
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Add more partitions as needed

-- Performance monitoring views
CREATE OR REPLACE VIEW chat.conversation_stats AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    context_type,
    COUNT(*) as conversation_count,
    COUNT(DISTINCT user_id) as unique_users
FROM chat.conversations 
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), context_type
ORDER BY date DESC;

CREATE OR REPLACE VIEW chat.usage_stats AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    model_used,
    COUNT(*) as request_count,
    SUM(total_tokens) as total_tokens,
    AVG(processing_time_ms) as avg_processing_time,
    SUM(CASE WHEN is_free_model THEN 1 ELSE 0 END) as free_model_requests
FROM chat.usage_tracking 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), model_used
ORDER BY hour DESC;
```

### Production Docker Configuration
```dockerfile
# chatbot-service/Dockerfile.production
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY migrations/ ./migrations/

# Production image
FROM node:22-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S chatbot -u 1001

WORKDIR /app

# Copy from builder
COPY --from=builder --chown=chatbot:nodejs /app .

# Create logs directory
RUN mkdir -p logs && chown chatbot:nodejs logs

# Switch to non-root user
USER chatbot

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3006/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

EXPOSE 3006

CMD ["node", "src/app.js"]
```

### Load Testing Configuration
```javascript
// tests/load/production-load.test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export let errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '5m', target: 50 },   // Ramp up to 50 users
    { duration: '10m', target: 100 }, // Stay at 100 users
    { duration: '5m', target: 200 },  // Ramp up to 200 users
    { duration: '10m', target: 200 }, // Stay at 200 users
    { duration: '5m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests under 5s
    http_req_failed: ['rate<0.1'],     // Error rate under 10%
    errors: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

export default function() {
  // Test conversation creation
  let conversationResponse = http.post(
    `${BASE_URL}/api/chat/conversations`,
    JSON.stringify({
      title: 'Load Test Conversation',
      context_type: 'general'
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
    }
  );

  let conversationCheck = check(conversationResponse, {
    'conversation created': (r) => r.status === 201,
    'conversation has id': (r) => JSON.parse(r.body).id !== undefined,
  });

  errorRate.add(!conversationCheck);

  if (conversationCheck) {
    const conversationId = JSON.parse(conversationResponse.body).id;

    // Test message sending
    let messageResponse = http.post(
      `${BASE_URL}/api/chat/conversations/${conversationId}/messages`,
      JSON.stringify({
        content: 'What career advice can you give me for someone interested in technology?'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
      }
    );

    let messageCheck = check(messageResponse, {
      'message sent': (r) => r.status === 200,
      'got AI response': (r) => JSON.parse(r.body).assistant_message !== undefined,
      'response time acceptable': (r) => r.timings.duration < 10000,
    });

    errorRate.add(!messageCheck);
  }

  sleep(1);
}

export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    stdout: `
    Load Test Summary:
    - Average Response Time: ${data.metrics.http_req_duration.values.avg}ms
    - 95th Percentile: ${data.metrics.http_req_duration.values['p(95)']}ms
    - Error Rate: ${data.metrics.http_req_failed.values.rate * 100}%
    - Total Requests: ${data.metrics.http_reqs.values.count}
    `,
  };
}
```

## 🔗 Dependencies

**Prerequisites dari Phase 4:**
- Real-time notifications working
- Advanced chatbot features implemented
- WebSocket infrastructure
- Analytics foundation

**External Services:**
- **Prometheus**: Untuk metrics collection
- **Grafana**: Untuk monitoring dashboards
- **Redis**: Untuk caching dan session management
- **Load Balancer**: Untuk production traffic distribution

## 📦 Deliverables

### ✅ Yang Harus Diselesaikan:

1. **Performance Optimization**
   - Database query optimization dengan advanced indexing
   - Connection pooling optimization
   - Redis caching implementation
   - Free model performance tuning

2. **Comprehensive Monitoring**
   - Prometheus metrics collection
   - Custom chatbot-specific KPIs
   - Performance analytics dashboard
   - Cost optimization insights

3. **Production Deployment**
   - Production-ready Docker configuration
   - CI/CD pipeline setup
   - Environment management (prod/staging/dev)
   - Load balancing preparation

4. **Alerting & Observability**
   - Intelligent alerting system
   - Centralized logging dengan structured data
   - Error tracking dan resolution workflows
   - User analytics dan engagement metrics

5. **Load Testing & Validation**
   - Comprehensive load testing scenarios
   - Performance benchmarking
   - Scalability validation
   - Production readiness checklist

## 🚀 Pengembangan Selanjutnya

**Post-Production Enhancements:**
- **Auto-scaling**: Kubernetes-based auto-scaling berdasarkan metrics
- **Advanced Analytics**: ML-based usage pattern analysis
- **Cost Optimization**: Dynamic model selection berdasarkan load
- **Feature Expansion**: Advanced AI features berdasarkan user feedback

**Long-term Roadmap:**
- **Multi-region Deployment**: Global availability dengan edge caching
- **Advanced Personalization**: ML-based conversation personalization
- **Integration Expansion**: Third-party career platform integrations
- **Enterprise Features**: White-label solutions dan enterprise APIs

## ⏱️ Timeline & Resources

**Estimasi Waktu:** 3-4 minggu
**Team Requirements:**
- 1 Senior Backend Developer (performance optimization)
- 1 DevOps Engineer (monitoring dan deployment)
- 1 QA Engineer (load testing dan validation)

**Milestones:**
- **Week 1**: Performance optimization dan database tuning
- **Week 2**: Monitoring system dan metrics implementation
- **Week 3**: Production deployment preparation
- **Week 4**: Load testing, validation, documentation

**Success Criteria:**
- System handling 1000+ concurrent users
- 95th percentile response time <5 seconds
- 99.9% uptime dengan comprehensive monitoring
- Cost efficiency >90% dengan free models
- Production deployment successful dengan zero downtime

---

**🎯 Outcome:** Production-ready, highly scalable chatbot service dengan comprehensive monitoring, optimal performance, dan cost-efficient operation menggunakan free models.
