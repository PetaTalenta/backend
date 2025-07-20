const express = require('express');
const sequelize = require('../config/database');
const logger = require('../utils/logger');
const pkg = require('../../package.json');

const router = express.Router();

/**
 * Health check endpoint
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/', async (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: pkg.version,
    database: 'disconnected',
    uptime: process.uptime()
  };

  try {
    // Test database connection
    const dbConnected = await sequelize.testConnection();
    healthCheck.database = dbConnected ? 'connected' : 'disconnected';

    // If database is disconnected but service is running, still return 200
    // This allows the service to function in degraded mode
    logger.debug('Health check completed', {
      status: healthCheck.status,
      database: healthCheck.database
    });

    res.status(200).json(healthCheck);
  } catch (error) {
    healthCheck.status = 'degraded';
    healthCheck.error = 'Health check error';

    logger.error('Health check error', {
      error: error.message,
      status: healthCheck.status
    });

    res.status(200).json(healthCheck);
  }
});

module.exports = router;
