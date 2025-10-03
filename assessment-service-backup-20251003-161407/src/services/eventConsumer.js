/**
 * Event Consumer Service for Assessment Service
 * Consumes analysis events from RabbitMQ and updates job status
 */

const rabbitmq = require('../config/rabbitmq');
const logger = require('../utils/logger');
const jobTracker = require('../jobs/jobTracker');
const authService = require('./authService');
const archiveService = require('./archiveService');

// Consumer state
let isConsuming = false;
let channel = null;

/**
 * Initialize event consumer
 */
const initialize = async () => {
  try {
    // Initialize RabbitMQ connection
    channel = await rabbitmq.initialize();
    
    logger.info('Event consumer initialized for assessments');
  } catch (error) {
    logger.error('Failed to initialize event consumer', { error: error.message });
    throw error;
  }
};

/**
 * Start consuming events from the queue
 */
const startConsuming = async () => {
  try {
    if (isConsuming) {
      logger.warn('Event consumer is already consuming messages');
      return;
    }

    if (!channel) {
      throw new Error('Event consumer not initialized');
    }

    // Start consuming events
    await channel.consume(rabbitmq.config.assessmentsQueue, async (message) => {
      if (message) {
        try {
          const eventData = JSON.parse(message.content.toString());
          
          logger.debug('Received assessment event', {
            eventType: eventData.eventType,
            jobId: eventData.jobId,
            userId: eventData.userId
          });

          // Process the event based on type
          await processEvent(eventData);

          // Acknowledge the message
          channel.ack(message);

          logger.debug('Assessment event processed successfully', {
            eventType: eventData.eventType,
            jobId: eventData.jobId,
            userId: eventData.userId
          });

        } catch (error) {
          logger.error('Failed to process assessment event', {
            error: error.message,
            messageId: message.properties.messageId
          });

          // Reject the message and don't requeue (send to DLQ)
          channel.nack(message, false, false);
        }
      }
    }, {
      noAck: false // Enable manual acknowledgment
    });

    isConsuming = true;
    logger.info('Assessment event consumer started - consuming analysis events');

  } catch (error) {
    logger.error('Failed to start assessment event consumer', { error: error.message });
    throw error;
  }
};

/**
 * Process individual event based on type
 * @param {Object} eventData - Event data from RabbitMQ
 */
const processEvent = async (eventData) => {
  const { eventType, userId, jobId } = eventData;

  switch (eventType) {
    case 'analysis.completed':
      await handleAnalysisCompleted(eventData);
      break;
    
    case 'analysis.failed':
      await handleAnalysisFailed(eventData);
      break;
    
    case 'analysis.started':
      await handleAnalysisStarted(eventData);
      break;
    
    default:
      logger.warn('Unknown assessment event type received', {
        eventType,
        jobId,
        userId
      });
  }
};

/**
 * Handle analysis completed events
 * @param {Object} eventData - Event data
 */
const handleAnalysisCompleted = async (eventData) => {
  const { userId, jobId, resultId, metadata } = eventData;

  try {
    // Update job status in local tracker
    const updatedJob = jobTracker.updateJobStatus(jobId, 'completed', 100);

    if (!updatedJob) {
      logger.warn('Job not found in local tracker for completion event', { jobId, userId });
    }

    // Sync with archive service database
    try {
      await archiveService.syncJobStatus(jobId, 'completed', {
        result_id: resultId,
        metadata: {
          processingTime: metadata?.processingTime,
          assessmentName: metadata?.assessmentName
        }
      });
    } catch (syncError) {
      logger.warn('Failed to sync completed job status with archive', {
        jobId,
        error: syncError.message
      });
      // Don't fail the event processing if sync fails
    }

    logger.info('Assessment job status updated to completed via event', {
      userId,
      jobId,
      resultId,
      processingTime: metadata?.processingTime
    });

  } catch (error) {
    logger.error('Failed to handle analysis completed event', {
      userId,
      jobId,
      resultId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Handle analysis failed events
 * @param {Object} eventData - Event data
 */
const handleAnalysisFailed = async (eventData) => {
  const { userId, jobId, errorMessage, metadata } = eventData;

  try {
    // Update job status in local tracker
    const updatedJob = jobTracker.updateJobStatus(jobId, 'failed', 0, errorMessage);

    if (!updatedJob) {
      logger.warn('Job not found in local tracker for failure event', { jobId, userId });
    }

    // Refund tokens for failed job
    try {
      const tokenCost = parseInt(process.env.ANALYSIS_TOKEN_COST || '1');
      await authService.refundTokens(userId, null, tokenCost);
      logger.info('Tokens refunded for failed job via event', {
        userId,
        jobId,
        errorMessage,
        refundedAmount: tokenCost
      });
    } catch (refundError) {
      logger.error('Failed to refund tokens for failed job', {
        userId,
        jobId,
        error: refundError.message
      });
      // Don't throw error for refund failures, just log
    }

    // Sync with archive service database
    try {
      await archiveService.syncJobStatus(jobId, 'failed', {
        error_message: errorMessage,
        metadata: {
          errorType: metadata?.errorType,
          processingTime: metadata?.processingTime,
          assessmentName: metadata?.assessmentName
        }
      });
    } catch (syncError) {
      logger.warn('Failed to sync failed job status with archive', {
        jobId,
        error: syncError.message
      });
      // Don't fail the event processing if sync fails
    }

    logger.info('Assessment job status updated to failed via event', {
      userId,
      jobId,
      errorMessage,
      errorType: metadata?.errorType
    });

  } catch (error) {
    logger.error('Failed to handle analysis failed event', {
      userId,
      jobId,
      errorMessage,
      error: error.message
    });
    throw error;
  }
};

/**
 * Handle analysis started events (optional for future use)
 * @param {Object} eventData - Event data
 */
const handleAnalysisStarted = async (eventData) => {
  const { userId, jobId, metadata } = eventData;

  try {
    // Update job status in local tracker
    const updatedJob = jobTracker.updateJobStatus(jobId, 'processing', 10);

    if (!updatedJob) {
      logger.warn('Job not found in local tracker for started event', { jobId, userId });
    }

    // Sync with archive service database
    try {
      await archiveService.syncJobStatus(jobId, 'processing', {
        metadata: {
          assessmentName: metadata?.assessmentName,
          estimatedProcessingTime: metadata?.estimatedProcessingTime
        }
      });
    } catch (syncError) {
      logger.warn('Failed to sync processing job status with archive', {
        jobId,
        error: syncError.message
      });
      // Don't fail the event processing if sync fails
    }

    logger.info('Assessment job status updated to processing via event', {
      userId,
      jobId,
      estimatedProcessingTime: metadata?.estimatedProcessingTime
    });

  } catch (error) {
    logger.error('Failed to handle analysis started event', {
      userId,
      jobId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Stop consuming events
 */
const stopConsuming = async () => {
  try {
    if (channel && isConsuming) {
      await channel.cancel();
      isConsuming = false;
      logger.info('Assessment event consumer stopped');
    }
  } catch (error) {
    logger.error('Failed to stop assessment event consumer', { error: error.message });
    throw error;
  }
};

/**
 * Get consumer status
 * @returns {Object} - Consumer status
 */
const getStatus = () => {
  return {
    isConsuming,
    isConnected: channel !== null,
    queue: rabbitmq.config.assessmentsQueue,
    exchange: rabbitmq.config.eventsExchange
  };
};

module.exports = {
  initialize,
  startConsuming,
  stopConsuming,
  getStatus,
  handleAnalysisCompleted,
  handleAnalysisFailed,
  handleAnalysisStarted
};
