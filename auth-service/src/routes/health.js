const express = require('express');
const logger = require('../utils/logger');
const cacheService = require('../services/cacheService');
const userCacheService = require('../services/userCacheService');
const { testConnection, getPoolStatus } = require('../config/database');
const { getMetrics } = require('../middleware/metricsMiddleware');
const pkg = require('../../package.json');

const router = express.Router();

/**
 * Basic health check endpoint
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();

  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: pkg.version,
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: await checkDatabaseHealth(),
        cache: await checkCacheHealth(),
        userCache: checkUserCacheHealth()
      },
      system: {
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version
      }
    };

    // Determine overall health status based on critical services only
    // Only database is considered critical - cache and userCache are optional
    const criticalServices = ['database'];
    const hasCriticalFailure = criticalServices.some(serviceName => {
      const service = health.services[serviceName];
      return service && (service.status === 'unhealthy' || service.status === 'critical');
    });

    if (hasCriticalFailure) {
      health.status = 'unhealthy';
      res.status(503); // Service Unavailable
    } else {
      // Check if any service is degraded (like cache unavailable)
      const serviceStatuses = Object.values(health.services);
      const hasDegradedService = serviceStatuses.some(service =>
        service.status === 'degraded'
      );

      if (hasDegradedService) {
        health.status = 'degraded';
        res.status(200); // Still healthy, just degraded performance
      } else {
        health.status = 'healthy';
        res.status(200);
      }
    }

    const duration = Date.now() - startTime;
    health.responseTime = `${duration}ms`;

    logger.debug('Health check completed', {
      status: health.status,
      duration,
      services: Object.keys(health.services).map(key => ({
        name: key,
        status: health.services[key].status
      }))
    });

    res.json(health);
  } catch (error) {
    logger.error('Health check failed', {
      error: error.message
    });

    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      uptime: process.uptime()
    });
  }
});

/**
 * Metrics endpoint
 */
router.get('/metrics', getMetrics);

/**
 * Readiness probe endpoint
 */
router.get('/ready', async (req, res) => {
  try {
    const dbHealthy = await checkDatabaseHealth();

    if (dbHealthy.status === 'healthy') {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: 'Database not available'
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Liveness probe endpoint
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Check database health
 */
async function checkDatabaseHealth() {
  try {
    const isConnected = await testConnection();
    const poolStatus = getPoolStatus ? getPoolStatus() : null;

    return {
      status: isConnected ? 'healthy' : 'unhealthy',
      connected: isConnected,
      pool: poolStatus ? {
        total: poolStatus.size,
        available: poolStatus.available,
        using: poolStatus.using
      } : null
    };
  } catch (error) {
    return {
      status: 'critical',
      connected: false,
      error: error.message
    };
  }
}

/**
 * Check cache health
 */
async function checkCacheHealth() {
  if (process.env.ENABLE_CACHE !== 'true') {
    return {
      status: 'disabled',
      enabled: false
    };
  }

  try {
    const healthCheck = await cacheService.healthCheck();
    // Don't mark service as unhealthy if Redis is unavailable - it's optional
    return {
      status: healthCheck.connected ? 'healthy' : 'degraded',
      ...healthCheck
    };
  } catch (error) {
    return {
      status: 'degraded', // Changed from 'unhealthy' to 'degraded'
      connected: false,
      error: error.message
    };
  }
}

/**
 * Check user cache health
 */
function checkUserCacheHealth() {
  if (process.env.ENABLE_USER_CACHE !== 'true') {
    return {
      status: 'disabled',
      enabled: false
    };
  }

  try {
    const isAvailable = userCacheService.isAvailable();
    const stats = userCacheService.getStats();

    return {
      status: isAvailable ? 'healthy' : 'unhealthy',
      enabled: stats.enabled,
      size: stats.size,
      maxSize: stats.maxSize
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      enabled: false,
      error: error.message
    };
  }
}

module.exports = router;
