const express = require('express');
const adminUserController = require('../controllers/adminUserController');
const adminSystemController = require('../controllers/adminSystemController');
const { authenticateAdmin, requireAdminRole } = require('../middleware/adminAuth');
const { authenticateService } = require('../middleware/serviceAuth');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation');
const {
  logUserListView,
  logUserView,
  logTokenBalanceUpdate,
  logUserDeletion,
  logProfileUpdate,
  logSystemStatsView,
  logJobMonitoringView,
  logAnalyticsView,
  logAssessmentDetailsView,
  logAssessmentSearchView,
  logJobCancellation,
  logJobRetry,
  logBulkJobOperation
} = require('../middleware/activityLogger');
const Joi = require('joi');

const router = express.Router();

// Apply service authentication middleware to all routes
router.use(authenticateService);

// Validation schemas
const updateTokenBalanceSchema = Joi.object({
  token_balance: Joi.number().integer().min(0).required()
    .messages({
      'number.base': 'Token balance must be a number',
      'number.integer': 'Token balance must be an integer',
      'number.min': 'Token balance must be non-negative',
      'any.required': 'Token balance is required'
    }),
  action: Joi.string().valid('set', 'add', 'subtract').default('set')
    .messages({
      'any.only': 'Action must be one of: set, add, subtract'
    })
});

const queryParamsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow('').default(''),
  sortBy: Joi.string().valid('email', 'token_balance', 'created_at', 'updated_at').default('created_at'),
  sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC')
});

const uuidParamSchema = Joi.object({
  userId: Joi.string().uuid().required()
    .messages({
      'string.uuid': 'User ID must be a valid UUID',
      'any.required': 'User ID is required'
    })
});

const resultIdParamSchema = Joi.object({
  resultId: Joi.string().uuid().required()
    .messages({
      'string.uuid': 'Result ID must be a valid UUID',
      'any.required': 'Result ID is required'
    })
});

const updateUserProfileSchema = Joi.object({
  full_name: Joi.string().min(1).max(100).allow(null).optional()
    .messages({
      'string.min': 'Full name must be at least 1 character',
      'string.max': 'Full name must not exceed 100 characters'
    }),
  date_of_birth: Joi.date().iso().max('now').allow(null).optional()
    .messages({
      'date.max': 'Date of birth must be in the past'
    }),
  gender: Joi.string().valid('male', 'female').allow(null).optional()
    .messages({
      'any.only': 'Gender must be either male or female'
    }),
  school_id: Joi.number().integer().positive().allow(null).optional()
    .messages({
      'number.integer': 'School ID must be an integer',
      'number.positive': 'School ID must be positive'
    })
}).min(1)
  .messages({
    'object.min': 'At least one field must be provided for update'
  });

// Phase 3 validation schemas
const dailyAnalyticsQuerySchema = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional()
    .messages({
      'string.pattern.base': 'Date must be in YYYY-MM-DD format'
    })
});

const assessmentSearchQuerySchema = Joi.object({
  user_id: Joi.string().uuid().optional(),
  date_from: Joi.string().isoDate().optional(),
  date_to: Joi.string().isoDate().optional(),
  assessment_name: Joi.string().valid('AI-Driven Talent Mapping', 'AI-Based IQ Test', 'Custom Assessment').optional(),
  status: Joi.string().valid('completed', 'processing', 'failed', 'queued', 'cancelled').optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  offset: Joi.number().integer().min(0).default(0).optional(),
  sort_by: Joi.string().valid('created_at', 'updated_at', 'assessment_name', 'status').default('created_at').optional(),
  sort_order: Joi.string().valid('ASC', 'DESC').default('DESC').optional()
});

// Phase 4 validation schemas - Advanced Job Management
const jobIdParamSchema = Joi.object({
  jobId: Joi.string().uuid().required()
    .messages({
      'string.uuid': 'Job ID must be a valid UUID',
      'any.required': 'Job ID is required'
    })
});

const bulkJobOperationSchema = Joi.object({
  operation: Joi.string().valid('cancel', 'retry').required()
    .messages({
      'any.only': 'Operation must be either "cancel" or "retry"',
      'any.required': 'Operation is required'
    }),
  jobIds: Joi.array().items(Joi.string().uuid()).min(1).max(100).required()
    .messages({
      'array.min': 'At least one job ID is required',
      'array.max': 'Maximum 100 jobs can be processed in a single operation',
      'any.required': 'Job IDs array is required',
      'string.uuid': 'All job IDs must be valid UUIDs'
    })
});

// Validation middleware is now imported from '../middleware/validation'

/**
 * GET /admin/users
 * Get all users with pagination and filtering
 * Requires: admin authentication
 */
router.get('/users',
  authenticateAdmin,
  validateQuery(queryParamsSchema),
  logUserListView(),
  adminUserController.getAllUsers
);

/**
 * GET /admin/users/:userId
 * Get user by ID with detailed information
 * Requires: admin authentication
 */
router.get('/users/:userId',
  authenticateAdmin,
  validateParams(uuidParamSchema),
  logUserView(),
  adminUserController.getUserById
);

/**
 * PUT /admin/users/:userId/profile
 * Update user profile information
 * Requires: admin authentication
 */
router.put('/users/:userId/profile',
  authenticateAdmin,
  validateParams(uuidParamSchema),
  validateBody(updateUserProfileSchema),
  logProfileUpdate(),
  adminUserController.updateUserProfile
);

/**
 * PUT /admin/users/:userId/token-balance
 * Update user token balance
 * Requires: admin authentication
 */
router.put('/users/:userId/token-balance',
  authenticateAdmin,
  validateParams(uuidParamSchema),
  validateBody(updateTokenBalanceSchema),
  logTokenBalanceUpdate(),
  adminUserController.updateUserTokenBalance
);

/**
 * DELETE /admin/users/:userId
 * Delete user (soft delete)
 * Requires: admin authentication with admin or superadmin role
 */
router.delete('/users/:userId',
  authenticateAdmin,
  requireAdminRole(['admin', 'superadmin']),
  validateParams(uuidParamSchema),
  logUserDeletion(),
  adminUserController.deleteUser
);

// ===== PHASE 2: SYSTEM MONITORING & ANALYTICS ENDPOINTS =====

/**
 * GET /admin/stats/global
 * Get global system statistics
 * Requires: admin authentication
 */
router.get('/stats/global',
  authenticateAdmin,
  logSystemStatsView(),
  adminSystemController.getGlobalStats
);

/**
 * GET /admin/jobs/monitor
 * Get job monitoring data with active jobs and queue statistics
 * Requires: admin authentication
 */
router.get('/jobs/monitor',
  authenticateAdmin,
  logJobMonitoringView(),
  adminSystemController.getJobMonitor
);

/**
 * GET /admin/jobs/queue
 * Get queue status information
 * Requires: admin authentication
 */
router.get('/jobs/queue',
  authenticateAdmin,
  logJobMonitoringView(),
  adminSystemController.getQueueStatus
);

// ===== PHASE 3: DEEP ANALYTICS & ASSESSMENT DETAILS ENDPOINTS =====

/**
 * GET /admin/analytics/daily
 * Get daily analytics data with user activity and assessment metrics
 * Requires: admin authentication
 */
router.get('/analytics/daily',
  authenticateAdmin,
  validateQuery(dailyAnalyticsQuerySchema),
  logAnalyticsView(),
  adminSystemController.getDailyAnalytics
);

/**
 * GET /admin/assessments/:resultId/details
 * Get detailed assessment data including test_data, test_result, and processing info
 * Requires: admin authentication
 */
router.get('/assessments/:resultId/details',
  authenticateAdmin,
  validateParams(resultIdParamSchema),
  logAssessmentDetailsView(),
  adminSystemController.getAssessmentDetails
);

/**
 * GET /admin/assessments/search
 * Search assessments with filtering and pagination
 * Requires: admin authentication
 */
router.get('/assessments/search',
  authenticateAdmin,
  validateQuery(assessmentSearchQuerySchema),
  logAssessmentSearchView(),
  adminSystemController.searchAssessments
);

// ===== PHASE 4: ADVANCED JOB MANAGEMENT ENDPOINTS =====

/**
 * POST /admin/jobs/:jobId/cancel
 * Cancel a specific job
 * Requires: admin authentication with admin or superadmin role
 */
router.post('/jobs/:jobId/cancel',
  authenticateAdmin,
  requireAdminRole(['admin', 'superadmin']),
  validateParams(jobIdParamSchema),
  logJobCancellation(),
  adminSystemController.cancelJob
);

/**
 * POST /admin/jobs/:jobId/retry
 * Retry a failed or cancelled job
 * Requires: admin authentication with admin or superadmin role
 */
router.post('/jobs/:jobId/retry',
  authenticateAdmin,
  requireAdminRole(['admin', 'superadmin']),
  validateParams(jobIdParamSchema),
  logJobRetry(),
  adminSystemController.retryJob
);

/**
 * POST /admin/jobs/bulk
 * Perform bulk operations on multiple jobs (cancel/retry)
 * Requires: admin authentication with admin or superadmin role
 */
router.post('/jobs/bulk',
  authenticateAdmin,
  requireAdminRole(['admin', 'superadmin']),
  validateBody(bulkJobOperationSchema),
  logBulkJobOperation(),
  adminSystemController.bulkJobOperation
);

// ===== PHASE 4: PERFORMANCE OPTIMIZATION ENDPOINTS =====

/**
 * GET /admin/performance/report
 * Get comprehensive performance optimization report
 * Requires: admin authentication with superadmin role
 */
router.get('/performance/report',
  authenticateAdmin,
  requireAdminRole(['superadmin']),
  logSystemStatsView(),
  adminSystemController.getPerformanceReport
);

/**
 * POST /admin/performance/optimize
 * Run database optimization procedures
 * Requires: admin authentication with superadmin role
 */
router.post('/performance/optimize',
  authenticateAdmin,
  requireAdminRole(['superadmin']),
  logSystemStatsView(),
  adminSystemController.optimizeDatabase
);

// ===== PHASE 4: SECURITY ENHANCEMENT ENDPOINTS =====

/**
 * GET /admin/security/audit
 * Get security audit report with high-risk events
 * Requires: admin authentication with superadmin role
 */
router.get('/security/audit',
  authenticateAdmin,
  requireAdminRole(['superadmin']),
  logSystemStatsView(),
  adminSystemController.getSecurityAuditReport
);

/**
 * POST /admin/security/anonymize/:userId
 * Anonymize user data for GDPR compliance
 * Requires: admin authentication with superadmin role
 */
router.post('/security/anonymize/:userId',
  authenticateAdmin,
  requireAdminRole(['superadmin']),
  validateParams(uuidParamSchema),
  logUserDeletion(),
  adminSystemController.anonymizeUserData
);

module.exports = router;
