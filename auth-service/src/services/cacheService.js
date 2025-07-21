const Redis = require('ioredis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.keyPrefix = process.env.REDIS_KEY_PREFIX || 'atma:auth:';

    // Don't auto-initialize Redis in constructor anymore
    // It will be initialized explicitly via the initialize() method
  }

  /**
   * Initialize Redis connection with timeout and graceful fallback
   */
  async initialize() {
    // Check if Redis should be disabled
    if (process.env.DISABLE_REDIS === 'true' || process.env.ENABLE_CACHE !== 'true') {
      logger.info('Redis disabled by configuration - cache service will run in no-op mode', {
        DISABLE_REDIS: process.env.DISABLE_REDIS,
        ENABLE_CACHE: process.env.ENABLE_CACHE
      });
      this.isConnected = false;
      return;
    }

    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB) || 0,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 1, // Reduced retries for faster failure
        lazyConnect: true,
        connectTimeout: 3000, // 3 second timeout
        commandTimeout: 2000, // 2 second command timeout
        enableOfflineQueue: false, // Don't queue commands when offline
        enableAutoPipelining: false,
        retryDelayOnClusterDown: 300,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: null, // Don't retry on connection failure
        autoResubscribe: false, // Don't auto-resubscribe
        autoResendUnfulfilledCommands: false // Don't resend commands
      };

      this.redis = new Redis(redisConfig);

      // Set up event handlers
      this.setupEventHandlers();

      // Connect to Redis with timeout
      const connectPromise = this.redis.connect();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis connection timeout')), 3000)
      );

      await Promise.race([connectPromise, timeoutPromise]);

      logger.info('Cache service initialized successfully');
    } catch (error) {
      logger.warn('Failed to initialize cache service - running without cache', { error: error.message });
      // Don't throw error - allow service to run without cache
      this.isConnected = false;
      this.redis = null;
    }
  }

  /**
   * Set up Redis event handlers
   */
  setupEventHandlers() {
    if (!this.redis) return;

    this.redis.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis connected successfully', {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        db: process.env.REDIS_DB
      });
    });

    this.redis.on('ready', () => {
      this.isConnected = true;
      logger.info('Redis ready for commands');
    });

    this.redis.on('error', (error) => {
      this.isConnected = false;
      // Log as warning instead of error to avoid noise when Redis is unavailable
      logger.warn('Redis connection error - caching disabled', {
        error: error.message,
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        fallback: 'Application will continue without caching'
      });

      // Disconnect to prevent automatic reconnection attempts
      if (this.redis && this.redis.status !== 'end') {
        this.redis.disconnect();
      }
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      logger.info('Redis connection closed - caching disabled');
    });

    this.redis.on('end', () => {
      this.isConnected = false;
      logger.info('Redis connection ended');
    });
  }

  /**
   * Legacy initialization method - now calls the new initialize method
   */
  initializeRedis() {
    // Call the new async initialize method but don't await it
    // This maintains backward compatibility
    this.initialize().catch(error => {
      logger.warn('Redis initialization failed', { error: error.message });
    });
  }

  /**
   * Generate cache key with prefix
   * @param {string} key - Base key
   * @returns {string} Prefixed key
   */
  generateKey(key) {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Get value from cache with graceful fallback
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached value or null
   */
  async get(key) {
    // Graceful fallback when Redis is not available
    if (!this.isConnected || !this.redis) {
      logger.debug('Cache get skipped - Redis not available', { key });
      return null;
    }

    const startTime = Date.now();
    try {
      const fullKey = this.generateKey(key);
      const value = await this.redis.get(fullKey);
      const duration = Date.now() - startTime;

      if (value) {
        logger.debug('Cache hit', {
          key: fullKey,
          duration,
          size: value.length
        });
        return JSON.parse(value);
      } else {
        logger.debug('Cache miss', {
          key: fullKey,
          duration
        });
        return null;
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      // Handle connection errors gracefully
      if (this.isConnectionError(error)) {
        this.isConnected = false;
        logger.warn('Cache get failed - connection lost', {
          key,
          error: error.message,
          duration,
          action: 'Disabling cache temporarily'
        });
      } else {
        logger.warn('Cache get failed', {
          key,
          error: error.message,
          duration
        });
      }

      return null;
    }
  }

  /**
   * Set value in cache with graceful fallback
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = 3600) {
    // Graceful fallback when Redis is not available
    if (!this.isConnected || !this.redis) {
      logger.debug('Cache set skipped - Redis not available', { key });
      return false;
    }

    const startTime = Date.now();
    try {
      const fullKey = this.generateKey(key);
      const serializedValue = JSON.stringify(value);

      if (ttl > 0) {
        await this.redis.setex(fullKey, ttl, serializedValue);
      } else {
        await this.redis.set(fullKey, serializedValue);
      }

      const duration = Date.now() - startTime;
      logger.debug('Cache set successful', {
        key: fullKey,
        ttl,
        duration,
        size: serializedValue.length
      });

      return true;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Handle connection errors gracefully
      if (this.isConnectionError(error)) {
        this.isConnected = false;
        logger.warn('Cache set failed - connection lost', {
          key,
          error: error.message,
          duration,
          action: 'Disabling cache temporarily'
        });
      } else {
        logger.warn('Cache set failed', {
          key,
          error: error.message,
          duration
        });
      }

      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    if (!this.isConnected || !this.redis) {
      return false;
    }

    try {
      const fullKey = this.generateKey(key);
      const result = await this.redis.del(fullKey);
      
      logger.debug('Cache delete', {
        key: fullKey,
        deleted: result > 0
      });
      
      return result > 0;
    } catch (error) {
      logger.warn('Cache delete failed', {
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   * @param {string} pattern - Key pattern
   * @returns {Promise<number>} Number of deleted keys
   */
  async delPattern(pattern) {
    if (!this.isConnected || !this.redis) {
      return 0;
    }

    try {
      const fullPattern = this.generateKey(pattern);
      const keys = await this.redis.keys(fullPattern);
      
      if (keys.length > 0) {
        const result = await this.redis.del(...keys);
        logger.debug('Cache pattern delete', {
          pattern: fullPattern,
          keysFound: keys.length,
          deleted: result
        });
        return result;
      }
      
      return 0;
    } catch (error) {
      logger.warn('Cache pattern delete failed', {
        pattern,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Check if error is a connection error
   * @param {Error} error - Error object
   * @returns {boolean} True if connection error
   */
  isConnectionError(error) {
    const connectionErrors = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNRESET',
      'EHOSTUNREACH',
      'ENETUNREACH',
      'Connection is closed'
    ];

    return connectionErrors.some(errType =>
      error.message.includes(errType) || error.code === errType
    );
  }

  /**
   * Perform health check on Redis connection
   * @returns {Promise<Object>} Health check result
   */
  async healthCheck() {
    if (!this.redis) {
      return {
        status: 'disabled',
        message: 'Redis not initialized',
        connected: false
      };
    }

    try {
      const startTime = Date.now();
      await this.redis.ping();
      const duration = Date.now() - startTime;

      this.isConnected = true;
      return {
        status: 'healthy',
        message: 'Redis connection is working',
        connected: true,
        responseTime: duration
      };
    } catch (error) {
      this.isConnected = false;
      return {
        status: 'unhealthy',
        message: error.message,
        connected: false,
        error: error.code || 'UNKNOWN'
      };
    }
  }

  /**
   * Check if cache is available
   * @returns {boolean} Cache availability status
   */
  isAvailable() {
    return this.isConnected && this.redis !== null;
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getStats() {
    if (!this.isConnected || !this.redis) {
      return {
        connected: false,
        memory: null,
        keys: null
      };
    }

    try {
      const info = await this.redis.info('memory');
      const dbSize = await this.redis.dbsize();
      
      return {
        connected: true,
        memory: this.parseMemoryInfo(info),
        keys: dbSize,
        keyPrefix: this.keyPrefix
      };
    } catch (error) {
      logger.warn('Failed to get cache stats', {
        error: error.message
      });
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Parse Redis memory info
   * @param {string} info - Redis info string
   * @returns {Object} Parsed memory information
   */
  parseMemoryInfo(info) {
    const lines = info.split('\r\n');
    const memory = {};
    
    lines.forEach(line => {
      if (line.includes('used_memory:')) {
        memory.used = parseInt(line.split(':')[1]);
      }
      if (line.includes('used_memory_human:')) {
        memory.usedHuman = line.split(':')[1];
      }
      if (line.includes('used_memory_peak:')) {
        memory.peak = parseInt(line.split(':')[1]);
      }
    });
    
    return memory;
  }

  /**
   * Close Redis connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
      this.isConnected = false;
      logger.info('Redis connection closed');
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
