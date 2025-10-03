/**
 * Archive Service - Main Application
 * Express.js application for managing analysis results
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Import utilities and middleware
const logger = require('./utils/logger');
const { initialize: initializeDatabase, close: closeDatabase } = require('./config/database');
const cacheService = require('./services/cacheService');
const backgroundProcessor = require('./services/backgroundProcessor');
const { metricsMiddleware, cacheMetricsMiddleware } = require('./middleware/metricsMiddleware');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { handleAuthError } = require('./middleware/auth');
const { sanitizeRequest, validateRequestSize, addSecurityHeaders } = require('./middleware/security');

// Import routes
const resultsRoutes = require('./routes/results');
const statsRoutes = require('./routes/stats');
const demographicsRoutes = require('./routes/demographics');
const adminRoutes = require('./routes/admin');
const healthRoutes = require('./routes/health');
const unifiedRoutes = require('./routes/unified');
const metricsRoutes = require('./routes/metrics');
const directJobsRoutes = require('./routes/directJobs');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3002;

// CORS configuration - Unlimited access
const corsOptions = {
  origin: true, // Allow all origins
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));

// Security middleware
app.use(addSecurityHeaders);
app.use(validateRequestSize({
  maxBodySize: 10 * 1024 * 1024, // 10MB
  maxQueryParams: 50,
  maxQueryStringLength: 2048
}));

// Response compression middleware - reduces bandwidth usage by 60-80%
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request sanitization middleware
app.use(sanitizeRequest);

// HTTP request logging
app.use(morgan('combined', {
  stream: logger.stream
}));

// Request ID middleware for tracking
app.use((req, res, next) => {
  req.requestId = Math.random().toString(36).substring(2, 15);
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Enhanced request logging middleware
app.use((req, res, next) => {
  // Log all incoming requests with detailed information
  logger.info('Incoming request', {
    method: req.method,
    originalUrl: req.originalUrl,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    referer: req.get('referer'),
    requestId: req.requestId,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    hasBody: req.body && Object.keys(req.body).length > 0,
    contentType: req.get('content-type'),
    timestamp: new Date().toISOString()
  });
  next();
});



// Metrics collection middleware
app.use(metricsMiddleware);
app.use(cacheMetricsMiddleware);



// Routes - Standardized with /archive prefix for consistency
app.use('/archive/results', resultsRoutes);
app.use('/archive/stats', statsRoutes);
app.use('/archive/demographics', demographicsRoutes);
app.use('/archive/jobs', directJobsRoutes);
app.use('/archive/v1', unifiedRoutes); // Unified API under archive prefix
app.use('/archive/admin', adminRoutes);
app.use('/archive/metrics', metricsRoutes);
app.use('/archive/health', healthRoutes);

// Root health endpoint (for service discovery)
app.use('/', healthRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ATMA Archive Service is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    service: 'archive-service'
  });
});

// Auth error handler (must be before general error handler)
app.use(handleAuthError);

// 404 handler
app.use('*', notFoundHandler);

// Global error handler
app.use(errorHandler);

/**
 * Initialize services
 */
const initializeServices = async () => {
  try {
    // Initialize database
    await initializeDatabase();

    // Initialize cache service
    await cacheService.initialize();

    // Start background processor
    backgroundProcessor.start();

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services', { error: error.message });
    throw error;
  }
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, starting graceful shutdown`);

  try {
    // Stop background processor
    backgroundProcessor.stop();
    logger.info('Background processor stopped');

    // Close cache service
    await cacheService.close();
    logger.info('Cache service closed');

    // Close database connection
    await closeDatabase();
    logger.info('Database connection closed');

    // Exit process
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message });
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { reason, promise });
  process.exit(1);
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  initializeServices().then(() => {
    app.listen(PORT, () => {
      logger.info(`Archive Service running on port ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
      });
    });
  }).catch((error) => {
    logger.error('Failed to start Archive Service', { error: error.message });
    process.exit(1);
  });
}

module.exports = app;
