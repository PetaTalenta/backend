/**
 * Archive Service - Main Application
 * Express.js application for managing analysis results
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Import utilities and middleware
const logger = require('./utils/logger');
const { initialize: initializeDatabase, close: closeDatabase } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { handleAuthError } = require('./middleware/auth');

// Import routes
const resultsRoutes = require('./routes/results');
const statsRoutes = require('./routes/stats');
const demographicsRoutes = require('./routes/demographics');
const adminRoutes = require('./routes/admin');
const healthRoutes = require('./routes/health');
const unifiedRoutes = require('./routes/unified');

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Routes
// New unified API routes (v1)
app.use('/api/v1', unifiedRoutes);

// Legacy routes (maintain backward compatibility)
app.use('/archive', resultsRoutes);
app.use('/archive', statsRoutes);
app.use('/archive/demographics', demographicsRoutes);

// Direct access routes (for services that call without /archive prefix)
app.use('/results', resultsRoutes);
app.use('/jobs', resultsRoutes);

app.use('/admin', adminRoutes);
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
