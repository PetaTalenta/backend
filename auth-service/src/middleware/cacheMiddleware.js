const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

/**
 * Create cache middleware for responses
 * @param {Object} options - Cache options
 * @param {number} options.ttl - Time to live in seconds
 * @param {string} options.keyPrefix - Cache key prefix
 * @param {Function} options.keyGenerator - Custom key generator function
 * @param {Function} options.shouldCache - Function to determine if response should be cached
 * @returns {Function} Express middleware
 */
const createCacheMiddleware = (options = {}) => {
  const {
    ttl = 300, // 5 minutes default
    keyPrefix = 'response',
    keyGenerator = null,
    shouldCache = null
  } = options;

  return async (req, res, next) => {
    // Skip caching if cache service is not available
    if (!cacheService.isAvailable()) {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator 
      ? keyGenerator(req) 
      : generateDefaultKey(req, keyPrefix);

    // Try to get cached response
    const startTime = Date.now();
    try {
      const cachedResponse = await cacheService.get(cacheKey);
      
      if (cachedResponse) {
        const duration = Date.now() - startTime;
        logger.debug('Cache middleware hit', {
          key: cacheKey,
          duration,
          method: req.method,
          path: req.path
        });

        // Set cache headers
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        
        return res.status(cachedResponse.status).json(cachedResponse.data);
      }
    } catch (error) {
      logger.warn('Cache middleware get failed', {
        key: cacheKey,
        error: error.message
      });
    }

    // Cache miss - continue with request processing
    const originalJson = res.json;
    const originalStatus = res.status;
    let responseStatus = 200;

    // Override status method to capture status code
    res.status = function(code) {
      responseStatus = code;
      return originalStatus.call(this, code);
    };

    // Override json method to cache response
    res.json = function(data) {
      // Check if response should be cached
      if (shouldCacheResponse(req, res, data, shouldCache, responseStatus)) {
        const responseData = {
          status: responseStatus,
          data: data,
          timestamp: new Date().toISOString()
        };

        // Cache the response asynchronously
        cacheService.set(cacheKey, responseData, ttl).catch(error => {
          logger.warn('Cache middleware set failed', {
            key: cacheKey,
            error: error.message
          });
        });

        logger.debug('Cache middleware miss - response cached', {
          key: cacheKey,
          status: responseStatus,
          method: req.method,
          path: req.path,
          ttl
        });
      }

      // Set cache headers
      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Key', cacheKey);

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Generate default cache key
 * @param {Object} req - Express request object
 * @param {string} prefix - Key prefix
 * @returns {string} Cache key
 */
const generateDefaultKey = (req, prefix) => {
  const method = req.method;
  const path = req.path;
  const query = JSON.stringify(req.query);
  const userId = req.user ? req.user.id : 'anonymous';
  
  return `${prefix}:${method}:${path}:${userId}:${Buffer.from(query).toString('base64')}`;
};

/**
 * Determine if response should be cached
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {any} data - Response data
 * @param {Function} shouldCache - Custom should cache function
 * @param {number} status - Response status code
 * @returns {boolean} Should cache response
 */
const shouldCacheResponse = (req, res, data, shouldCache, status) => {
  // Don't cache error responses
  if (status >= 400) {
    return false;
  }

  // Don't cache POST, PUT, DELETE requests by default
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return false;
  }

  // Use custom should cache function if provided
  if (typeof shouldCache === 'function') {
    return shouldCache(req, res, data, status);
  }

  // Default: cache GET requests with 200 status
  return req.method === 'GET' && status === 200;
};

/**
 * Cache middleware for user profile responses
 */
const userProfileCache = createCacheMiddleware({
  ttl: parseInt(process.env.CACHE_TTL_USER) || 3600,
  keyPrefix: 'user-profile',
  keyGenerator: (req) => {
    const userId = req.user ? req.user.id : 'anonymous';
    return `user-profile:${userId}`;
  },
  shouldCache: (req, res, data, status) => {
    return req.method === 'GET' && status === 200 && data && data.user;
  }
});

/**
 * Cache middleware for token verification responses
 */
const tokenVerificationCache = createCacheMiddleware({
  ttl: parseInt(process.env.CACHE_TTL_JWT) || 1800,
  keyPrefix: 'token-verify',
  keyGenerator: (req) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
    return `token-verify:${tokenHash}`;
  },
  shouldCache: (req, res, data, status) => {
    return status === 200 && data && data.user;
  }
});

/**
 * Cache middleware for school data
 */
const schoolDataCache = createCacheMiddleware({
  ttl: 7200, // 2 hours
  keyPrefix: 'school-data',
  keyGenerator: (req) => {
    const userId = req.user ? req.user.id : 'anonymous';
    const path = req.path;
    const query = JSON.stringify(req.query);
    return `school-data:${path}:${userId}:${Buffer.from(query).toString('base64')}`;
  }
});

/**
 * Invalidate cache by pattern
 * @param {string} pattern - Cache key pattern
 * @returns {Promise<number>} Number of invalidated keys
 */
const invalidateCache = async (pattern) => {
  try {
    const deleted = await cacheService.delPattern(pattern);
    logger.info('Cache invalidated', {
      pattern,
      keysDeleted: deleted
    });
    return deleted;
  } catch (error) {
    logger.warn('Cache invalidation failed', {
      pattern,
      error: error.message
    });
    return 0;
  }
};

/**
 * Invalidate user-related cache
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of invalidated keys
 */
const invalidateUserCache = async (userId) => {
  const patterns = [
    `user-profile:${userId}*`,
    `school-data:*:${userId}:*`
  ];

  let totalDeleted = 0;
  for (const pattern of patterns) {
    totalDeleted += await invalidateCache(pattern);
  }

  return totalDeleted;
};

/**
 * Middleware to invalidate cache after user data changes
 */
const invalidateUserCacheMiddleware = (req, res, next) => {
  const originalJson = res.json;

  res.json = function(data) {
    // If response is successful and user data was modified
    if (res.statusCode < 400 && req.user && req.user.id) {
      // Invalidate user cache asynchronously
      invalidateUserCache(req.user.id).catch(error => {
        logger.warn('Failed to invalidate user cache', {
          userId: req.user.id,
          error: error.message
        });
      });
    }

    return originalJson.call(this, data);
  };

  next();
};

module.exports = {
  createCacheMiddleware,
  userProfileCache,
  tokenVerificationCache,
  schoolDataCache,
  invalidateCache,
  invalidateUserCache,
  invalidateUserCacheMiddleware
};
