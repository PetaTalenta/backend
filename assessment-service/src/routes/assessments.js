const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { authenticateToken, requireTokenBalance } = require('../middleware/auth');
const { validateSchema } = require('../middleware/validation');
const { idempotencyMiddleware, addIdempotencyHeaders, idempotencyHealthCheck, cleanupExpiredCache } = require('../middleware/idempotency');
const { assessmentSchema } = require('../schemas/assessment');
const queueService = require('../services/queueService');
const authService = require('../services/authService');
const archiveService = require('../services/archiveService');
const jobTracker = require('../jobs/jobTracker');
const logger = require('../utils/logger');
const { sendSuccess, sendError, sendNotFound } = require('../utils/responseHelper');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @route POST /assessment/callback/completed
 * @description Callback endpoint for analysis worker to update job status
 * @access Internal Service Only
 */
router.post('/callback/completed', async(req, res, next) => {
  try {
    // Validate internal service authentication
    const serviceKey = req.headers['x-service-key'];
    const internalService = req.headers['x-internal-service'];
    const expectedKey = process.env.INTERNAL_SERVICE_KEY;

    if (!serviceKey || serviceKey !== expectedKey || internalService !== 'true') {
      return sendError(res, 'UNAUTHORIZED', 'Invalid service key or missing internal service header', {}, 401);
    }

    const { jobId, resultId, status } = req.body;

    // Validate required fields
    if (!jobId || !resultId || !status) {
      return sendError(res, 'VALIDATION_ERROR', 'Missing required fields', {
        jobId: 'Job ID is required',
        resultId: 'Result ID is required',
        status: 'Status is required'
      }, 400);
    }

    // Update job status in local tracker
    const updatedJob = jobTracker.updateJobStatus(jobId, status, 100);

    if (!updatedJob) {
      return sendNotFound(res, 'Job not found in local tracker');
    }

    // Optional: Sync with archive service database
    try {
      await archiveService.syncJobStatus(jobId, status, { result_id: resultId });
    } catch (syncError) {
      logger.warn('Failed to sync job status with archive', {
        jobId,
        error: syncError.message
      });
      // Don't fail the request if sync fails
    }

    logger.info('Job status updated via callback', {
      jobId,
      resultId,
      status,
      userId: updatedJob.userId
    });

    return sendSuccess(res, 'Job status updated successfully', {
      jobId,
      status: updatedJob.status,
      progress: updatedJob.progress,
      updatedAt: updatedJob.updatedAt
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /assessment/callback/failed
 * @description Callback endpoint for analysis worker to update job status to failed and refund tokens
 * @access Internal Service Only
 */
router.post('/callback/failed', async(req, res, next) => {
  try {
    // Validate internal service authentication
    const serviceKey = req.headers['x-service-key'];
    const internalService = req.headers['x-internal-service'];
    const expectedKey = process.env.INTERNAL_SERVICE_KEY;

    if (!serviceKey || serviceKey !== expectedKey || internalService !== 'true') {
      return sendError(res, 'UNAUTHORIZED', 'Invalid service key or missing internal service header', {}, 401);
    }

    const { jobId, resultId, status, errorMessage } = req.body;

    // Validate required fields
    if (!jobId || !resultId || !status || !errorMessage) {
      return sendError(res, 'VALIDATION_ERROR', 'Missing required fields', {
        jobId: 'Job ID is required',
        resultId: 'Result ID is required',
        status: 'Status is required',
        errorMessage: 'Error message is required'
      }, 400);
    }

    // Get job details for token refund
    const job = jobTracker.getJob(jobId);
    if (!job) {
      return sendNotFound(res, 'Job not found');
    }

    // Update job status to failed
    const updatedJob = jobTracker.updateJobStatus(jobId, status, 0, errorMessage);

    // Refund tokens to user
    try {
      const tokenCost = parseInt(process.env.ANALYSIS_TOKEN_COST || '1');
      await authService.refundTokens(job.userId, null, tokenCost);

      logger.info('Tokens refunded for failed analysis', {
        jobId,
        userId: job.userId,
        refundedAmount: tokenCost
      });
    } catch (refundError) {
      logger.error('Failed to refund tokens for failed analysis', {
        jobId,
        userId: job.userId,
        error: refundError.message
      });
      // Don't fail the callback if refund fails - log and continue
    }

    // Optional: Sync with archive service database
    try {
      await archiveService.syncJobStatus(jobId, status, {
        result_id: resultId,
        error_message: errorMessage
      });
    } catch (syncError) {
      logger.warn('Failed to sync failed job status with archive', {
        jobId,
        error: syncError.message
      });
      // Don't fail the request if sync fails
    }

    logger.info('Job status updated to failed via callback', {
      jobId,
      resultId,
      status,
      errorMessage,
      userId: updatedJob.userId
    });

    return sendSuccess(res, 'Job status updated to failed and tokens refunded', {
      jobId,
      status: updatedJob.status,
      progress: updatedJob.progress,
      error: updatedJob.error,
      updatedAt: updatedJob.updatedAt
    });
  } catch (error) {
    next(error);
  }
});

// All other assessment routes require authentication
router.use(authenticateToken);

/**
 * @route POST /assessment/submit
 * @description Submit assessment data for AI analysis
 * @access Private
 */
router.post('/submit',
  addIdempotencyHeaders,
  validateSchema(assessmentSchema),
  authenticateToken,
  idempotencyMiddleware,
  requireTokenBalance(1),
  async(req, res, next) => {
  try {
    const { id: userId, email: userEmail } = req.user;
    const { assessmentName, ...assessmentData } = req.body;
    const tokenCost = parseInt(process.env.ANALYSIS_TOKEN_COST || '1');

    // Set default assessment name if not provided
    const finalAssessmentName = assessmentName || 'AI-Driven Talent Mapping';

    logger.info('Assessment submission received', {
      userId,
      userEmail,
      assessmentName: finalAssessmentName,
      assessmentTypes: Object.keys(assessmentData),
      ip: req.ip
    });

    // Deduct tokens from user balance
    try {
      const updatedUser = await authService.deductTokens(userId, req.token, tokenCost);
      req.user.tokenBalance = updatedUser.token_balance;
    } catch (error) {
      if (error instanceof AppError && error.code === 'INSUFFICIENT_TOKENS') {
        return sendError(res, 'INSUFFICIENT_TOKENS', error.message, error.details, 402);
      }
      throw error;
    }

    // Generate job ID
    const jobId = uuidv4();

    // Create job in Archive Service first
    try {
      await archiveService.createJob(jobId, userId, assessmentData, finalAssessmentName);
    } catch (archiveError) {
      logger.error('Failed to create job in Archive Service, refunding tokens', {
        jobId,
        userId,
        error: archiveError.message
      });

      // Refund tokens if job creation fails
      try {
        await authService.refundTokens(userId, req.token, tokenCost);
      } catch (refundError) {
        logger.error('Failed to refund tokens after Archive Service error', {
          userId,
          tokenCost,
          error: refundError.message
        });
      }

      throw new AppError('ARCHIVE_SERVICE_ERROR', 'Failed to create job in archive service', 503);
    }

    // Create job in local tracker
    jobTracker.createJob(jobId, userId, userEmail, assessmentData);

    // Publish job to queue with the same jobId
    await queueService.publishAssessmentJob(assessmentData, userId, userEmail, jobId, finalAssessmentName);

    // Get queue position
    const queueStats = await queueService.getQueueStats();

    // Return success response
    return sendSuccess(res, 'Assessment submitted successfully and queued for analysis', {
      jobId,
      status: jobTracker.JOB_STATUS.QUEUED,
      estimatedProcessingTime: '2-5 minutes',
      queuePosition: queueStats.messageCount,
      tokenCost,
      remainingTokens: req.user.tokenBalance
    }, 202);
  } catch (error) {
    next(error);
  }
});
/**
 * @route GET /assessment/status/:jobId
 * @description Get assessment job status
 * @access Private
 */
router.get('/status/:jobId', async(req, res, next) => {
  try {
    const { jobId } = req.params;
    const { id: userId } = req.user;

    // Get job from tracker
    const job = jobTracker.getJob(jobId);

    if (!job) {
      return sendNotFound(res, 'Job not found');
    }

    // Verify job belongs to the authenticated user
    if (job.userId !== userId) {
      return sendError(res, 'FORBIDDEN', 'Access denied to this job', {}, 403);
    }

    // Try to get additional details from archive service
    let archiveJobData = null;
    try {
      archiveJobData = await archiveService.getJobStatus(jobId);
    } catch (archiveError) {
      logger.warn('Failed to get job details from archive service', {
        jobId,
        error: archiveError.message
      });
      // Continue without archive data
    }

    // Get queue statistics for position estimation
    const queueStats = await queueService.getQueueStats();

    const response = {
      jobId,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      estimatedTimeRemaining: job.estimatedTimeRemaining,
      queuePosition: job.status === 'queued' ? queueStats.messageCount : 0,
      userId: job.userId,
      userEmail: job.userEmail
    };

    // Add archive data if available
    if (archiveJobData) {
      response.resultId = archiveJobData.result_id;
      response.assessmentName = archiveJobData.assessment_name;
    }

    // Add error message if job failed
    if (job.error) {
      response.error = job.error;
    }

    return sendSuccess(res, 'Job status retrieved successfully', response);
  } catch (error) {
    next(error);
  }
});





/**
 * @route GET /assessment/queue/status
 * @description Get queue status (for monitoring)
 * @access Private
 */
router.get('/queue/status', async(req, res, next) => {
  try {
    // Get queue statistics
    const queueStats = await queueService.getQueueStats();

    // Get job statistics
    const jobStats = jobTracker.getJobStats();

    // Calculate average processing time (mock data for now)
    const averageProcessingTime = '3.2 minutes';

    // Calculate estimated wait time based on queue length
    let estimatedWaitTime = 'Less than a minute';
    if (queueStats.messageCount > 10) {
      estimatedWaitTime = '10+ minutes';
    } else if (queueStats.messageCount > 5) {
      estimatedWaitTime = '5-10 minutes';
    } else if (queueStats.messageCount > 0) {
      estimatedWaitTime = '1-5 minutes';
    }

    return sendSuccess(res, 'Queue status retrieved successfully', {
      queueLength: queueStats.messageCount,
      activeWorkers: queueStats.consumerCount,
      averageProcessingTime,
      estimatedWaitTime,
      jobStats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /assessment/idempotency/health
 * @description Check idempotency service health
 * @access Private
 */
router.get('/idempotency/health', idempotencyHealthCheck);

/**
 * @route POST /assessment/idempotency/cleanup
 * @description Cleanup expired idempotency cache entries
 * @access Private (Internal use)
 */
router.post('/idempotency/cleanup', cleanupExpiredCache);

module.exports = router;
