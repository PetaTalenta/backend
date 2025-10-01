/**
 * Performance Optimization Service - Phase 4 Implementation
 * Advanced performance optimization building on Phase 2-3 patterns
 * Implements query optimization, advanced caching, and database tuning
 */

const { sequelize } = require('../config/database');
const cacheService = require('./cacheService');
const logger = require('../utils/logger');

class PerformanceOptimizationService {
  constructor() {
    this.queryCache = new Map();
    this.performanceMetrics = new Map();
    this.optimizationThresholds = {
      slowQuery: 100, // ms
      cacheHitRatio: 0.8, // 80%
      indexEfficiency: 0.7 // 70%
    };
  }

  /**
   * Optimize database queries with advanced caching
   * Phase 4 Enhancement - Building on Phase 2's system metrics caching
   */
  async optimizeQuery(queryName, queryFunction, options = {}) {
    const startTime = Date.now();
    const cacheKey = options.cacheKey || queryName;
    const ttl = options.ttl || 300; // 5 minutes default

    try {
      // Try to get from cache first (Phase 4 advanced caching)
      if (options.useCache !== false) {
        const cachedResult = await cacheService.get(`optimized:${cacheKey}`);
        if (cachedResult) {
          const responseTime = Date.now() - startTime;
          this.recordPerformanceMetric(queryName, responseTime, true);
          
          logger.debug('Query served from cache', {
            queryName,
            responseTime: `${responseTime}ms`,
            cacheHit: true
          });
          
          return cachedResult;
        }
      }

      // Execute query with performance monitoring
      const result = await queryFunction();
      const responseTime = Date.now() - startTime;

      // Cache the result for future use
      if (options.useCache !== false && result) {
        await cacheService.set(`optimized:${cacheKey}`, result, ttl);
      }

      // Record performance metrics
      this.recordPerformanceMetric(queryName, responseTime, false);

      // Log slow queries for optimization
      if (responseTime > this.optimizationThresholds.slowQuery) {
        logger.warn('Slow query detected', {
          queryName,
          responseTime: `${responseTime}ms`,
          threshold: `${this.optimizationThresholds.slowQuery}ms`
        });
      }

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordPerformanceMetric(queryName, responseTime, false, error);
      
      logger.error('Query optimization error', {
        queryName,
        responseTime: `${responseTime}ms`,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Record performance metrics for analysis
   */
  recordPerformanceMetric(queryName, responseTime, cacheHit, error = null) {
    if (!this.performanceMetrics.has(queryName)) {
      this.performanceMetrics.set(queryName, {
        totalQueries: 0,
        totalTime: 0,
        cacheHits: 0,
        errors: 0,
        minTime: Infinity,
        maxTime: 0,
        avgTime: 0
      });
    }

    const metrics = this.performanceMetrics.get(queryName);
    metrics.totalQueries++;
    metrics.totalTime += responseTime;
    
    if (cacheHit) {
      metrics.cacheHits++;
    }
    
    if (error) {
      metrics.errors++;
    }
    
    metrics.minTime = Math.min(metrics.minTime, responseTime);
    metrics.maxTime = Math.max(metrics.maxTime, responseTime);
    metrics.avgTime = metrics.totalTime / metrics.totalQueries;
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics() {
    const metrics = {};
    
    for (const [queryName, data] of this.performanceMetrics.entries()) {
      metrics[queryName] = {
        ...data,
        cacheHitRatio: data.totalQueries > 0 ? data.cacheHits / data.totalQueries : 0,
        errorRate: data.totalQueries > 0 ? data.errors / data.totalQueries : 0
      };
    }
    
    return metrics;
  }

  /**
   * Optimize database indexes based on query patterns
   * Phase 4 Enhancement - Extending Phase 2's strategic indexing approach
   */
  async optimizeIndexes() {
    try {
      logger.info('Starting database index optimization');

      // Analyze index usage statistics
      const indexStats = await sequelize.query(`
        SELECT
          schemaname,
          relname as tablename,
          indexrelname as indexname,
          COALESCE(idx_scan, 0) as scans,
          COALESCE(idx_tup_read, 0) as tuples_read,
          COALESCE(idx_tup_fetch, 0) as tuples_fetched,
          CASE
            WHEN COALESCE(idx_scan, 0) = 0 THEN 0
            ELSE ROUND(COALESCE(idx_tup_read, 0)::numeric / COALESCE(idx_scan, 1), 2)
          END as avg_tuples_per_scan
        FROM pg_stat_user_indexes
        WHERE schemaname IN ('archive', 'auth', 'public')
          AND relname IN ('analysis_results', 'analysis_jobs', 'user_profiles', 'system_metrics', 'users')
        ORDER BY idx_scan DESC NULLS LAST;
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      // Identify unused indexes
      const unusedIndexes = indexStats.filter(index => 
        index.scans === 0 || index.scans < 10
      );

      // Identify inefficient indexes
      const inefficientIndexes = indexStats.filter(index => 
        index.avg_tuples_per_scan > 1000 && index.scans > 0
      );

      const optimization = {
        totalIndexes: indexStats.length,
        unusedIndexes: unusedIndexes.length,
        inefficientIndexes: inefficientIndexes.length,
        recommendations: []
      };

      // Generate recommendations
      if (unusedIndexes.length > 0) {
        optimization.recommendations.push({
          type: 'unused_indexes',
          message: `Found ${unusedIndexes.length} unused indexes that could be dropped`,
          indexes: unusedIndexes.map(idx => idx.indexname)
        });
      }

      if (inefficientIndexes.length > 0) {
        optimization.recommendations.push({
          type: 'inefficient_indexes',
          message: `Found ${inefficientIndexes.length} inefficient indexes that need review`,
          indexes: inefficientIndexes.map(idx => ({
            name: idx.indexname,
            avgTuplesPerScan: idx.avg_tuples_per_scan
          }))
        });
      }

      logger.info('Database index optimization completed', optimization);
      return optimization;
    } catch (error) {
      logger.error('Database index optimization failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Optimize query execution plans
   * Phase 4 Enhancement - Advanced query optimization
   */
  async optimizeQueryPlans() {
    try {
      logger.info('Starting query plan optimization');

      // Update table statistics for better query planning
      await sequelize.query('ANALYZE archive.analysis_results;');
      await sequelize.query('ANALYZE archive.analysis_jobs;');
      await sequelize.query('ANALYZE archive.system_metrics;');
      await sequelize.query('ANALYZE auth.user_profiles;');

      // Check for missing indexes on frequently queried columns
      const missingIndexAnalysis = await sequelize.query(`
        SELECT 
          schemaname,
          tablename,
          attname as column_name,
          n_distinct,
          correlation
        FROM pg_stats
        WHERE schemaname IN ('archive', 'auth')
          AND tablename IN ('analysis_results', 'analysis_jobs', 'user_profiles')
          AND n_distinct > 100
          AND correlation < 0.1
        ORDER BY n_distinct DESC;
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      const optimization = {
        tablesAnalyzed: 4,
        potentialIndexCandidates: missingIndexAnalysis.length,
        recommendations: []
      };

      if (missingIndexAnalysis.length > 0) {
        optimization.recommendations.push({
          type: 'potential_indexes',
          message: 'Found columns that might benefit from indexing',
          candidates: missingIndexAnalysis
        });
      }

      logger.info('Query plan optimization completed', optimization);
      return optimization;
    } catch (error) {
      logger.error('Query plan optimization failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get comprehensive performance report
   * Phase 4 Enhancement - Complete performance analysis
   */
  async getPerformanceReport() {
    try {
      const [queryMetrics, indexOptimization, cacheStats] = await Promise.all([
        this.getPerformanceMetrics(),
        this.optimizeIndexes(),
        this.getCachePerformance()
      ]);

      const report = {
        timestamp: new Date().toISOString(),
        queryPerformance: queryMetrics,
        indexOptimization,
        cachePerformance: cacheStats,
        recommendations: this.generateOptimizationRecommendations(queryMetrics, indexOptimization, cacheStats)
      };

      logger.info('Performance report generated', {
        totalQueries: Object.keys(queryMetrics).length,
        indexRecommendations: indexOptimization.recommendations.length,
        cacheHitRatio: cacheStats.overallHitRatio
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate performance report', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get cache performance statistics
   */
  async getCachePerformance() {
    try {
      const cacheInfo = await cacheService.getInfo();
      
      return {
        isAvailable: cacheService.isAvailable(),
        hitRatio: cacheInfo?.keyspace_hits / (cacheInfo?.keyspace_hits + cacheInfo?.keyspace_misses) || 0,
        totalKeys: cacheInfo?.db0?.keys || 0,
        memoryUsage: cacheInfo?.used_memory_human || 'N/A',
        overallHitRatio: cacheInfo?.keyspace_hits / (cacheInfo?.keyspace_hits + cacheInfo?.keyspace_misses) || 0
      };
    } catch (error) {
      logger.warn('Could not get cache performance stats', { error: error.message });
      return {
        isAvailable: false,
        hitRatio: 0,
        totalKeys: 0,
        memoryUsage: 'N/A',
        overallHitRatio: 0
      };
    }
  }

  /**
   * Generate optimization recommendations
   */
  generateOptimizationRecommendations(queryMetrics, indexOptimization, cacheStats) {
    const recommendations = [];

    // Query performance recommendations
    Object.entries(queryMetrics).forEach(([queryName, metrics]) => {
      if (metrics.avgTime > this.optimizationThresholds.slowQuery) {
        recommendations.push({
          type: 'slow_query',
          priority: 'high',
          message: `Query "${queryName}" has average response time of ${metrics.avgTime.toFixed(2)}ms`,
          suggestion: 'Consider query optimization or additional indexing'
        });
      }

      if (metrics.cacheHitRatio < this.optimizationThresholds.cacheHitRatio) {
        recommendations.push({
          type: 'low_cache_hit',
          priority: 'medium',
          message: `Query "${queryName}" has low cache hit ratio of ${(metrics.cacheHitRatio * 100).toFixed(1)}%`,
          suggestion: 'Consider increasing cache TTL or improving cache key strategy'
        });
      }
    });

    // Cache performance recommendations
    if (cacheStats.overallHitRatio < this.optimizationThresholds.cacheHitRatio) {
      recommendations.push({
        type: 'overall_cache_performance',
        priority: 'high',
        message: `Overall cache hit ratio is ${(cacheStats.overallHitRatio * 100).toFixed(1)}%`,
        suggestion: 'Review caching strategy and increase cache TTL for stable data'
      });
    }

    // Add index optimization recommendations
    indexOptimization.recommendations.forEach(rec => {
      recommendations.push({
        type: rec.type,
        priority: rec.type === 'unused_indexes' ? 'low' : 'medium',
        message: rec.message,
        suggestion: rec.type === 'unused_indexes' ? 
          'Consider dropping unused indexes to improve write performance' :
          'Review and optimize inefficient indexes'
      });
    });

    return recommendations;
  }
}

module.exports = new PerformanceOptimizationService();
