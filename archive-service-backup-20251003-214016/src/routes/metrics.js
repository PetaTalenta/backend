/**
 * Metrics Routes
 * Phase 2.4: Enhanced Monitoring
 */

const express = require('express');
const router = express.Router();
const { getMetrics, resetMetrics, healthCheck } = require('../middleware/metricsMiddleware');
const { requireServiceAuth } = require('../middleware/serviceAuth');
const DatabaseMonitor = require('../utils/dbMonitor');
const { sequelize } = require('../config/database');
const cacheService = require('../services/cacheService');

/**
 * GET /metrics
 * Get application metrics
 */
router.get('/', requireServiceAuth, getMetrics);

/**
 * POST /metrics/reset
 * Reset metrics counters
 */
router.post('/reset', requireServiceAuth, resetMetrics);

/**
 * GET /metrics/health
 * Comprehensive health check with metrics
 */
router.get('/health', healthCheck);

/**
 * GET /metrics/database
 * Get database-specific metrics
 */
router.get('/database', requireServiceAuth, async (req, res) => {
  try {
    const dbMonitor = new DatabaseMonitor(sequelize);
    const healthReport = await dbMonitor.generateHealthReport();
    
    res.json({
      success: true,
      data: healthReport,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_METRICS_ERROR',
        message: 'Failed to retrieve database metrics',
        details: error.message
      }
    });
  }
});

/**
 * GET /metrics/cache
 * Get cache-specific metrics
 */
router.get('/cache', requireServiceAuth, async (req, res) => {
  try {
    const cacheStats = await cacheService.getStats();
    
    res.json({
      success: true,
      data: {
        available: cacheService.isAvailable(),
        stats: cacheStats,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CACHE_METRICS_ERROR',
        message: 'Failed to retrieve cache metrics',
        details: error.message
      }
    });
  }
});

/**
 * GET /metrics/performance
 * Get performance analysis
 */
router.get('/performance', requireServiceAuth, async (req, res) => {
  try {
    const dbMonitor = new DatabaseMonitor(sequelize);
    const [perfMetrics, slowQueries] = await Promise.all([
      dbMonitor.getPerformanceMetrics(),
      dbMonitor.getSlowQueries(500) // Queries slower than 500ms
    ]);
    
    res.json({
      success: true,
      data: {
        performance: perfMetrics,
        slowQueries: slowQueries,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'PERFORMANCE_METRICS_ERROR',
        message: 'Failed to retrieve performance metrics',
        details: error.message
      }
    });
  }
});

/**
 * POST /metrics/cache/invalidate
 * Invalidate cache
 */
router.post('/cache/invalidate', requireServiceAuth, async (req, res) => {
  try {
    const { pattern } = req.body;
    
    let result;
    if (pattern) {
      switch (pattern) {
        case 'demographics':
          result = await cacheService.invalidateDemographics();
          break;
        case 'archetypes':
          result = await cacheService.invalidateArchetypes();
          break;
        case 'stats':
          result = await cacheService.invalidateStats();
          break;
        case 'results':
          result = await cacheService.invalidateResults();
          break;
        case 'all':
          result = await cacheService.invalidateAll();
          break;
        default:
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_PATTERN',
              message: 'Invalid cache pattern. Use: demographics, archetypes, stats, results, or all'
            }
          });
      }
    } else {
      result = await cacheService.invalidateAll();
    }
    
    res.json({
      success: true,
      message: `Cache invalidated for pattern: ${pattern || 'all'}`,
      data: { result },
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CACHE_INVALIDATION_ERROR',
        message: 'Failed to invalidate cache',
        details: error.message
      }
    });
  }
});

module.exports = router;
