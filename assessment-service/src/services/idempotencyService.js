/**
 * Idempotency Service
 * Handles idempotency logic for assessment submissions
 */

const IdempotencyCache = require('../models/IdempotencyCache');
const { 
  generateIdempotencyKey, 
  generateRequestHash, 
  sanitizeIdempotencyKey,
  generateFallbackKey 
} = require('../utils/hashGenerator');
const logger = require('../utils/logger');

class IdempotencyService {
  constructor() {
    this.defaultTTLHours = parseInt(process.env.IDEMPOTENCY_TTL_HOURS || '24');
    this.maxCacheSize = parseInt(process.env.IDEMPOTENCY_MAX_CACHE_SIZE || '10000');
    this.enabled = process.env.IDEMPOTENCY_ENABLED === 'true';
  }

  /**
   * Check if idempotency is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Extract or generate idempotency key from request
   * @param {Object} req - Express request object
   * @param {string} userId - User ID
   * @param {Object} assessmentData - Assessment data
   * @returns {string} - Idempotency key
   */
  extractIdempotencyKey(req, userId, assessmentData) {
    try {
      // Priority 1: Client-provided header
      const clientKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
      if (clientKey) {
        const sanitizedKey = sanitizeIdempotencyKey(clientKey);
        if (sanitizedKey) {
          logger.debug('Using client-provided idempotency key', {
            userId,
            keyLength: sanitizedKey.length
          });
          return sanitizedKey;
        } else {
          logger.warn('Invalid client-provided idempotency key, generating fallback', {
            userId,
            originalKey: clientKey.substring(0, 20) + '...'
          });
        }
      }

      // Priority 2: Auto-generated from request data
      const generatedKey = generateFallbackKey(userId, assessmentData);
      
      logger.debug('Generated fallback idempotency key', {
        userId,
        keyLength: generatedKey.length
      });
      
      return generatedKey;
    } catch (error) {
      logger.error('Failed to extract/generate idempotency key', {
        userId,
        error: error.message
      });
      throw new Error('Failed to process idempotency key');
    }
  }

  /**
   * Check for cached response
   * @param {string} idempotencyKey - Idempotency key
   * @returns {Promise<Object|null>} - Cached response or null
   */
  async checkCache(idempotencyKey) {
    try {
      const cached = await IdempotencyCache.findByKey(idempotencyKey);
      
      if (cached) {
        logger.info('Idempotency cache hit', {
          idempotencyKey: idempotencyKey.substring(0, 8) + '...',
          userId: cached.user_id,
          statusCode: cached.status_code,
          createdAt: cached.created_at
        });
        
        return {
          found: true,
          data: cached.response_data,
          statusCode: cached.status_code,
          createdAt: cached.created_at
        };
      }
      
      logger.debug('Idempotency cache miss', {
        idempotencyKey: idempotencyKey.substring(0, 8) + '...'
      });
      
      return { found: false };
    } catch (error) {
      logger.error('Failed to check idempotency cache', {
        idempotencyKey: idempotencyKey.substring(0, 8) + '...',
        error: error.message
      });
      // Don't throw error - allow request to proceed without cache
      return { found: false };
    }
  }

  /**
   * Store response in cache
   * @param {string} idempotencyKey - Idempotency key
   * @param {string} userId - User ID
   * @param {Object} requestData - Original request data
   * @param {Object} responseData - Response data to cache
   * @param {number} statusCode - HTTP status code
   * @returns {Promise<boolean>} - Success status
   */
  async storeResponse(idempotencyKey, userId, requestData, responseData, statusCode) {
    try {
      // Generate request hash
      const requestHash = generateRequestHash(requestData);
      
      // Store in cache
      await IdempotencyCache.storeResponse(
        idempotencyKey,
        userId,
        requestHash,
        responseData,
        statusCode,
        this.defaultTTLHours
      );
      
      logger.info('Response stored in idempotency cache', {
        idempotencyKey: idempotencyKey.substring(0, 8) + '...',
        userId,
        statusCode,
        ttlHours: this.defaultTTLHours
      });
      
      // Cleanup user cache if needed (async, don't wait)
      this.cleanupUserCacheAsync(userId);
      
      return true;
    } catch (error) {
      logger.error('Failed to store response in idempotency cache', {
        idempotencyKey: idempotencyKey.substring(0, 8) + '...',
        userId,
        statusCode,
        error: error.message
      });
      // Don't throw error - the response was already sent successfully
      return false;
    }
  }

  /**
   * Cleanup expired cache entries
   * @returns {Promise<number>} - Number of deleted entries
   */
  async cleanupExpired() {
    try {
      const deletedCount = await IdempotencyCache.cleanupExpired();
      
      if (deletedCount > 0) {
        logger.info('Cleaned up expired idempotency cache entries', {
          deletedCount
        });
      }
      
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired idempotency cache', {
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Cleanup user cache asynchronously (for cache size management)
   * @param {string} userId - User ID
   */
  async cleanupUserCacheAsync(userId) {
    try {
      const deletedCount = await IdempotencyCache.cleanupUserCache(userId, this.maxCacheSize);
      
      if (deletedCount > 0) {
        logger.info('Cleaned up user idempotency cache', {
          userId,
          deletedCount,
          maxCacheSize: this.maxCacheSize
        });
      }
    } catch (error) {
      logger.error('Failed to cleanup user idempotency cache', {
        userId,
        error: error.message
      });
      // Don't throw - this is background cleanup
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} - Cache statistics
   */
  async getCacheStats() {
    try {
      const totalEntries = await IdempotencyCache.count();
      const expiredEntries = await IdempotencyCache.count({
        where: {
          expires_at: {
            [IdempotencyCache.sequelize.Sequelize.Op.lt]: new Date()
          }
        }
      });
      
      return {
        totalEntries,
        activeEntries: totalEntries - expiredEntries,
        expiredEntries
      };
    } catch (error) {
      logger.error('Failed to get cache statistics', {
        error: error.message
      });
      return {
        totalEntries: 0,
        activeEntries: 0,
        expiredEntries: 0
      };
    }
  }
}

// Export singleton instance
module.exports = new IdempotencyService();
