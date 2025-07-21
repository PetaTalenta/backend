/**
 * Metrics Collection Middleware
 * Phase 2.4: Enhanced Monitoring
 */

const logger = require('../utils/logger');

class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        byMethod: {},
        byRoute: {},
        byStatus: {}
      },
      responseTime: {
        total: 0,
        count: 0,
        min: Infinity,
        max: 0,
        avg: 0
      },
      errors: {
        total: 0,
        byType: {},
        byRoute: {}
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      }
    };
    
    this.startTime = Date.now();
  }

  /**
   * Record request metrics
   */
  recordRequest(method, route, statusCode, responseTime) {
    // Total requests
    this.metrics.requests.total++;
    
    // By method
    this.metrics.requests.byMethod[method] = (this.metrics.requests.byMethod[method] || 0) + 1;
    
    // By route
    this.metrics.requests.byRoute[route] = (this.metrics.requests.byRoute[route] || 0) + 1;
    
    // By status
    this.metrics.requests.byStatus[statusCode] = (this.metrics.requests.byStatus[statusCode] || 0) + 1;
    
    // Response time
    this.metrics.responseTime.total += responseTime;
    this.metrics.responseTime.count++;
    this.metrics.responseTime.min = Math.min(this.metrics.responseTime.min, responseTime);
    this.metrics.responseTime.max = Math.max(this.metrics.responseTime.max, responseTime);
    this.metrics.responseTime.avg = this.metrics.responseTime.total / this.metrics.responseTime.count;
    
    // Errors
    if (statusCode >= 400) {
      this.metrics.errors.total++;
      const errorType = statusCode >= 500 ? 'server' : 'client';
      this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;
      this.metrics.errors.byRoute[route] = (this.metrics.errors.byRoute[route] || 0) + 1;
    }
  }

  /**
   * Record cache metrics
   */
  recordCacheHit() {
    this.metrics.cache.hits++;
    this.updateCacheHitRate();
  }

  recordCacheMiss() {
    this.metrics.cache.misses++;
    this.updateCacheHitRate();
  }

  updateCacheHitRate() {
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = total > 0 ? (this.metrics.cache.hits / total * 100).toFixed(2) : 0;
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    
    return {
      ...this.metrics,
      uptime: {
        ms: uptime,
        seconds: Math.floor(uptime / 1000),
        minutes: Math.floor(uptime / 60000),
        hours: Math.floor(uptime / 3600000)
      },
      timestamp: new Date()
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        byMethod: {},
        byRoute: {},
        byStatus: {}
      },
      responseTime: {
        total: 0,
        count: 0,
        min: Infinity,
        max: 0,
        avg: 0
      },
      errors: {
        total: 0,
        byType: {},
        byRoute: {}
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      }
    };
    this.startTime = Date.now();
  }
}

// Create singleton instance
const metricsCollector = new MetricsCollector();

/**
 * Metrics collection middleware
 */
const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Store start time in request
  req.startTime = startTime;
  
  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    const route = req.route ? req.route.path : req.path;
    
    // Record metrics
    metricsCollector.recordRequest(
      req.method,
      route,
      res.statusCode,
      responseTime
    );
    
    // Log slow requests
    if (responseTime > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        route: route,
        responseTime: responseTime,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    }
    
    // Call original end
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Cache metrics middleware
 */
const cacheMetricsMiddleware = (req, res, next) => {
  // Add cache hit/miss recording functions to request
  req.recordCacheHit = () => metricsCollector.recordCacheHit();
  req.recordCacheMiss = () => metricsCollector.recordCacheMiss();
  
  next();
};

/**
 * Get metrics endpoint handler
 */
const getMetrics = (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_ERROR',
        message: 'Failed to retrieve metrics'
      }
    });
  }
};

/**
 * Reset metrics endpoint handler
 */
const resetMetrics = (req, res) => {
  try {
    metricsCollector.reset();
    
    res.json({
      success: true,
      message: 'Metrics reset successfully',
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error resetting metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_RESET_ERROR',
        message: 'Failed to reset metrics'
      }
    });
  }
};

/**
 * Health check with metrics
 */
const healthCheck = async (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    const cacheService = require('../services/cacheService');
    const DatabaseMonitor = require('../utils/dbMonitor');
    const { sequelize } = require('../config/database');
    
    const dbMonitor = new DatabaseMonitor(sequelize);
    const [dbHealth, cacheStats] = await Promise.all([
      dbMonitor.getConnectionPoolStats(),
      cacheService.getStats()
    ]);
    
    const health = {
      status: 'healthy',
      services: {
        database: dbHealth ? 'connected' : 'disconnected',
        cache: cacheService.isAvailable() ? 'connected' : 'disconnected'
      },
      metrics: {
        requests: metrics.requests.total,
        errors: metrics.errors.total,
        avgResponseTime: metrics.responseTime.avg,
        cacheHitRate: metrics.cache.hitRate,
        uptime: metrics.uptime
      },
      details: {
        database: dbHealth,
        cache: cacheStats
      },
      timestamp: new Date()
    };
    
    // Determine overall health status
    if (!dbHealth || !cacheService.isAvailable()) {
      health.status = 'degraded';
    }
    
    if (metrics.errors.total / metrics.requests.total > 0.1) {
      health.status = 'unhealthy';
    }
    
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Error in health check', { error: error.message });
    res.status(503).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_ERROR',
        message: 'Health check failed'
      }
    });
  }
};

module.exports = {
  metricsMiddleware,
  cacheMetricsMiddleware,
  getMetrics,
  resetMetrics,
  healthCheck,
  metricsCollector
};
