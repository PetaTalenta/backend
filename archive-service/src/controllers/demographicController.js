/**
 * Demographic Controller
 * Handles demographic analytics endpoints
 */

const demographicService = require('../services/demographicService');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');
const { formatPaginatedResponse } = require('../utils/responseFormatter');

/**
 * Get demographic overview
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getDemographicOverview = async (req, res, next) => {
  try {
    const cacheKey = 'overview';

    // Try to get from cache first
    let overview = await cacheService.getDemographics(cacheKey);

    if (!overview) {
      // Cache miss - get from database
      overview = await demographicService.getDemographicOverview();

      // Cache the result
      await cacheService.cacheDemographics(cacheKey, overview);

      logger.info('Demographic overview requested - cache miss', {
        requestId: req.id,
        isInternalService: req.isInternalService
      });
    } else {
      logger.info('Demographic overview requested - cache hit', {
        requestId: req.id,
        isInternalService: req.isInternalService
      });
    }

    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    logger.error('Error getting demographic overview', {
      requestId: req.id,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get archetype demographics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getArchetypeDemographics = async (req, res, next) => {
  try {
    const { archetype } = req.params;

    if (!archetype) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ARCHETYPE',
          message: 'Archetype parameter is required'
        }
      });
    }

    const cacheKey = `archetype:${archetype}`;

    // Try to get from cache first
    let demographics = await cacheService.getArchetypes(cacheKey);

    if (!demographics) {
      // Cache miss - get from database
      demographics = await demographicService.getArchetypeDemographics(archetype);

      // Cache the result
      await cacheService.cacheArchetypes(cacheKey, demographics);

      logger.info('Archetype demographics requested - cache miss', {
        requestId: req.id,
        archetype,
        isInternalService: req.isInternalService
      });
    } else {
      logger.info('Archetype demographics requested - cache hit', {
        requestId: req.id,
        archetype,
        isInternalService: req.isInternalService
      });
    }

    res.json({
      success: true,
      data: demographics
    });
  } catch (error) {
    logger.error('Error getting archetype demographics', {
      requestId: req.id,
      archetype: req.params.archetype,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get school analytics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getSchoolAnalytics = async (req, res, next) => {
  try {
    const { school } = req.query;
    
    const analytics = await demographicService.getSchoolAnalytics(school);
    
    logger.info('School analytics requested', {
      requestId: req.id,
      schoolFilter: school,
      isInternalService: req.isInternalService
    });
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error getting school analytics', {
      requestId: req.id,
      schoolFilter: req.query.school,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get optimized demographics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getOptimizedDemographics = async (req, res, next) => {
  try {
    const { gender, ageMin, ageMax, schoolOrigin, archetype, limit } = req.query;

    const filters = {};

    if (gender) filters.gender = gender;
    if (ageMin && ageMax) {
      filters.ageRange = { min: parseInt(ageMin), max: parseInt(ageMax) };
    }
    if (schoolOrigin) filters.schoolOrigin = schoolOrigin;
    if (archetype) filters.archetype = archetype;
    if (limit) filters.limit = parseInt(limit);

    const demographics = await demographicService.getOptimizedDemographics(filters);

    logger.info('Optimized demographics requested', {
      requestId: req.id,
      filters,
      isInternalService: req.isInternalService
    });

    res.json({
      success: true,
      data: demographics
    });
  } catch (error) {
    logger.error('Error getting optimized demographics', {
      requestId: req.id,
      filters: req.query,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get demographic trends
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getDemographicTrends = async (req, res, next) => {
  try {
    const { period = 'month', limit = 12 } = req.query;

    const trends = await demographicService.getDemographicTrends({
      period,
      limit: parseInt(limit)
    });

    logger.info('Demographic trends requested', {
      requestId: req.id,
      period,
      limit,
      isInternalService: req.isInternalService
    });

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    logger.error('Error getting demographic trends', {
      requestId: req.id,
      options: req.query,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get performance metrics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getPerformanceMetrics = async (req, res, next) => {
  try {
    const QueryPerformanceMonitor = require('../utils/queryPerformanceMonitor');
    const sequelize = require('../config/database');

    const monitor = new QueryPerformanceMonitor(sequelize);
    const recommendations = await monitor.generateOptimizationRecommendations();
    const indexEffectiveness = await monitor.getIndexEffectiveness();

    logger.info('Performance metrics requested', {
      requestId: req.id,
      isInternalService: req.isInternalService
    });

    res.json({
      success: true,
      data: {
        recommendations,
        indexEffectiveness,
        timestamp: new Date()
      }
    });
  } catch (error) {
    logger.error('Error getting performance metrics', {
      requestId: req.id,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

module.exports = {
  getDemographicOverview,
  getArchetypeDemographics,
  getSchoolAnalytics,
  getOptimizedDemographics,
  getDemographicTrends,
  getPerformanceMetrics
};
