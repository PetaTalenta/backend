/**
 * Archive Jobs Routes
 * Jobs routes under /archive/jobs prefix for consistency
 */

const express = require('express');
const { authenticateService, requireServiceAuth } = require('../middleware/serviceAuth');
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
 * Get job status by job ID
 */
router.get('/:jobId',
  validateParams(jobIdParamSchema),
  async (req, res, next) => {
    try {
      const { jobId } = req.params;
      const job = await analysisJobsService.getJobByJobId(jobId);

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
 * GET /jobs
 * Get jobs list (internal service only)
 */
router.get('/',
  requireServiceAuth,
  validateQuery(listJobsQuerySchema),
  async (req, res, next) => {
    try {
      const jobs = await analysisJobsService.getJobs(req.query);
      return sendSuccess(res, 'Jobs retrieved successfully', jobs);
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
