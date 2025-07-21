// Load environment variables
require('dotenv').config();

const app = require('./app');
const logger = require('./utils/logger');
const cacheService = require('./services/cacheService');

const PORT = process.env.PORT || 3001;

/**
 * Initialize services
 */
const initializeServices = async () => {
  try {
    // Initialize cache service with proper timeout handling
    await cacheService.initialize();

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.warn('Service initialization completed with warnings', { error: error.message });
    // Don't throw error - allow service to run without cache
  }
};

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  initializeServices().then(() => {
    const server = app.listen(PORT, () => {
      logger.info(`Auth Service started on port ${PORT}`, {
        service: 'auth-service',
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully`);

      try {
        // Close cache service
        await cacheService.close();

        // Close server
        server.close(() => {
          logger.info('Process terminated');
          process.exit(0);
        });
      } catch (error) {
        logger.error('Error during shutdown', { error: error.message });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    module.exports = server;
  }).catch((error) => {
    logger.error('Failed to start Auth Service', { error: error.message });
    process.exit(1);
  });
} else {
  module.exports = app;
}
