/**
 * Unified Statistics Controller
 * Handles HTTP requests for all statistics and analytics
 */

const statsService = require('../services/statsService');
const OptimizedQueryService = require('../services/optimizedQueryService');
const cacheService = require('../services/cacheService');
const { sendSuccess, sendError, formatStatsResponse } = require('../utils/responseFormatter');
const { buildPaginationParams, buildSortParams } = require('../utils/queryBuilder');
const logger = require('../utils/logger');

/**
 * Get comprehensive statistics based on type and scope
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getStats = async (req, res, next) => {
  try {
    const { type = 'user', scope = 'overview', timeRange = '7 days' } = req.query;
    const userId = req.user?.id;
    const isInternalService = req.isInternalService;

    let stats;

    switch (type) {
      case 'user':
        if (!userId && !isInternalService) {
          return sendError(res, 'UNAUTHORIZED', 'User authentication required', {}, 401);
        }
        stats = await getUserStatsByScope(userId, scope, timeRange);
        break;

      case 'system':
        if (!isInternalService) {
          return sendError(res, 'FORBIDDEN', 'Internal service access required', {}, 403);
        }
        stats = await getSystemStatsByScope(scope, timeRange);
        break;

      case 'demographic':
        if (!isInternalService) {
          return sendError(res, 'FORBIDDEN', 'Internal service access required', {}, 403);
        }
        stats = await getDemographicStatsByScope(scope, req.query);
        break;

      case 'performance':
        if (!isInternalService) {
          return sendError(res, 'FORBIDDEN', 'Internal service access required', {}, 403);
        }
        stats = await OptimizedQueryService.getPerformanceMetrics();
        break;

      default:
        return sendError(res, 'VALIDATION_ERROR', 'Invalid statistics type', {
          validTypes: ['user', 'system', 'demographic', 'performance']
        }, 400);
    }

    const formattedStats = formatStatsResponse(stats);
    return sendSuccess(res, `${type} statistics retrieved successfully`, formattedStats);
  } catch (error) {
    next(error);
  }
};

/**
 * Get user statistics by scope with caching
 * @param {String} userId - User ID
 * @param {String} scope - Statistics scope
 * @param {String} timeRange - Time range
 * @returns {Promise<Object>} User statistics
 */
const getUserStatsByScope = async (userId, scope, timeRange) => {
  const cacheKey = `user:${userId}:${scope}:${timeRange}`;

  // Try cache first
  let stats = await cacheService.getStats(cacheKey);

  if (!stats) {
    // Cache miss - get from database
    switch (scope) {
      case 'overview':
        stats = await statsService.getUserOverview(userId);
        break;
      case 'detailed':
        stats = await statsService.getUserStats(userId);
        break;
      case 'analysis':
        stats = await OptimizedQueryService.getAnalysisStatistics({ userId, timeRange });
        break;
      default:
        throw new Error(`Invalid user statistics scope: ${scope}`);
    }

    // Cache the result
    await cacheService.cacheStats(cacheKey, stats);
  }

  return stats;
};

/**
 * Get system statistics by scope with caching
 * @param {String} scope - Statistics scope
 * @param {String} timeRange - Time range
 * @returns {Promise<Object>} System statistics
 */
const getSystemStatsByScope = async (scope, timeRange) => {
  const cacheKey = `system:${scope}:${timeRange}`;

  // Try cache first
  let stats = await cacheService.getStats(cacheKey);

  if (!stats) {
    // Cache miss - get from database
    switch (scope) {
      case 'summary':
        stats = await statsService.getSummaryStats();
        break;
      case 'queue':
        stats = await OptimizedQueryService.getJobQueueStats();
        break;
      case 'analysis':
        stats = await OptimizedQueryService.getAnalysisStatistics({ timeRange });
        break;
      default:
        throw new Error(`Invalid system statistics scope: ${scope}`);
    }

    // Cache the result
    await cacheService.cacheStats(cacheKey, stats);
  }

  return stats;
};

/**
 * Get demographic statistics by scope
 * @param {String} scope - Statistics scope
 * @param {Object} filters - Query filters
 * @returns {Promise<Object>} Demographic statistics
 */
const getDemographicStatsByScope = async (scope, filters) => {
  switch (scope) {
    case 'insights':
      return await OptimizedQueryService.getDemographicInsights(filters);
    case 'overview':
      return await statsService.getDemographicOverview(filters);
    default:
      throw new Error(`Invalid demographic statistics scope: ${scope}`);
  }
};

/**
 * Legacy endpoint - Get user statistics
 * @deprecated Use getStats with type=user&scope=detailed instead
 */
const getUserStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stats = await statsService.getUserStats(userId);

    return sendSuccess(res, 'User statistics retrieved successfully', stats);
  } catch (error) {
    next(error);
  }
};

/**
 * Legacy endpoint - Get user overview statistics
 * @deprecated Use getStats with type=user&scope=overview instead
 */
const getUserOverview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const overview = await statsService.getUserOverview(userId);

    return sendSuccess(res, 'User overview retrieved successfully', overview);
  } catch (error) {
    next(error);
  }
};

/**
 * Legacy endpoint - Get summary statistics
 * @deprecated Use getStats with type=system&scope=summary instead
 */
const getSummaryStats = async (req, res, next) => {
  try {
    const summary = await statsService.getSummaryStats();

    return sendSuccess(res, 'Summary statistics retrieved successfully', summary);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  getUserStats,
  getUserOverview,
  getSummaryStats
};
