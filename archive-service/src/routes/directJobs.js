/**
 * Archive Jobs Routes
 * Jobs routes under /archive/jobs prefix for consistency
 */

const express = require('express');
const { authenticateService, requireServiceAuth } = require('../middleware/serviceAuth');
const { authenticateToken } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validation');
const {
  createAnalysisJobSchema,
  updateAnalysisJobStatusSchema,
  jobIdParamSchema,
  listJobsQuerySchema
} = require('../utils/validation');
const analysisJobsService = require('../services/analysisJobsService');
const { sendSuccess, sendError, sendNotFound } = require('../utils/responseFormatter');

const router = express.Router();



// Apply service authentication middleware to all routes
router.use(authenticateService);

/**
 * GET /jobs (explicit route to handle /archive/jobs/jobs)
 * Get jobs list for authenticated user or internal service
 */
router.get('/jobs',
  (req, res, next) => {
    // Allow both authenticated users and internal services
    if (req.isInternalService) {
      return next();
    }
    // For user requests, require authentication
    authenticateToken(req, res, next);
  },
  validateQuery(listJobsQuerySchema),
  async (req, res, next) => {
    try {
      let jobs;
      if (req.isInternalService) {
        // Internal services can get all jobs
        jobs = await analysisJobsService.getJobs(req.query);
      } else {
        // Users can only get their own jobs
        const userQuery = { ...req.query, user_id: req.user.id };
        jobs = await analysisJobsService.getJobsByUser(req.user.id, userQuery);
      }
      return sendSuccess(res, 'Jobs retrieved successfully', jobs);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET / (root route for /archive/jobs)
 * Get jobs list for authenticated user or internal service
 * IMPORTANT: This route must be defined BEFORE /:jobId route
 */
router.get('/',
  (req, res, next) => {
    // Allow both authenticated users and internal services
    if (req.isInternalService) {
      return next();
    }
    // For user requests, require authentication
    authenticateToken(req, res, next);
  },
  validateQuery(listJobsQuerySchema),
  async (req, res, next) => {
    try {
      let jobs;
      if (req.isInternalService) {
        // Internal services can get all jobs
        jobs = await analysisJobsService.getJobs(req.query);
      } else {
        // Users can only get their own jobs
        const userQuery = { ...req.query, user_id: req.user.id };
        jobs = await analysisJobsService.getJobsByUser(req.user.id, userQuery);
      }
      return sendSuccess(res, 'Jobs retrieved successfully', jobs);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /archive/jobs
 * Create new analysis job (internal service only)
 */
router.post('/',
  requireServiceAuth,
  validateBody(createAnalysisJobSchema),
  async (req, res, next) => {
    try {
      const job = await analysisJobsService.createJob(req.body);
      return sendSuccess(res, 'Analysis job created successfully', job, 201);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /archive/jobs/:jobId
 * Get job status by job ID with result data
 * IMPORTANT: This route must be defined AFTER / route
 */
router.get('/:jobId',
  (req, res, next) => {
    // Allow both authenticated users and internal services
    if (req.isInternalService) {
      return next();
    }
    // For user requests, require authentication
    authenticateToken(req, res, next);
  },
  validateParams(jobIdParamSchema),
  async (req, res, next) => {
    try {
      const { jobId } = req.params;
      const job = await analysisJobsService.getJobByJobIdWithResult(jobId);

      if (!job) {
        return sendNotFound(res, 'Job not found');
      }

      // Skip user access check for internal services
      if (!req.isInternalService) {
        // Check if user owns the job or is admin
        if (job.user_id !== req.user.id && req.user.role !== 'admin') {
          return sendError(res, 'FORBIDDEN', 'Access denied', {}, 403);
        }
      }

      return sendSuccess(res, 'Job retrieved successfully', job);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /jobs/:jobId/status
 * Update job status (internal service only)
 */
router.put('/:jobId/status',
  requireServiceAuth,
  validateParams(jobIdParamSchema),
  validateBody(updateAnalysisJobStatusSchema),
  async (req, res, next) => {
    try {
      const { jobId } = req.params;
      const { status, result_id, error_message } = req.body;

      const job = await analysisJobsService.updateJobStatus(jobId, status, {
        result_id,
        error_message
      });

      return sendSuccess(res, 'Job status updated successfully', job);
    } catch (error) {
      next(error);
    }
  }
);



/**
 * DELETE /jobs/:jobId
 * Delete/cancel job (user only)
 */
router.delete('/:jobId',
  validateParams(jobIdParamSchema),
  async (req, res, next) => {
    try {
      const { jobId } = req.params;
      
      // For internal services, allow deletion without user check
      if (req.isInternalService) {
        await analysisJobsService.deleteJobByJobId(jobId);
      } else {
        // For user requests, check ownership
        await analysisJobsService.deleteJob(jobId, req.user.id);
      }
      
      return sendSuccess(res, 'Job deleted successfully');
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
