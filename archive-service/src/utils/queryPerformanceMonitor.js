const logger = require('./logger');

/**
 * Query Performance Monitor for Archive Service
 * Monitors database query performance and index usage
 */
class QueryPerformanceMonitor {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.queryStats = new Map();
    this.slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000; // ms
  }

  /**
   * Wrapper untuk monitoring query execution
   * @param {string} queryName - Name of the query
   * @param {Function} queryFunction - Function that executes the query
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<any>} Query result
   */
  async monitorQuery(queryName, queryFunction, metadata = {}) {
    const startTime = Date.now();
    
    try {
      const result = await queryFunction();
      const executionTime = Date.now() - startTime;
      
      this.logQueryPerformance(queryName, executionTime, {
        ...metadata,
        success: true,
        resultCount: Array.isArray(result) ? result.length : 1
      });
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      this.logQueryPerformance(queryName, executionTime, {
        ...metadata,
        success: false,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Log query execution time
   * @param {string} queryName - Name of the query
   * @param {number} executionTime - Execution time in milliseconds
   * @param {Object} metadata - Additional metadata
   */
  logQueryPerformance(queryName, executionTime, metadata = {}) {
    const isSlowQuery = executionTime > this.slowQueryThreshold;
    
    // Update statistics
    if (!this.queryStats.has(queryName)) {
      this.queryStats.set(queryName, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        slowQueries: 0,
        errors: 0
      });
    }
    
    const stats = this.queryStats.get(queryName);
    stats.count++;
    stats.totalTime += executionTime;
    stats.minTime = Math.min(stats.minTime, executionTime);
    stats.maxTime = Math.max(stats.maxTime, executionTime);
    
    if (isSlowQuery) {
      stats.slowQueries++;
    }
    
    if (!metadata.success) {
      stats.errors++;
    }
    
    // Log performance
    const logData = {
      queryName,
      executionTime,
      isSlowQuery,
      ...metadata
    };
    
    if (isSlowQuery) {
      logger.warn('Slow query detected', logData);
    } else if (!metadata.success) {
      logger.error('Query failed', logData);
    } else {
      logger.debug('Query performance', logData);
    }
  }

  /**
   * Check demographic query performance
   * @returns {Promise<Object>} Demographic query performance stats
   */
  async checkDemographicQueryPerformance() {
    try {
      const performanceTests = [
        {
          name: 'gender_filter_performance',
          query: () => this.sequelize.query(`
            SELECT COUNT(*) 
            FROM archive.analysis_results ar
            INNER JOIN auth.user_profiles up ON ar.user_id = up.user_id
            WHERE ar.status = 'completed' AND up.gender = 'male'
          `, { type: this.sequelize.QueryTypes.SELECT })
        },
        {
          name: 'age_range_performance',
          query: () => this.sequelize.query(`
            SELECT COUNT(*) 
            FROM archive.analysis_results ar
            INNER JOIN auth.user_profiles up ON ar.user_id = up.user_id
            WHERE ar.status = 'completed' 
              AND up.date_of_birth BETWEEN '1990-01-01' AND '2000-12-31'
          `, { type: this.sequelize.QueryTypes.SELECT })
        },
        {
          name: 'school_filter_performance',
          query: () => this.sequelize.query(`
            SELECT COUNT(*)
            FROM archive.analysis_results ar
            INNER JOIN auth.user_profiles up ON ar.user_id = up.user_id
            INNER JOIN public.schools s ON up.school_id = s.id
            WHERE ar.status = 'completed'
              AND s.name ILIKE '%University%'
          `, { type: this.sequelize.QueryTypes.SELECT })
        },
        {
          name: 'composite_demographic_performance',
          query: () => this.sequelize.query(`
            SELECT COUNT(*)
            FROM archive.analysis_results ar
            INNER JOIN auth.user_profiles up ON ar.user_id = up.user_id
            WHERE ar.status = 'completed'
              AND up.gender = 'female'
              AND up.date_of_birth BETWEEN '1995-01-01' AND '2005-12-31'
              AND up.school_id IS NOT NULL
          `, { type: this.sequelize.QueryTypes.SELECT })
        }
      ];

      const results = {};
      
      for (const test of performanceTests) {
        const startTime = Date.now();
        await test.query();
        const executionTime = Date.now() - startTime;
        
        results[test.name] = {
          executionTime,
          isOptimal: executionTime < 100, // Consider < 100ms as optimal
          recommendation: executionTime > 500 ? 'Consider index optimization' : 'Performance is acceptable'
        };
      }

      return results;
    } catch (error) {
      logger.error('Error checking demographic query performance', {
        error: error.message
      });
      return {};
    }
  }

  /**
   * Get index effectiveness for demographic queries
   * @returns {Promise<Object>} Index effectiveness report
   */
  async getIndexEffectiveness() {
    try {
      const indexQueries = [
        {
          name: 'user_profiles_gender_index',
          query: `
            SELECT 
              idx_scan,
              idx_tup_read,
              idx_tup_fetch
            FROM pg_stat_user_indexes 
            WHERE indexname = 'idx_user_profiles_gender'
          `
        },
        {
          name: 'user_profiles_date_of_birth_index',
          query: `
            SELECT 
              idx_scan,
              idx_tup_read,
              idx_tup_fetch
            FROM pg_stat_user_indexes 
            WHERE indexname = 'idx_user_profiles_date_of_birth'
          `
        },
        {
          name: 'user_profiles_demographics_composite',
          query: `
            SELECT 
              idx_scan,
              idx_tup_read,
              idx_tup_fetch
            FROM pg_stat_user_indexes 
            WHERE indexname = 'idx_user_profiles_demographics'
          `
        },
        {
          name: 'analysis_results_status_archetype',
          query: `
            SELECT 
              idx_scan,
              idx_tup_read,
              idx_tup_fetch
            FROM pg_stat_user_indexes 
            WHERE indexname = 'idx_analysis_results_status_archetype'
          `
        }
      ];

      const effectiveness = {};
      
      for (const indexQuery of indexQueries) {
        try {
          const [result] = await this.sequelize.query(indexQuery.query, {
            type: this.sequelize.QueryTypes.SELECT
          });
          
          if (result) {
            effectiveness[indexQuery.name] = {
              scans: parseInt(result.idx_scan) || 0,
              tuplesRead: parseInt(result.idx_tup_read) || 0,
              tuplesFetched: parseInt(result.idx_tup_fetch) || 0,
              efficiency: result.idx_scan > 0 ? (result.idx_tup_fetch / result.idx_tup_read) * 100 : 0
            };
          }
        } catch (error) {
          effectiveness[indexQuery.name] = {
            error: error.message,
            status: 'Index may not exist'
          };
        }
      }

      return effectiveness;
    } catch (error) {
      logger.error('Error getting index effectiveness', {
        error: error.message
      });
      return {};
    }
  }

  /**
   * Generate optimization recommendations
   * @returns {Promise<Array>} Optimization recommendations
   */
  async generateOptimizationRecommendations() {
    try {
      const [queryPerf, indexEff] = await Promise.all([
        this.checkDemographicQueryPerformance(),
        this.getIndexEffectiveness()
      ]);

      const recommendations = [];

      // Check query performance
      Object.entries(queryPerf).forEach(([queryName, stats]) => {
        if (!stats.isOptimal) {
          recommendations.push({
            type: 'QUERY_OPTIMIZATION',
            severity: stats.executionTime > 1000 ? 'HIGH' : 'MEDIUM',
            query: queryName,
            executionTime: stats.executionTime,
            recommendation: stats.recommendation
          });
        }
      });

      // Check index effectiveness
      Object.entries(indexEff).forEach(([indexName, stats]) => {
        if (stats.error) {
          recommendations.push({
            type: 'MISSING_INDEX',
            severity: 'HIGH',
            index: indexName,
            recommendation: 'Index may be missing or not created properly'
          });
        } else if (stats.scans === 0) {
          recommendations.push({
            type: 'UNUSED_INDEX',
            severity: 'LOW',
            index: indexName,
            recommendation: 'Index is not being used, consider reviewing query patterns'
          });
        } else if (stats.efficiency < 50) {
          recommendations.push({
            type: 'INEFFICIENT_INDEX',
            severity: 'MEDIUM',
            index: indexName,
            efficiency: stats.efficiency,
            recommendation: 'Index efficiency is low, consider reviewing index design'
          });
        }
      });

      return recommendations;
    } catch (error) {
      logger.error('Error generating optimization recommendations', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get query statistics
   * @returns {Object} Query statistics
   */
  getQueryStats() {
    const stats = {};
    
    for (const [queryName, data] of this.queryStats.entries()) {
      stats[queryName] = {
        ...data,
        avgTime: data.count > 0 ? data.totalTime / data.count : 0,
        slowQueryPercentage: data.count > 0 ? (data.slowQueries / data.count) * 100 : 0,
        errorRate: data.count > 0 ? (data.errors / data.count) * 100 : 0
      };
    }
    
    return stats;
  }

  /**
   * Reset query statistics
   */
  resetStats() {
    this.queryStats.clear();
    logger.info('Query performance statistics reset');
  }
}

module.exports = QueryPerformanceMonitor;
