const express = require('express');
const os = require('os');
const queueService = require('../services/queueService');
const authService = require('../services/authService');
const jobTracker = require('../jobs/jobTracker');
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

    // Get job statistics
    const jobStats = jobTracker.getJobStats();

    // Get queue statistics
    const queueStats = await queueService.getQueueStats();

    // Get system information
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      hostname: os.hostname(),
      platform: process.platform,
      nodeVersion: process.version
    };

    // Determine overall status
    let status = 'healthy';
    if (!queueHealth || !authHealth) {
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
          details: queueStats
        },
        authService: {
          status: authHealth ? 'healthy' : 'unhealthy'
        }
      },
      jobs: jobStats,
      system: systemInfo
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

module.exports = router;
