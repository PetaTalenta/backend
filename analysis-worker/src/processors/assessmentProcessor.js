/**
 * Assessment Processor
 * 
 * Processes assessment data using AI and saves results to Archive Service
 */

const aiService = require('../services/aiService');
const archiveService = require('../services/archiveService');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');
const { withRetry, withTimeout, ERROR_TYPES, createError } = require('../utils/errorHandler');

/**
 * Process assessment job
 * @param {Object} jobData - Job data from queue
 * @returns {Promise<Object>} - Processing result
 */
const processAssessment = async (jobData) => {
  const { jobId, userId, userEmail, assessmentData, assessmentName = 'AI-Driven Talent Mapping' } = jobData;
  const processingTimeout = parseInt(process.env.PROCESSING_TIMEOUT || '300000'); // 5 minutes
  
  try {
    logger.info('Starting assessment processing', {
      jobId,
      userEmail
    });

    // Step 1: Update job status to processing (job already exists from Assessment Service)
    await archiveService.updateAnalysisJobStatus(jobId, 'processing');

    // Process with timeout
    return await withTimeout(async () => {
      // Step 2: Generate persona profile using AI
      const personaProfile = await withRetry(
        () => aiService.generatePersonaProfile(assessmentData, jobId),
        {
          operationName: 'AI persona generation',
          shouldRetry: (error) => {
            // Retry network errors and AI service errors
            return error.code === ERROR_TYPES.AI_SERVICE_ERROR.code ||
                   error.code === 'ECONNREFUSED' ||
                   error.code === 'ENOTFOUND' ||
                   error.code === 'ETIMEDOUT';
          }
        }
      );
      
      logger.info('Persona profile generated successfully', {
        jobId,
        userId,
        profileCount: personaProfile.length
      });
      
      // Step 3: Save result to Archive Service
      const saveResult = await withRetry(
        () => archiveService.saveAnalysisResult(userId, assessmentData, personaProfile, jobId, assessmentName),
        {
          operationName: 'Archive service save',
          shouldRetry: (error) => error.isRetryable
        }
      );
      
      logger.info('Analysis result saved to Archive Service', {
        jobId,
        userId,
        resultId: saveResult.id
      });

      // Step 4: Update job status to completed with result_id
      await archiveService.updateAnalysisJobStatus(jobId, 'completed', {
        result_id: saveResult.id
      });

      // Step 5: Update job status in Assessment Service
      try {
        await notificationService.updateAssessmentJobStatus(
          jobId,
          saveResult.id,
          'completed'
        );

        logger.debug('Assessment job status updated', {
          jobId,
          resultId: saveResult.id
        });
      } catch (statusError) {
        // Log but don't fail the process for status update errors
        logger.warn('Failed to update assessment job status', {
          jobId,
          userId,
          resultId: saveResult.id,
          error: statusError.message
        });
      }

      // Step 4: Send notification
      try {
        await notificationService.sendAnalysisCompleteNotification(
          userId,
          jobId,
          saveResult.id,
          'completed'
        );

        logger.info('Analysis completion notification sent', {
          jobId,
          userId,
          resultId: saveResult.id
        });
      } catch (notificationError) {
        // Log but don't fail the process for notification errors
        logger.warn('Failed to send completion notification', {
          jobId,
          userId,
          resultId: saveResult.id,
          error: notificationError.message
        });
      }
      
      return {
        success: true,
        id: saveResult.id,
        status: 'completed',
        userId,
        jobId
      };
    }, processingTimeout, 'assessment processing');
    
  } catch (error) {
    logger.error('Assessment processing failed', {
      jobId,
      userId,
      error: error.message,
      stack: error.stack
    });

    // Save failed result to archive with empty persona profile
    let failedResultId = null;
    try {
      const failedResult = await archiveService.saveFailedAnalysisResult(
        userId,
        assessmentData,
        error.message,
        jobId,
        assessmentName
      );
      failedResultId = failedResult.id;

      logger.info('Failed analysis result saved to Archive Service', {
        jobId,
        userId,
        resultId: failedResultId
      });
    } catch (archiveError) {
      logger.warn('Failed to save failed analysis result to Archive Service', {
        jobId,
        userId,
        error: archiveError.message
      });
    }

    // Update job status to failed in database
    await archiveService.updateAnalysisJobStatus(jobId, 'failed', {
      result_id: failedResultId,
      error_message: error.message
    });

    // Update job status to failed and refund tokens
    try {
      await notificationService.updateAssessmentJobStatusFailed(
        jobId,
        failedResultId,
        error.message
      );

      logger.info('Assessment job status updated to failed and tokens refunded', {
        jobId,
        userId,
        resultId: failedResultId
      });
    } catch (statusError) {
      logger.warn('Failed to update assessment job status to failed', {
        jobId,
        userId,
        resultId: failedResultId,
        error: statusError.message
      });
    }

    // Send failure notification
    try {
      await notificationService.sendAnalysisFailureNotification(
        userId,
        jobId,
        error.message
      );
    } catch (notificationError) {
      logger.warn('Failed to send failure notification', {
        jobId,
        userId,
        error: notificationError.message
      });
    }

    // Determine if error is retryable for queue retry mechanism
    // AI service errors should not be retried to avoid consuming more tokens
    const isRetryable = error.code === ERROR_TYPES.ARCHIVE_SERVICE_ERROR.code ||
                        error.code === ERROR_TYPES.TIMEOUT_ERROR.code ||
                        (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT');

    // Don't retry AI service errors to prevent token consumption
    const shouldNotRetry = error.code === ERROR_TYPES.AI_SERVICE_ERROR.code ||
                           error.message.includes('AI service') ||
                           error.message.includes('persona profile');

    throw createError(
      (isRetryable && !shouldNotRetry) ? ERROR_TYPES.INTERNAL_ERROR : ERROR_TYPES.VALIDATION_ERROR,
      `Assessment processing failed: ${error.message}`,
      error
    );
  }
};

module.exports = {
  processAssessment
};
