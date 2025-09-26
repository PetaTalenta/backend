/**
 * Results Routes
 * Defines routes for analysis results management
 */

const express = require('express');
const resultsController = require('../controllers/resultsController');

const { authenticateToken } = require('../middleware/auth');
const { authenticateService, requireServiceAuth } = require('../middleware/serviceAuth');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation');
const { sendSuccess, sendError, sendNotFound } = require('../utils/responseFormatter');
const {
  updateAnalysisResultSchema,
  listResultsQuerySchema,
  uuidParamSchema,
  jobIdParamSchema,
  updateAnalysisJobStatusSchema,
  createAnalysisJobSchema,
  togglePublicStatusSchema
} = require('../utils/validation');

const router = express.Router();



// Apply service authentication middleware to all routes
router.use(authenticateService);

/**
 * GET /archive/results
 * Get analysis results for authenticated user
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
  validateQuery(listResultsQuerySchema),
  resultsController.getResults
);

/**
 * GET /archive/results/:id
 * Get specific analysis result by ID
 */
router.get('/:id',
  validateParams(uuidParamSchema),
  resultsController.getResultById
);

/**
 * POST /archive/results
 * Create new analysis result (internal service only)
 * Note: Validation is centralized in assessment-service - no additional validation needed here
 */
router.post('/',
  requireServiceAuth,
  // No validation middleware - data is already validated by assessment-service
  resultsController.createResult
);

/**
 * POST /archive/results/batch
 * Create multiple analysis results in batch (internal service only)
 */
router.post('/batch',
  requireServiceAuth,
  resultsController.createResultsBatch
);

/**
 * PUT /archive/results/:id
 * Update analysis result
 */
router.put('/:id',
  validateParams(uuidParamSchema),
  validateBody(updateAnalysisResultSchema),
  (req, res, next) => {
    // Allow both authenticated users and internal services
    if (req.isInternalService) {
      return next();
    }
    // For user requests, require authentication
    authenticateToken(req, res, next);
  },
  resultsController.updateResult
);

/**
 * DELETE /archive/results/:id
 * Delete analysis result (user only)
 */
router.delete('/:id',
  authenticateToken,
  validateParams(uuidParamSchema),
  resultsController.deleteResult
);

/**
 * PATCH /archive/results/:id/public
 * Toggle public status of analysis result (DISABLED - all results are now always public)
 */
// router.patch('/:id/public',
//   authenticateToken,
//   validateParams(uuidParamSchema),
//   validateBody(togglePublicStatusSchema),
//   resultsController.togglePublicStatus
// );

/**
 * GET /archive/batch/stats
 * Get batch processing statistics (internal service only)
 */
router.get('/batch/stats',
  requireServiceAuth,
  resultsController.getBatchStats
);

/**
 * POST /archive/batch/process
 * Force process current batch (internal service only)
 */
router.post('/batch/process',
  requireServiceAuth,
  resultsController.forceBatchProcess
);

/**
 * POST /archive/batch/clear
 * Clear batch queue - emergency operation (internal service only)
 */
router.post('/batch/clear',
  requireServiceAuth,
  resultsController.clearBatchQueue
);

/**
 * Analysis Jobs Routes
 */

/**
 * POST /archive/jobs
 * Create new analysis job (internal service only)
 */
router.post('/jobs',
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
router.get('/jobs/:jobId',
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
 * PUT /archive/jobs/:jobId/status
 * Update job status (internal service only)
 */
router.put('/jobs/:jobId/status',
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

// Note: Jobs routes moved to /archive/jobs (directJobs.js) for better organization

/**
 * GET /archive/jobs/stats
 * Get job statistics for authenticated user
 */
router.get('/jobs/stats',
  authenticateToken,
  async (req, res, next) => {
    try {
      const stats = await analysisJobsService.getJobStats(req.user.id);
      return sendSuccess(res, 'Job statistics retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /archive/jobs/:jobId
 * Delete/cancel job (user only)
 */
router.delete('/jobs/:jobId',
  authenticateToken,
  validateParams(jobIdParamSchema),
  async (req, res, next) => {
    try {
      const { jobId } = req.params;
      await analysisJobsService.deleteJob(jobId, req.user.id);
      return sendSuccess(res, 'Job deleted successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Development only: Create user endpoint
if (process.env.NODE_ENV === 'development') {
  router.post('/dev/create-user',
    requireServiceAuth,
    async (req, res) => {
      try {
        const { user_id, email } = req.body;

        if (!user_id || !email) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'user_id and email are required'
            }
          });
        }

        const { sequelize } = require('../config/database');

        await sequelize.query(`
          INSERT INTO auth.users (id, email, password_hash, token_balance)
          VALUES (:userId, :email, :passwordHash, :tokenBalance)
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            token_balance = EXCLUDED.token_balance
        `, {
          replacements: {
            userId: user_id,
            email: email,
            passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.G',
            tokenBalance: 100
          }
        });

        res.json({
          success: true,
          message: 'User created successfully',
          data: { user_id, email }
        });
      } catch (error) {
        console.error('Failed to create user:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create user'
          }
        });
      }
    }
  );
}

module.exports = router;
