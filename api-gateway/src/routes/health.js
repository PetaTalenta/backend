const express = require('express');
const axios = require('axios');
const config = require('../config');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * Middleware to add gateway headers to health endpoints
 */
const addGatewayHeaders = (req, res, next) => {
  // Add request ID if not present
  if (!req.id) {
    req.id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Add gateway headers
  res.setHeader('X-Request-ID', req.id);
  res.setHeader('X-Gateway', 'ATMA-API-Gateway');
  res.setHeader('X-Gateway-Version', '1.0.0');

  next();
};

// Apply gateway headers middleware to all health routes
router.use(addGatewayHeaders);

/**
 * Health check untuk API Gateway
 */
router.get('/', asyncHandler(async (req, res) => {
  const timestamp = new Date().toISOString();
  
  res.json({
    success: true,
    status: 'healthy',
    service: 'api-gateway',
    version: '1.0.0',
    timestamp: timestamp,
    uptime: process.uptime(),
    environment: config.nodeEnv
  });
}));

/**
 * Detailed health check dengan status semua services
 */
router.get('/detailed', asyncHandler(async (req, res) => {
  const timestamp = new Date().toISOString();
  const services = {};
  
  // Check each service
  const serviceChecks = Object.entries(config.services).map(async ([name, url]) => {
    try {
      const response = await axios.get(`${url}/health`, {
        timeout: config.healthCheck.timeout
      });
      
      services[name] = {
        status: 'healthy',
        url: url,
        responseTime: response.headers['x-response-time'] || 'unknown',
        lastChecked: timestamp
      };
    } catch (error) {
      services[name] = {
        status: 'unhealthy',
        url: url,
        error: error.message,
        lastChecked: timestamp
      };
    }
  });
  
  await Promise.all(serviceChecks);
  
  // Determine overall status
  const allHealthy = Object.values(services).every(service => service.status === 'healthy');
  const overallStatus = allHealthy ? 'healthy' : 'degraded';
  
  res.json({
    success: true,
    status: overallStatus,
    service: 'api-gateway',
    version: '1.0.0',
    timestamp: timestamp,
    uptime: process.uptime(),
    environment: config.nodeEnv,
    services: services,
    summary: {
      total: Object.keys(services).length,
      healthy: Object.values(services).filter(s => s.status === 'healthy').length,
      unhealthy: Object.values(services).filter(s => s.status === 'unhealthy').length
    }
  });
}));

/**
 * Readiness probe untuk container orchestration
 */
router.get('/ready', asyncHandler(async (req, res) => {
  // Check if all critical services are available
  const criticalServices = ['auth', 'archive', 'assessment'];
  const serviceChecks = criticalServices.map(async (serviceName) => {
    try {
      const url = config.services[serviceName];
      await axios.get(`${url}/health`, {
        timeout: 3000 // Shorter timeout for readiness
      });
      return { service: serviceName, ready: true };
    } catch (error) {
      return { service: serviceName, ready: false, error: error.message };
    }
  });
  
  const results = await Promise.all(serviceChecks);
  const allReady = results.every(result => result.ready);
  
  if (allReady) {
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      services: results
    });
  } else {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      services: results
    });
  }
}));

/**
 * Liveness probe untuk container orchestration
 */
router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
