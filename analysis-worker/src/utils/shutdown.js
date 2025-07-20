/**
 * Graceful shutdown utility
 */

const logger = require('./logger');
const queueConsumer = require('../services/queueConsumer');

// Flag to prevent multiple shutdown attempts
let isShuttingDown = false;

/**
 * Perform graceful shutdown
 * @param {String} signal - Signal that triggered shutdown
 */
async function gracefulShutdown(signal) {
  // Prevent multiple shutdown attempts
  if (isShuttingDown) {
    return;
  }
  
  isShuttingDown = true;
  
  logger.info(`Graceful shutdown initiated (${signal})`, {
    signal,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Close queue consumer connection
    logger.info('Closing queue consumer connection...');
    await queueConsumer.close();
    logger.info('Queue consumer connection closed successfully');
    
    // Add any other cleanup tasks here
    
    logger.info('Graceful shutdown completed successfully');
    
    // Exit process
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', {
      error: error.message,
      stack: error.stack
    });
    
    // Force exit after failed graceful shutdown
    process.exit(1);
  }
}

module.exports = {
  gracefulShutdown
};
