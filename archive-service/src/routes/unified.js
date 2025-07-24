/**
 * Unified API Routes
 * Consolidates multiple endpoints into efficient, RESTful routes
 */

const express = require('express');
const resultsController = require('../controllers/resultsController');
const statsController = require('../controllers/statsController');
const demographicController = require('../controllers/demographicController');
const analysisJobsService = require('../services/analysisJobsService');
const OptimizedQueryService = require('../services/optimizedQueryService');
const { authenticateToken } = require('../middleware/auth');
const { authenticateService, requireServiceAuth } = require('../middleware/serviceAuth');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation');
const { sendSuccess, sendError, sendNotFound, sendPaginatedSuccess } = require('../utils/responseFormatter');
const { buildPaginationParams, buildSortParams } = require('../utils/queryBuilder');

const router = express.Router();

// Apply service authentication middleware to all routes
router.use(authenticateService);

/**
 * GET /archive/v1/stats
 * Unified statistics endpoint
 * Query parameters:
 * - type: user|system|demographic|performance
 * - scope: overview|detailed|analysis|summary|queue|insights
 * - timeRange: 1 day|7 days|30 days|90 days
 * - Additional filters for demographic type
 */
router.get('/stats', 
  (req, res, next) => {
    // Allow both authenticated users and internal services
    if (req.isInternalService) {
      return next();
    }
    // For user requests, require authentication
    authenticateToken(req, res, next);
  },
  statsController.getStats
);

/**
 * GET /archive/v1/analytics
 * Advanced analytics endpoint with filtering and aggregation
 * Query parameters:
 * - metric: results|jobs|demographics|performance
 * - aggregation: count|avg|sum|min|max
 * - groupBy: date|archetype|gender|school|status
 * - filters: JSON string with filter criteria
 */
router.get('/analytics',
  requireServiceAuth,
  async (req, res, next) => {
    try {
      const { 
        metric = 'results', 
        aggregation = 'count', 
        groupBy = 'date',
        filters = '{}',
        timeRange = '7 days'
      } = req.query;

      let parsedFilters;
      try {
        parsedFilters = JSON.parse(filters);
      } catch (error) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid filters JSON', {}, 400);
      }

      let analytics;
      switch (metric) {
        case 'results':
          analytics = await getResultsAnalytics(aggregation, groupBy, parsedFilters, timeRange);
          break;
        case 'jobs':
          analytics = await getJobsAnalytics(aggregation, groupBy, parsedFilters, timeRange);
          break;
        case 'demographics':
          analytics = await OptimizedQueryService.getDemographicInsights(parsedFilters);
          break;
        case 'performance':
          analytics = await OptimizedQueryService.getPerformanceMetrics();
          break;
        default:
          return sendError(res, 'VALIDATION_ERROR', 'Invalid metric type', {
            validMetrics: ['results', 'jobs', 'demographics', 'performance']
          }, 400);
      }

      return sendSuccess(res, 'Analytics data retrieved successfully', analytics);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /archive/v1/data/:type
 * Unified data retrieval endpoint
 * Supports: results, jobs, demographics
 */
router.get('/data/:type',
  authenticateToken,
  async (req, res, next) => {
    try {
      const { type } = req.params;
      const userId = req.user.id;
      const pagination = buildPaginationParams(req.query);
      const sorting = buildSortParams(req.query, ['created_at', 'updated_at', 'status']);

      let data, totalCount;

      switch (type) {
        case 'results':
          const resultsData = await getResultsData(userId, pagination, sorting, req.query);
          data = resultsData.results;
          totalCount = resultsData.total;
          break;

        case 'jobs':
          const jobsData = await getJobsData(userId, pagination, sorting, req.query);
          data = jobsData.jobs;
          totalCount = jobsData.total;
          break;

        case 'demographics':
          if (!req.isInternalService) {
            return sendError(res, 'FORBIDDEN', 'Internal service access required', {}, 403);
          }
          const demoData = await OptimizedQueryService.getDemographicInsights(req.query);
          data = demoData.insights;
          totalCount = demoData.total_records;
          break;

        default:
          return sendError(res, 'VALIDATION_ERROR', 'Invalid data type', {
            validTypes: ['results', 'jobs', 'demographics']
          }, 400);
      }

      const paginationInfo = {
        ...pagination,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pagination.limit),
        hasNext: pagination.page < Math.ceil(totalCount / pagination.limit),
        hasPrev: pagination.page > 1
      };

      return sendPaginatedSuccess(res, `${type} data retrieved successfully`, data, paginationInfo);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/batch/:operation
 * Unified batch operations endpoint
 */
router.post('/batch/:operation',
  requireServiceAuth,
  async (req, res, next) => {
    try {
      const { operation } = req.params;
      const { items = [], options = {} } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return sendError(res, 'VALIDATION_ERROR', 'Items array is required and cannot be empty', {}, 400);
      }

      let result;
      switch (operation) {
        case 'create-results':
          result = await resultsController.createResultsBatch({ body: { items, options } }, res, next);
          break;

        case 'update-jobs':
          result = await batchUpdateJobs(items, options);
          break;

        case 'cleanup':
          result = await batchCleanup(options);
          break;

        default:
          return sendError(res, 'VALIDATION_ERROR', 'Invalid batch operation', {
            validOperations: ['create-results', 'update-jobs', 'cleanup']
          }, 400);
      }

      return sendSuccess(res, `Batch ${operation} completed successfully`, result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /archive/v1/health/:component
 * Unified health check endpoint
 */
router.get('/health/:component?',
  async (req, res, next) => {
    try {
      const { component = 'all' } = req.params;
      
      const health = {
        timestamp: new Date().toISOString(),
        service: 'archive-service',
        version: '1.0.0'
      };

      switch (component) {
        case 'database':
          health.database = await checkDatabaseHealth();
          break;
        case 'queue':
          health.queue = await OptimizedQueryService.getJobQueueStats();
          break;
        case 'performance':
          health.performance = await getPerformanceHealth();
          break;
        case 'all':
        default:
          health.database = await checkDatabaseHealth();
          health.queue = await OptimizedQueryService.getJobQueueStats();
          health.performance = await getPerformanceHealth();
          break;
      }

      const status = determineHealthStatus(health);
      return res.status(status === 'healthy' ? 200 : 503).json({
        success: status === 'healthy',
        status,
        data: health
      });
    } catch (error) {
      next(error);
    }
  }
);

// Helper functions
const getResultsData = async (userId, pagination, sorting, filters) => {
  // Implementation for getting results data
  const { AnalysisResult } = require('../models');
  return await AnalysisResult.findByUserWithPagination(userId, {
    page: pagination.page,
    limit: pagination.limit,
    sort: sorting.sort,
    order: sorting.order,
    status: filters.status
  });
};

const getJobsData = async (userId, pagination, sorting, filters) => {
  // Implementation for getting jobs data
  return await analysisJobsService.getJobsByUser(userId, {
    limit: pagination.limit,
    offset: pagination.offset,
    status: filters.status,
    sort: sorting.sort,
    order: sorting.order
  });
};

const batchUpdateJobs = async (items, options) => {
  // Implementation for batch updating jobs
  const results = [];
  for (const item of items) {
    try {
      const updated = await analysisJobsService.updateJobStatus(
        item.job_id, 
        item.status, 
        item.data || {}
      );
      results.push({ success: true, job_id: item.job_id, data: updated });
    } catch (error) {
      results.push({ success: false, job_id: item.job_id, error: error.message });
    }
  }
  return { processed: items.length, results };
};

const batchCleanup = async (options) => {
  // Implementation for batch cleanup
  const { daysOld = 30, dryRun = false } = options;
  
  if (dryRun) {
    // Return what would be cleaned up without actually doing it
    return await analysisJobsService.getCleanupPreview(daysOld);
  }
  
  return await analysisJobsService.cleanupOldJobs(daysOld);
};

const checkDatabaseHealth = async () => {
  try {
    const { sequelize } = require('../config/database');
    await sequelize.authenticate();
    return { status: 'healthy', message: 'Database connection successful' };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
};

const getPerformanceHealth = async () => {
  try {
    const metrics = await OptimizedQueryService.getPerformanceMetrics();
    // Analyze metrics to determine health
    const avgIndexScans = metrics.index_statistics.reduce((sum, idx) => sum + (idx.scans || 0), 0) / metrics.index_statistics.length;
    
    return {
      status: avgIndexScans > 0 ? 'healthy' : 'warning',
      avg_index_scans: avgIndexScans,
      total_indexes: metrics.index_statistics.length
    };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
};

const determineHealthStatus = (health) => {
  const components = [health.database?.status, health.performance?.status];
  
  if (components.includes('unhealthy')) return 'unhealthy';
  if (components.includes('warning')) return 'warning';
  return 'healthy';
};

module.exports = router;
