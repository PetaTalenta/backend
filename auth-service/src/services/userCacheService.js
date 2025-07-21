const { LRUCache } = require('lru-cache');
const logger = require('../utils/logger');

class UserCacheService {
  constructor() {
    this.isEnabled = process.env.ENABLE_USER_CACHE === 'true';
    this.maxSize = parseInt(process.env.USER_CACHE_MAX_SIZE) || 1000;
    this.ttl = parseInt(process.env.CACHE_TTL_USER) * 1000 || 3600000; // Convert to milliseconds
    
    if (this.isEnabled) {
      this.cache = new LRUCache({
        max: this.maxSize,
        ttl: this.ttl,
        updateAgeOnGet: true,
        updateAgeOnHas: true,
        allowStale: false
      });

      logger.info('User cache service initialized', {
        maxSize: this.maxSize,
        ttl: this.ttl / 1000 + 's',
        enabled: this.isEnabled
      });

      // Setup periodic stats logging
      this.setupStatsLogging();
    } else {
      logger.info('User cache service disabled');
    }
  }

  /**
   * Setup periodic statistics logging
   */
  setupStatsLogging() {
    if (process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
      setInterval(() => {
        const stats = this.getStats();
        if (stats.size > 0) {
          logger.debug('User cache statistics', stats);
        }
      }, 60000); // Log every minute
    }
  }

  /**
   * Generate cache key for user
   * @param {string} userId - User ID
   * @returns {string} Cache key
   */
  generateUserKey(userId) {
    return `user:${userId}`;
  }

  /**
   * Generate cache key for user by email
   * @param {string} email - User email
   * @returns {string} Cache key
   */
  generateEmailKey(email) {
    return `email:${email.toLowerCase()}`;
  }

  /**
   * Get user from cache by ID
   * @param {string} userId - User ID
   * @returns {Object|null} User data or null
   */
  getUserById(userId) {
    if (!this.isEnabled || !this.cache) {
      return null;
    }

    const startTime = Date.now();
    try {
      const key = this.generateUserKey(userId);
      const user = this.cache.get(key);
      const duration = Date.now() - startTime;

      if (user) {
        logger.debug('User cache hit by ID', {
          userId,
          duration,
          cacheSize: this.cache.size
        });
        return user;
      } else {
        logger.debug('User cache miss by ID', {
          userId,
          duration
        });
        return null;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.warn('User cache get by ID failed', {
        userId,
        error: error.message,
        duration
      });
      return null;
    }
  }

  /**
   * Get user from cache by email
   * @param {string} email - User email
   * @returns {Object|null} User data or null
   */
  getUserByEmail(email) {
    if (!this.isEnabled || !this.cache) {
      return null;
    }

    const startTime = Date.now();
    try {
      const key = this.generateEmailKey(email);
      const user = this.cache.get(key);
      const duration = Date.now() - startTime;

      if (user) {
        logger.debug('User cache hit by email', {
          email,
          duration,
          cacheSize: this.cache.size
        });
        return user;
      } else {
        logger.debug('User cache miss by email', {
          email,
          duration
        });
        return null;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.warn('User cache get by email failed', {
        email,
        error: error.message,
        duration
      });
      return null;
    }
  }

  /**
   * Set user in cache
   * @param {Object} user - User data
   * @returns {boolean} Success status
   */
  setUser(user) {
    if (!this.isEnabled || !this.cache || !user || !user.id) {
      return false;
    }

    const startTime = Date.now();
    try {
      // Cache by user ID
      const userKey = this.generateUserKey(user.id);
      this.cache.set(userKey, user);

      // Cache by email if available
      if (user.email) {
        const emailKey = this.generateEmailKey(user.email);
        this.cache.set(emailKey, user);
      }

      const duration = Date.now() - startTime;
      logger.debug('User cached successfully', {
        userId: user.id,
        email: user.email,
        duration,
        cacheSize: this.cache.size
      });

      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.warn('User cache set failed', {
        userId: user.id,
        error: error.message,
        duration
      });
      return false;
    }
  }

  /**
   * Remove user from cache
   * @param {string} userId - User ID
   * @param {string} email - User email (optional)
   * @returns {boolean} Success status
   */
  removeUser(userId, email = null) {
    if (!this.isEnabled || !this.cache) {
      return false;
    }

    try {
      let removed = false;

      // Remove by user ID
      if (userId) {
        const userKey = this.generateUserKey(userId);
        removed = this.cache.delete(userKey) || removed;
      }

      // Remove by email if provided
      if (email) {
        const emailKey = this.generateEmailKey(email);
        removed = this.cache.delete(emailKey) || removed;
      }

      if (removed) {
        logger.debug('User removed from cache', {
          userId,
          email,
          cacheSize: this.cache.size
        });
      }

      return removed;
    } catch (error) {
      logger.warn('User cache remove failed', {
        userId,
        email,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Clear all cached users
   * @returns {boolean} Success status
   */
  clear() {
    if (!this.isEnabled || !this.cache) {
      return false;
    }

    try {
      const sizeBefore = this.cache.size;
      this.cache.clear();
      
      logger.info('User cache cleared', {
        itemsRemoved: sizeBefore
      });

      return true;
    } catch (error) {
      logger.warn('User cache clear failed', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    if (!this.isEnabled || !this.cache) {
      return {
        enabled: false,
        size: 0,
        maxSize: this.maxSize,
        ttl: this.ttl
      };
    }

    return {
      enabled: true,
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl / 1000, // Convert back to seconds
      calculatedSize: this.cache.calculatedSize,
      hitRatio: this.calculateHitRatio()
    };
  }

  /**
   * Calculate cache hit ratio
   * @returns {number} Hit ratio percentage
   */
  calculateHitRatio() {
    if (!this.cache || !this.cache.size) {
      return 0;
    }

    // This is a simplified calculation
    // In a real implementation, you'd track hits and misses
    return Math.round((this.cache.size / this.maxSize) * 100);
  }

  /**
   * Warm up cache with frequently accessed users
   * @param {Array} users - Array of user objects
   * @returns {number} Number of users cached
   */
  warmUp(users) {
    if (!this.isEnabled || !this.cache || !Array.isArray(users)) {
      return 0;
    }

    let cached = 0;
    const startTime = Date.now();

    try {
      users.forEach(user => {
        if (this.setUser(user)) {
          cached++;
        }
      });

      const duration = Date.now() - startTime;
      logger.info('User cache warmed up', {
        usersProvided: users.length,
        usersCached: cached,
        duration,
        cacheSize: this.cache.size
      });

      return cached;
    } catch (error) {
      logger.warn('User cache warm up failed', {
        error: error.message,
        usersCached: cached
      });
      return cached;
    }
  }

  /**
   * Check if cache is enabled and available
   * @returns {boolean} Availability status
   */
  isAvailable() {
    return this.isEnabled && this.cache !== null;
  }
}

// Create singleton instance
const userCacheService = new UserCacheService();

module.exports = userCacheService;
