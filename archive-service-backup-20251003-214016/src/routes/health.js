/**
 * Health Check Routes
 * Provides health status and system information
 */

const express = require('express');
const { testConnection } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET / (mounted at /archive/health and /)
 * Basic health check endpoint
 */
router.get('/', async (req, res) => {
  try {
    // Test database connection
    const isDatabaseConnected = await testConnection();
    
    const healthStatus = {
      status: isDatabaseConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: isDatabaseConnected ? 'connected' : 'disconnected',
      version: '1.0.0',
      service: 'archive-service'
    };
    
    // Log health check
    logger.info('Health check performed', {
      status: healthStatus.status,
      database: healthStatus.database
    });
    
    // Return appropriate status code
    const statusCode = isDatabaseConnected ? 200 : 503;
    res.status(statusCode).json(healthStatus);
    
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'error',
      version: '1.0.0',
      service: 'archive-service',
      error: error.message
    });
  }
});

/**
 * GET /detailed (mounted at /archive/health/detailed)
 * Detailed health check with more information
 */
router.get('/detailed', async (req, res) => {
  try {
    const isDatabaseConnected = await testConnection();
    
    const detailedHealth = {
      status: isDatabaseConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'archive-service',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: {
        status: isDatabaseConnected ? 'connected' : 'disconnected',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'atma_db',
        schema: process.env.DB_SCHEMA || 'archive'
      }
    };
    
    const statusCode = isDatabaseConnected ? 200 : 503;
    res.status(statusCode).json(detailedHealth);
    
  } catch (error) {
    logger.error('Detailed health check failed', { error: error.message });
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'archive-service',
      error: error.message
    });
  }
});

module.exports = router;
