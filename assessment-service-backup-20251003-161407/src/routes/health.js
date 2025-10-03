const express = require('express');
const os = require('os');
const queueService = require('../services/queueService');
const authService = require('../services/authService');
const archiveService = require('../services/archiveService');
const jobTracker = require('../jobs/jobTracker');
const stuckJobMonitor = require('../jobs/stuckJobMonitor');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route GET /health
 * @description Get service health status
 * @access Public
 */
router.get('/', async(req, res) => {
  try {
    // Check RabbitMQ connection
    const queueHealth = await queueService.isHealthy();

    // Check Auth Service connection
    const authHealth = await authService.checkHealth();

    // Check Archive Service connection
    let archiveHealth = false;
    try {
      archiveHealth = await archiveService.checkHealth();
    } catch (archiveError) {
      logger.warn('Archive service health check failed', { error: archiveError.message });
      archiveHealth = false;
    }

    // Get job statistics
    const jobStats = jobTracker.getJobStats();

    // Get queue statistics
    const queueStats = await queueService.getQueueStats();

    // Determine overall status
    let status = 'healthy';
    if (!queueHealth || !authHealth || !archiveHealth) {
      status = 'degraded';
    }

    // Return health status
    return res.json({
      status,
      timestamp: new Date().toISOString(),
      service: 'assessment-service',
      version: '1.0.0',
      dependencies: {
        rabbitmq: {
          status: queueHealth ? 'healthy' : 'unhealthy',
          details: {
            messageCount: queueStats.messageCount || 0,
            consumerCount: queueStats.consumerCount || 0
          }
        },
        authService: {
          status: authHealth ? 'healthy' : 'unhealthy'
        },
        archiveService: {
          status: archiveHealth ? 'healthy' : 'unhealthy'
        }
      },
      jobs: {
        total: jobStats.total || 0,
        queued: jobStats.queued || 0,
        processing: jobStats.processing || 0,
        completed: jobStats.completed || 0,
        failed: jobStats.failed || 0
      }
    });
  } catch (error) {
    logger.error('Health check error', { error: error.message });

    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'assessment-service',
      version: '1.0.0',
      error: error.message
    });
  }
});

/**
 * @route GET /health/live
 * @description Simple liveness probe
 * @access Public
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route GET /health/ready
 * @description Readiness probe
 * @access Public
 */
router.get('/ready', async(req, res) => {
  try {
    // Check RabbitMQ connection
    const queueHealth = await queueService.isHealthy();

    if (!queueHealth) {
      return res.status(503).json({
        status: 'not_ready',
        reason: 'RabbitMQ connection unavailable',
        timestamp: new Date().toISOString()
      });
    }

    return res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check error', { error: error.message });

    return res.status(503).json({
      status: 'not_ready',
      reason: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /health/queue
 * @description Queue health check
 * @access Public
 */
router.get('/queue', async(req, res) => {
  try {
    // Get queue statistics
    const queueStats = await queueService.getQueueStats();

    return res.status(200).json({
      status: queueStats.isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      details: queueStats
    });
  } catch (error) {
    logger.error('Queue health check error', { error: error.message });

    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @route POST /health/stuck-jobs/check
 * @description Manually trigger stuck job check (Week 2)
 * @access Internal
 */
router.post('/stuck-jobs/check', async(req, res) => {
  try {
    logger.info('Manual stuck job check triggered via API');

    const result = await stuckJobMonitor.manualCheck();

    return res.status(200).json({
      success: true,
      message: 'Stuck job check completed',
      timestamp: new Date().toISOString(),
      data: result
    });
  } catch (error) {
    logger.error('Manual stuck job check error', { error: error.message });

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /health/stuck-jobs/stats
 * @description Get stuck job monitor statistics (Week 2)
 * @access Internal
 */
router.get('/stuck-jobs/stats', async(req, res) => {
  try {
    const stats = await stuckJobMonitor.getStats();

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: stats
    });
  } catch (error) {
    logger.error('Stuck job stats error', { error: error.message });

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
