const { v4: uuidv4 } = require('uuid');
const rabbitmq = require('../config/rabbitmq');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

/**
 * Publish assessment job to RabbitMQ queue
 * @param {Object} assessmentData - Assessment data to be processed
 * @param {String} userId - User ID
 * @param {String} userEmail - User email
 * @param {String} jobId - Job ID (passed from caller)
 * @param {String} assessmentName - Assessment name
 * @returns {Promise<String>} - Job ID
 */
const publishAssessmentJob = async(assessmentData, userId, userEmail, jobId, assessmentName = 'AI-Driven Talent Mapping') => {
  try {
    const channel = await rabbitmq.getChannel();

    // Prepare message payload
    const message = {
      jobId,
      userId,
      userEmail,
      assessmentData,
      assessmentName,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    // Convert message to buffer
    const messageBuffer = Buffer.from(JSON.stringify(message));

    // Publish message to queue
    const published = channel.publish(
      rabbitmq.config.exchange,
      rabbitmq.config.routingKey,
      messageBuffer,
      {
        persistent: rabbitmq.config.options.persistent,
        messageId: jobId,
        timestamp: Date.now(),
        headers: {
          userId,
          userEmail,
          assessmentName,
          jobType: 'assessment_analysis'
        }
      }
    );

    if (!published) {
      throw new AppError('QUEUE_ERROR', 'Failed to publish message to queue', 500);
    }

    logger.info('Assessment job published to queue', {
      jobId,
      userId,
      userEmail,
      exchange: rabbitmq.config.exchange,
      routingKey: rabbitmq.config.routingKey
    });

    return jobId;
  } catch (error) {
    logger.error('Failed to publish assessment job', {
      error: error.message,
      userId,
      userEmail
    });

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('QUEUE_ERROR', 'Failed to queue assessment for processing', 500, {
      originalError: error.message
    });
  }
};

/**
 * Get queue statistics (for monitoring)
 * @returns {Promise<Object>} - Queue statistics
 */
const getQueueStats = async() => {
  try {
    const channel = await rabbitmq.getChannel();

    // Check queue status
    const queueInfo = await channel.checkQueue(rabbitmq.config.queue);

    return {
      queueName: rabbitmq.config.queue,
      messageCount: queueInfo.messageCount,
      consumerCount: queueInfo.consumerCount,
      isHealthy: await rabbitmq.checkHealth()
    };
  } catch (error) {
    logger.error('Failed to get queue statistics', { error: error.message });

    return {
      queueName: rabbitmq.config.queue,
      messageCount: 0,
      consumerCount: 0,
      isHealthy: false,
      error: error.message
    };
  }
};

/**
 * Initialize queue service
 * @returns {Promise<void>}
 */
const initialize = async() => {
  try {
    await rabbitmq.initialize();
    logger.info('Queue service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize queue service', { error: error.message });
    throw error;
  }
};

/**
 * Close queue service connections
 * @returns {Promise<void>}
 */
const close = async() => {
  try {
    await rabbitmq.close();
    logger.info('Queue service closed successfully');
  } catch (error) {
    logger.error('Failed to close queue service', { error: error.message });
    throw error;
  }
};

/**
 * Check if queue service is healthy
 * @returns {Promise<boolean>}
 */
const isHealthy = async() => {
  return await rabbitmq.checkHealth();
};

module.exports = {
  publishAssessmentJob,
  getQueueStats,
  initialize,
  close,
  isHealthy
};
