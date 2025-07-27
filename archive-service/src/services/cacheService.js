/**
 * Cache Service for Archive Service
 * Implements Redis-based caching for demographic statistics and archetype distribution
 * Phase 1.3: Basic Query Caching
 */

const redis = require('redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = {
      demographics: 3600, // 1 hour for demographic statistics
      archetypes: 1800,   // 30 minutes for archetype distribution
      stats: 1800,        // 30 minutes for general statistics
      results: 300        // 5 minutes for result queries
    };
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    // Check if Redis should be disabled
    if (process.env.DISABLE_REDIS === 'true') {
      logger.info('Redis disabled by configuration - cache service will run in no-op mode');
      this.isConnected = false;
      this.client = null;
      return;
    }

    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 1, // Reduced retries for faster failure
        lazyConnect: true,
        connectTimeout: 3000, // 3 second timeout
        commandTimeout: 2000,  // 2 second command timeout
        // Disable automatic reconnection to prevent spam logs
        enableOfflineQueue: false,
        autoResubscribe: false,
        autoResendUnfulfilledCommands: false
      };

      this.client = redis.createClient(redisConfig);

      // Event handlers
      this.client.on('connect', () => {
        logger.info('Redis client connected');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        logger.info('Redis client ready');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        // Only log the first error to avoid spam, then disable the client
        if (this.client) {
          logger.warn('Redis client error - cache will be disabled', { error: err.message });
          // Disconnect and nullify client to prevent further error events
          this.client.removeAllListeners();
          this.client.disconnect().catch(() => {}); // Ignore disconnect errors
          this.client = null;
        }
      });

      this.client.on('end', () => {
        this.isConnected = false;
        logger.info('Redis client disconnected');
      });

      // Connect to Redis with timeout
      const connectPromise = this.client.connect();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis connection timeout')), 3000)
      );

      await Promise.race([connectPromise, timeoutPromise]);

      logger.info('Cache service initialized successfully');
    } catch (error) {
      logger.warn('Failed to initialize cache service - running without cache', { error: error.message });
      // Clean up client and prevent further connection attempts
      if (this.client) {
        this.client.removeAllListeners();
        this.client.disconnect().catch(() => {}); // Ignore disconnect errors
        this.client = null;
      }
      this.isConnected = false;
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable() {
    return this.isConnected && this.client && this.client.isReady;
  }

  /**
   * Generate cache key
   */
  generateKey(prefix, ...parts) {
    return `archive:${prefix}:${parts.join(':')}`;
  }

  /**
   * Get data from cache
   */
  async get(key) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const data = await this.client.get(key);
      if (data) {
        logger.debug('Cache hit', { key });
        return JSON.parse(data);
      }
      logger.debug('Cache miss', { key });
      return null;
    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async set(key, data, ttl = null) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const serializedData = JSON.stringify(data);
      if (ttl) {
        await this.client.setEx(key, ttl, serializedData);
      } else {
        await this.client.set(key, serializedData);
      }
      logger.debug('Cache set', { key, ttl });
      return true;
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete data from cache
   */
  async del(key) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client.del(key);
      logger.debug('Cache delete', { key });
      return true;
    } catch (error) {
      logger.error('Cache delete error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.debug('Cache pattern delete', { pattern, count: keys.length });
      }
      return true;
    } catch (error) {
      logger.error('Cache pattern delete error', { pattern, error: error.message });
      return false;
    }
  }

  /**
   * Cache demographic statistics
   */
  async cacheDemographics(key, data) {
    const cacheKey = this.generateKey('demographics', key);
    return await this.set(cacheKey, data, this.defaultTTL.demographics);
  }

  /**
   * Get cached demographic statistics
   */
  async getDemographics(key) {
    const cacheKey = this.generateKey('demographics', key);
    return await this.get(cacheKey);
  }

  /**
   * Cache archetype distribution
   */
  async cacheArchetypes(key, data) {
    const cacheKey = this.generateKey('archetypes', key);
    return await this.set(cacheKey, data, this.defaultTTL.archetypes);
  }

  /**
   * Get cached archetype distribution
   */
  async getArchetypes(key) {
    const cacheKey = this.generateKey('archetypes', key);
    return await this.get(cacheKey);
  }

  /**
   * Cache general statistics
   */
  async cacheStats(key, data) {
    const cacheKey = this.generateKey('stats', key);
    return await this.set(cacheKey, data, this.defaultTTL.stats);
  }

  /**
   * Get cached statistics
   */
  async getStats(key) {
    const cacheKey = this.generateKey('stats', key);
    return await this.get(cacheKey);
  }

  /**
   * Cache query results
   */
  async cacheResults(key, data) {
    const cacheKey = this.generateKey('results', key);
    return await this.set(cacheKey, data, this.defaultTTL.results);
  }

  /**
   * Get cached query results
   */
  async getResults(key) {
    const cacheKey = this.generateKey('results', key);
    return await this.get(cacheKey);
  }

  /**
   * Invalidate cache for specific patterns
   */
  async invalidateDemographics() {
    return await this.delPattern('archive:demographics:*');
  }

  async invalidateArchetypes() {
    return await this.delPattern('archive:archetypes:*');
  }

  async invalidateStats() {
    return await this.delPattern('archive:stats:*');
  }

  async invalidateResults() {
    return await this.delPattern('archive:results:*');
  }

  /**
   * Invalidate all cache
   */
  async invalidateAll() {
    return await this.delPattern('archive:*');
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      
      return {
        connected: this.isConnected,
        memory: info,
        keyspace: keyspace,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Cache stats error', { error: error.message });
      return null;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.client) {
      try {
        this.client.removeAllListeners();
        await this.client.quit();
        this.isConnected = false;
        this.client = null;
        logger.info('Cache service closed');
      } catch (error) {
        // Suppress error logging for close operations when Redis is unavailable
        logger.debug('Cache service close completed with errors (expected when Redis unavailable)', { error: error.message });
        this.isConnected = false;
        this.client = null;
      }
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
