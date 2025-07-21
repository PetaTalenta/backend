const promClient = require('prom-client');
const logger = require('../utils/logger');

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({
  register,
  prefix: 'auth_service_'
});

// Custom metrics for auth service
const httpRequestDuration = new promClient.Histogram({
  name: 'auth_service_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5]
});

const httpRequestTotal = new promClient.Counter({
  name: 'auth_service_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const authOperationDuration = new promClient.Histogram({
  name: 'auth_service_auth_operation_duration_seconds',
  help: 'Duration of authentication operations in seconds',
  labelNames: ['operation', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2]
});

const authOperationTotal = new promClient.Counter({
  name: 'auth_service_auth_operations_total',
  help: 'Total number of authentication operations',
  labelNames: ['operation', 'status']
});

const cacheOperations = new promClient.Counter({
  name: 'auth_service_cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'status']
});

const cacheHitRatio = new promClient.Gauge({
  name: 'auth_service_cache_hit_ratio',
  help: 'Cache hit ratio percentage',
  labelNames: ['cache_type']
});

const databaseConnectionPool = new promClient.Gauge({
  name: 'auth_service_db_pool_connections',
  help: 'Database connection pool status',
  labelNames: ['status']
});

const passwordHashingDuration = new promClient.Histogram({
  name: 'auth_service_password_hashing_duration_seconds',
  help: 'Duration of password hashing operations in seconds',
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1]
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(authOperationDuration);
register.registerMetric(authOperationTotal);
register.registerMetric(cacheOperations);
register.registerMetric(cacheHitRatio);
register.registerMetric(databaseConnectionPool);
register.registerMetric(passwordHashingDuration);

/**
 * Middleware to collect HTTP request metrics
 */
const collectHttpMetrics = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to capture metrics when response is sent
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = (Date.now() - startTime) / 1000;
    const route = req.route ? req.route.path : req.path;
    const method = req.method;
    const statusCode = res.statusCode.toString();

    // Record metrics
    httpRequestDuration
      .labels(method, route, statusCode)
      .observe(duration);

    httpRequestTotal
      .labels(method, route, statusCode)
      .inc();

    // Log slow requests
    if (duration > 1) {
      logger.warn('Slow HTTP request detected', {
        method,
        route,
        statusCode,
        duration: `${duration.toFixed(3)}s`,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    }

    originalEnd.apply(this, args);
  };

  next();
};

/**
 * Record authentication operation metrics
 * @param {string} operation - Operation name (login, register, verify, etc.)
 * @param {number} duration - Duration in milliseconds
 * @param {string} status - Operation status (success, failure)
 */
const recordAuthOperation = (operation, duration, status = 'success') => {
  const durationSeconds = duration / 1000;
  
  authOperationDuration
    .labels(operation, status)
    .observe(durationSeconds);

  authOperationTotal
    .labels(operation, status)
    .inc();

  // Log performance warnings
  const thresholds = {
    login: 0.15,      // 150ms
    register: 0.2,    // 200ms
    verify: 0.05,     // 50ms
    hash: 0.1         // 100ms
  };

  if (durationSeconds > (thresholds[operation] || 0.5)) {
    logger.warn('Slow auth operation detected', {
      operation,
      duration: `${durationSeconds.toFixed(3)}s`,
      status,
      threshold: `${thresholds[operation] || 0.5}s`
    });
  }
};

/**
 * Record cache operation metrics
 * @param {string} operation - Operation name (get, set, del)
 * @param {string} status - Operation status (hit, miss, success, failure)
 */
const recordCacheOperation = (operation, status) => {
  cacheOperations
    .labels(operation, status)
    .inc();
};

/**
 * Update cache hit ratio
 * @param {string} cacheType - Type of cache (redis, memory)
 * @param {number} ratio - Hit ratio percentage (0-100)
 */
const updateCacheHitRatio = (cacheType, ratio) => {
  cacheHitRatio
    .labels(cacheType)
    .set(ratio);
};

/**
 * Update database connection pool metrics
 * @param {Object} poolStatus - Pool status object
 */
const updateDatabasePoolMetrics = (poolStatus) => {
  if (poolStatus) {
    databaseConnectionPool.labels('total').set(poolStatus.size || 0);
    databaseConnectionPool.labels('available').set(poolStatus.available || 0);
    databaseConnectionPool.labels('using').set(poolStatus.using || 0);
    databaseConnectionPool.labels('waiting').set(poolStatus.waiting || 0);
  }
};

/**
 * Record password hashing duration
 * @param {number} duration - Duration in milliseconds
 */
const recordPasswordHashing = (duration) => {
  const durationSeconds = duration / 1000;
  passwordHashingDuration.observe(durationSeconds);
};

/**
 * Get metrics endpoint handler
 */
const getMetrics = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Failed to generate metrics', {
      error: error.message
    });
    res.status(500).end('Error generating metrics');
  }
};

/**
 * Collect system metrics periodically
 */
const collectSystemMetrics = () => {
  // Collect database pool metrics
  try {
    const { getPoolStatus } = require('../config/database');
    if (typeof getPoolStatus === 'function') {
      const poolStatus = getPoolStatus();
      updateDatabasePoolMetrics(poolStatus);
    }
  } catch (error) {
    logger.debug('Could not collect database pool metrics', {
      error: error.message
    });
  }

  // Collect cache metrics
  try {
    const cacheService = require('../services/cacheService');
    const userCacheService = require('../services/userCacheService');
    
    if (cacheService.isAvailable()) {
      recordCacheOperation('health_check', 'available');
    } else {
      recordCacheOperation('health_check', 'unavailable');
    }

    if (userCacheService.isAvailable()) {
      const stats = userCacheService.getStats();
      if (stats.hitRatio !== undefined) {
        updateCacheHitRatio('memory', stats.hitRatio);
      }
    }
  } catch (error) {
    logger.debug('Could not collect cache metrics', {
      error: error.message
    });
  }
};

// Start periodic metrics collection if monitoring is enabled
if (process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
  setInterval(collectSystemMetrics, 30000); // Every 30 seconds
  logger.info('Performance monitoring enabled', {
    interval: '30s',
    metricsEndpoint: '/metrics'
  });
}

module.exports = {
  collectHttpMetrics,
  recordAuthOperation,
  recordCacheOperation,
  updateCacheHitRatio,
  updateDatabasePoolMetrics,
  recordPasswordHashing,
  getMetrics,
  register
};
