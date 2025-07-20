/**
 * Test Routes
 * Development-only routes for testing purposes
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { validateSchema } = require('../middleware/validation');
const { assessmentSchema } = require('../schemas/assessment');
const queueService = require('../services/queueService');
const archiveService = require('../services/archiveService');
const jobTracker = require('../jobs/jobTracker');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/responseHelper');

const router = express.Router();

/**
 * @route POST /test/submit
 * @description Submit assessment data for testing (no auth required)
 * @access Public (development only)
 */
router.post('/submit', validateSchema(assessmentSchema), async (req, res, next) => {
  try {
    const assessmentData = req.body;
    const userId = uuidv4(); // Generate valid GUID for test
    const userEmail = 'test@example.com';

    logger.info('Test assessment submission received', {
      userId,
      userEmail,
      assessmentTypes: Object.keys(assessmentData),
      ip: req.ip
    });

    // Generate job ID
    const jobId = uuidv4();

    // Create job in Archive Service first (for test environment)
    try {
      await archiveService.createJob(jobId, userId, assessmentData);
    } catch (archiveError) {
      logger.warn('Failed to create job in Archive Service for test (continuing anyway)', {
        jobId,
        userId,
        error: archiveError.message
      });
      // For test environment, we continue even if Archive Service fails
    }

    // Create job in local tracker
    jobTracker.createJob(jobId, userId, userEmail, assessmentData);

    // Publish job to queue with the same jobId
    await queueService.publishAssessmentJob(assessmentData, userId, userEmail, jobId, 'AI-Driven Talent Mapping');

    // Get queue position
    const queueStats = await queueService.getQueueStats();

    // Return success response
    return sendSuccess(res, 'Test assessment submitted successfully and queued for analysis', {
      jobId,
      analysisId: jobId, // For compatibility with test script
      status: jobTracker.JOB_STATUS.QUEUED,
      estimatedProcessingTime: '2-5 minutes',
      queuePosition: queueStats.messageCount,
      userId,
      userEmail
    }, 202);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /test/status/:jobId
 * @description Check test assessment processing status
 * @access Public (development only)
 */
router.get('/status/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;

    // Get job from tracker
    const job = jobTracker.getJob(jobId);

    if (!job) {
      return sendError(res, 'NOT_FOUND', 'Job not found', {}, 404);
    }

    // Get queue statistics
    const queueStats = await queueService.getQueueStats();

    return sendSuccess(res, 'Job status retrieved successfully', {
      jobId,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      estimatedTimeRemaining: job.estimatedTimeRemaining,
      queuePosition: queueStats.messageCount,
      userId: job.userId,
      userEmail: job.userEmail
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
