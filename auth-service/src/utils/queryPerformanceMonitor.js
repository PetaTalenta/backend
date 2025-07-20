const logger = require('./logger');

/**
 * Query Performance Monitor
 * Monitors database query performance and index usage
 */
class QueryPerformanceMonitor {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.queryStats = new Map();
    this.slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000; // ms
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
        slowQueries: 0
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
    
    // Log performance
    const logData = {
      queryName,
      executionTime,
      isSlowQuery,
      ...metadata
    };
    
    if (isSlowQuery) {
      logger.warn('Slow query detected', logData);
    } else {
      logger.debug('Query performance', logData);
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
        slowQueryPercentage: data.count > 0 ? (data.slowQueries / data.count) * 100 : 0
      };
    }
    
    return stats;
  }

  /**
   * Check index usage statistics
   * @returns {Promise<Object>} Index usage statistics
   */
  async getIndexUsageStats() {
    try {
      const indexStats = await this.sequelize.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan as scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched,
          CASE 
            WHEN idx_scan = 0 THEN 'UNUSED'
            WHEN idx_scan < 100 THEN 'LOW_USAGE'
            WHEN idx_scan < 1000 THEN 'MEDIUM_USAGE'
            ELSE 'HIGH_USAGE'
          END as usage_level
        FROM pg_stat_user_indexes 
        WHERE schemaname IN ('auth', 'archive', 'public')
          AND tablename IN ('user_profiles', 'schools', 'analysis_results')
        ORDER BY idx_scan DESC
      `, {
        type: this.sequelize.QueryTypes.SELECT
      });

      return indexStats;
    } catch (error) {
      logger.error('Error getting index usage stats', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Check table scan statistics
   * @returns {Promise<Object>} Table scan statistics
   */
  async getTableScanStats() {
    try {
      const tableStats = await this.sequelize.query(`
        SELECT 
          schemaname,
          tablename,
          seq_scan as sequential_scans,
          seq_tup_read as sequential_tuples_read,
          idx_scan as index_scans,
          idx_tup_fetch as index_tuples_fetched,
          CASE 
            WHEN seq_scan > idx_scan THEN 'HIGH_SEQ_SCAN'
            WHEN seq_scan > 0 AND idx_scan = 0 THEN 'ONLY_SEQ_SCAN'
            WHEN idx_scan > seq_scan THEN 'GOOD_INDEX_USAGE'
            ELSE 'BALANCED'
          END as scan_pattern
        FROM pg_stat_user_tables 
        WHERE schemaname IN ('auth', 'archive', 'public')
          AND tablename IN ('user_profiles', 'schools', 'analysis_results')
        ORDER BY seq_scan DESC
      `, {
        type: this.sequelize.QueryTypes.SELECT
      });

      return tableStats;
    } catch (error) {
      logger.error('Error getting table scan stats', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Generate performance report
   * @returns {Promise<Object>} Performance report
   */
  async generatePerformanceReport() {
    try {
      const [queryStats, indexStats, tableStats] = await Promise.all([
        this.getQueryStats(),
        this.getIndexUsageStats(),
        this.getTableScanStats()
      ]);

      const report = {
        timestamp: new Date(),
        queryPerformance: queryStats,
        indexUsage: indexStats,
        tableScanPatterns: tableStats,
        recommendations: this.generateRecommendations(queryStats, indexStats, tableStats)
      };

      logger.info('Performance report generated', {
        totalQueries: Object.keys(queryStats).length,
        totalIndexes: indexStats.length,
        totalTables: tableStats.length
      });

      return report;
    } catch (error) {
      logger.error('Error generating performance report', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate performance recommendations
   * @param {Object} queryStats - Query statistics
   * @param {Array} indexStats - Index statistics
   * @param {Array} tableStats - Table statistics
   * @returns {Array} Recommendations
   */
  generateRecommendations(queryStats, indexStats, tableStats) {
    const recommendations = [];

    // Check for slow queries
    Object.entries(queryStats).forEach(([queryName, stats]) => {
      if (stats.slowQueryPercentage > 10) {
        recommendations.push({
          type: 'SLOW_QUERY',
          severity: 'HIGH',
          message: `Query "${queryName}" has ${stats.slowQueryPercentage.toFixed(1)}% slow executions`,
          suggestion: 'Consider optimizing this query or adding appropriate indexes'
        });
      }
    });

    // Check for unused indexes
    indexStats.forEach(index => {
      if (index.usage_level === 'UNUSED') {
        recommendations.push({
          type: 'UNUSED_INDEX',
          severity: 'MEDIUM',
          message: `Index "${index.indexname}" on ${index.schemaname}.${index.tablename} is unused`,
          suggestion: 'Consider dropping this index if it\'s not needed'
        });
      }
    });

    // Check for high sequential scans
    tableStats.forEach(table => {
      if (table.scan_pattern === 'HIGH_SEQ_SCAN' || table.scan_pattern === 'ONLY_SEQ_SCAN') {
        recommendations.push({
          type: 'HIGH_SEQUENTIAL_SCAN',
          severity: 'HIGH',
          message: `Table ${table.schemaname}.${table.tablename} has high sequential scan usage`,
          suggestion: 'Consider adding indexes for frequently queried columns'
        });
      }
    });

    return recommendations;
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
