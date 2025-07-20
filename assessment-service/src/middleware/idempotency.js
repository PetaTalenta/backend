/**
 * Idempotency Middleware
 * Handles idempotency checking and response caching for assessment submissions
 */

const idempotencyService = require('../services/idempotencyService');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * Idempotency middleware for assessment submissions
 * This middleware should be placed BEFORE token deduction to prevent unnecessary token loss
 */
const idempotencyMiddleware = async (req, res, next) => {
  try {
    // Skip if idempotency is disabled
    if (!idempotencyService.isEnabled()) {
      logger.debug('Idempotency is disabled, skipping check');
      return next();
    }

    // Extract user and assessment data
    const userId = req.user?.id;
    const assessmentData = req.body;

    if (!userId) {
      logger.warn('Idempotency check skipped: No user ID found');
      return next();
    }

    // Extract or generate idempotency key
    const idempotencyKey = idempotencyService.extractIdempotencyKey(req, userId, assessmentData);

    // Store idempotency key in request for later use
    req.idempotencyKey = idempotencyKey;

    // Check cache for existing response
    const cacheResult = await idempotencyService.checkCache(idempotencyKey);

    if (cacheResult.found) {
      // Cache hit - return cached response
      logger.info('Returning cached response for duplicate request', {
        userId,
        idempotencyKey: idempotencyKey.substring(0, 8) + '...',
        originalTimestamp: cacheResult.createdAt,
        statusCode: cacheResult.statusCode
      });

      // Add idempotency headers to response
      res.set({
        'X-Idempotency-Key': idempotencyKey.substring(0, 16) + '...',
        'X-Idempotency-Cache': 'HIT',
        'X-Idempotency-Original-Timestamp': cacheResult.createdAt.toISOString()
      });

      // Return cached response with original status code
      return res.status(cacheResult.statusCode).json(cacheResult.data);
    }

    // Cache miss - proceed with normal processing
    logger.debug('Idempotency cache miss, proceeding with request', {
      userId,
      idempotencyKey: idempotencyKey.substring(0, 8) + '...'
    });

    // Add idempotency headers for cache miss
    res.set({
      'X-Idempotency-Key': idempotencyKey.substring(0, 16) + '...',
      'X-Idempotency-Cache': 'MISS'
    });

    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);
    let responseCached = false;

    res.json = function(data) {
      // Cache the response if it's a successful submission (status 2xx)
      if (!responseCached && res.statusCode >= 200 && res.statusCode < 300) {
        responseCached = true;
        
        // Store response in cache asynchronously (don't wait)
        idempotencyService.storeResponse(
          idempotencyKey,
          userId,
          assessmentData,
          data,
          res.statusCode
        ).catch(error => {
          logger.error('Failed to cache response after successful processing', {
            userId,
            idempotencyKey: idempotencyKey.substring(0, 8) + '...',
            error: error.message
          });
        });
      }

      // Call original json method
      return originalJson(data);
    };

    // Continue to next middleware
    next();

  } catch (error) {
    logger.error('Idempotency middleware error', {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });

    // Don't fail the request due to idempotency issues
    // Log the error and continue processing
    next();
  }
};

/**
 * Middleware to add idempotency headers to all responses
 */
const addIdempotencyHeaders = (req, res, next) => {
  // Add general idempotency support headers
  res.set({
    'X-Idempotency-Supported': 'true',
    'X-Idempotency-TTL-Hours': process.env.IDEMPOTENCY_TTL_HOURS || '24'
  });

  next();
};

/**
 * Health check endpoint for idempotency service
 */
const idempotencyHealthCheck = async (req, res) => {
  try {
    if (!idempotencyService.isEnabled()) {
      return res.json({
        success: true,
        message: 'Idempotency service is disabled',
        data: {
          enabled: false,
          status: 'disabled'
        }
      });
    }

    // Get cache statistics
    const stats = await idempotencyService.getCacheStats();

    return res.json({
      success: true,
      message: 'Idempotency service is healthy',
      data: {
        enabled: true,
        status: 'healthy',
        cacheStats: stats,
        config: {
          ttlHours: process.env.IDEMPOTENCY_TTL_HOURS || '24',
          maxCacheSize: process.env.IDEMPOTENCY_MAX_CACHE_SIZE || '10000'
        }
      }
    });

  } catch (error) {
    logger.error('Idempotency health check failed', {
      error: error.message
    });

    return res.status(503).json({
      success: false,
      error: 'IDEMPOTENCY_SERVICE_ERROR',
      message: 'Idempotency service health check failed',
      data: {
        enabled: idempotencyService.isEnabled(),
        status: 'unhealthy',
        error: error.message
      }
    });
  }
};

/**
 * Cleanup endpoint for expired cache entries (internal use)
 */
const cleanupExpiredCache = async (req, res) => {
  try {
    const deletedCount = await idempotencyService.cleanupExpired();

    return res.json({
      success: true,
      message: 'Cache cleanup completed',
      data: {
        deletedEntries: deletedCount
      }
    });

  } catch (error) {
    logger.error('Cache cleanup failed', {
      error: error.message
    });

    return res.status(500).json({
      success: false,
      error: 'CLEANUP_ERROR',
      message: 'Failed to cleanup expired cache entries',
      data: {
        error: error.message
      }
    });
  }
};

module.exports = {
  idempotencyMiddleware,
  addIdempotencyHeaders,
  idempotencyHealthCheck,
  cleanupExpiredCache
};
