const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Import routes
const assessmentRoutes = require('./routes/assessments');
const healthRoutes = require('./routes/health');

// Import utilities
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');

// Import services
const queueService = require('./services/queueService');
const eventConsumer = require('./services/eventConsumer');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3003;

// Middleware - CORS unlimited access
app.use(cors({
  origin: true, // Allow all origins
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Routes
app.use('/assessments', assessmentRoutes);
app.use('/health', healthRoutes);

// Testing endpoint (only in development)
if (process.env.NODE_ENV === 'development') {
  const testRoutes = require('./routes/test');
  app.use('/test', testRoutes);
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ATMA Assessment Service is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize services
const initializeServices = async() => {
  try {
    await queueService.initialize();

    // Initialize event consumer for event-driven architecture
    try {
      await eventConsumer.initialize();
      await eventConsumer.startConsuming();
      logger.info('Event consumer initialized and started');
    } catch (eventError) {
      logger.error('Failed to initialize event consumer', { error: eventError.message });
      // Don't exit the process, continue with HTTP-based callbacks as fallback
    }

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services', { error: error.message });
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async() => {
  logger.info('Shutting down gracefully...');
  try {
    // Stop event consumer
    try {
      await eventConsumer.stopConsuming();
      logger.info('Event consumer stopped');
    } catch (eventError) {
      logger.error('Error stopping event consumer', { error: eventError.message });
    }

    await queueService.close();
    logger.info('All services closed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
if (process.env.NODE_ENV !== 'test') {
  initializeServices().then(() => {
    app.listen(PORT, () => {
      logger.info(`Assessment Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  });
}

module.exports = app;
