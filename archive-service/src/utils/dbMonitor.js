/**
 * Database Monitoring Utility
 * Phase 2.3: Enhanced Connection Pool Monitoring
 */

const logger = require('./logger');

class DatabaseMonitor {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.metrics = {
      connectionPool: {},
      queryPerformance: {},
      errorRates: {}
    };
  }

  /**
   * Get connection pool statistics
   */
  async getConnectionPoolStats() {
    try {
      const pool = this.sequelize.connectionManager.pool;
      
      const stats = {
        total: pool.size,
        active: pool.borrowed,
        idle: pool.available,
        pending: pool.pending,
        max: pool.max,
        min: pool.min,
        timestamp: new Date()
      };

      // Calculate utilization percentage
      stats.utilization = pool.max > 0 ? ((pool.borrowed / pool.max) * 100).toFixed(2) : 0;
      
      this.metrics.connectionPool = stats;
      return stats;
    } catch (error) {
      logger.error('Error getting connection pool stats', { error: error.message });
      return null;
    }
  }

  /**
   * Get database performance metrics
   */
  async getPerformanceMetrics() {
    try {
      const queries = [
        // Active connections
        `SELECT count(*) as active_connections 
         FROM pg_stat_activity 
         WHERE state = 'active' AND datname = current_database()`,
        
        // Database size
        `SELECT pg_size_pretty(pg_database_size(current_database())) as database_size`,
        
        // Table statistics
        `SELECT 
           schemaname,
           tablename,
           n_tup_ins as inserts,
           n_tup_upd as updates,
           n_tup_del as deletes,
           seq_scan as sequential_scans,
           idx_scan as index_scans
         FROM pg_stat_user_tables 
         WHERE schemaname = 'archive'`,
        
        // Index usage
        `SELECT 
           schemaname,
           tablename,
           indexname,
           idx_scan as scans,
           idx_tup_read as tuples_read,
           idx_tup_fetch as tuples_fetched
         FROM pg_stat_user_indexes 
         WHERE schemaname = 'archive'
         ORDER BY idx_scan DESC`
      ];

      const results = await Promise.all(
        queries.map(query => 
          this.sequelize.query(query, { type: this.sequelize.QueryTypes.SELECT })
        )
      );

      return {
        activeConnections: results[0][0]?.active_connections || 0,
        databaseSize: results[1][0]?.database_size || 'Unknown',
        tableStats: results[2] || [],
        indexStats: results[3] || [],
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error getting performance metrics', { error: error.message });
      return null;
    }
  }

  /**
   * Monitor connection pool health
   */
  async monitorConnectionPool() {
    const stats = await this.getConnectionPoolStats();
    
    if (!stats) return;

    // Log warnings for high utilization
    if (stats.utilization > 80) {
      logger.warn('High connection pool utilization', {
        utilization: stats.utilization,
        active: stats.active,
        max: stats.max
      });
    }

    // Log warnings for pending connections
    if (stats.pending > 5) {
      logger.warn('High pending connections', {
        pending: stats.pending,
        active: stats.active,
        max: stats.max
      });
    }

    return stats;
  }

  /**
   * Get slow query statistics
   */
  async getSlowQueries(minDuration = 1000) {
    try {
      const query = `
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          max_time,
          min_time,
          rows
        FROM pg_stat_statements 
        WHERE mean_time > $1
        ORDER BY mean_time DESC 
        LIMIT 10
      `;

      const results = await this.sequelize.query(query, {
        bind: [minDuration],
        type: this.sequelize.QueryTypes.SELECT
      });

      return results;
    } catch (error) {
      // pg_stat_statements might not be enabled
      logger.debug('Could not get slow query stats (pg_stat_statements not available)', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Generate health report
   */
  async generateHealthReport() {
    try {
      const [poolStats, perfMetrics, slowQueries] = await Promise.all([
        this.getConnectionPoolStats(),
        this.getPerformanceMetrics(),
        this.getSlowQueries()
      ]);

      const report = {
        connectionPool: poolStats,
        performance: perfMetrics,
        slowQueries: slowQueries,
        recommendations: this.generateRecommendations(poolStats, perfMetrics),
        timestamp: new Date()
      };

      return report;
    } catch (error) {
      logger.error('Error generating health report', { error: error.message });
      return null;
    }
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(poolStats, perfMetrics) {
    const recommendations = [];

    if (poolStats) {
      if (poolStats.utilization > 90) {
        recommendations.push({
          type: 'connection_pool',
          severity: 'high',
          message: 'Connection pool utilization is very high. Consider increasing pool size.',
          current: `${poolStats.utilization}% utilization`,
          suggestion: `Increase DB_POOL_MAX from ${poolStats.max} to ${Math.ceil(poolStats.max * 1.5)}`
        });
      }

      if (poolStats.pending > 10) {
        recommendations.push({
          type: 'connection_pool',
          severity: 'medium',
          message: 'High number of pending connections detected.',
          current: `${poolStats.pending} pending connections`,
          suggestion: 'Review query performance and consider connection pooling optimization'
        });
      }
    }

    if (perfMetrics && perfMetrics.tableStats) {
      const archiveTable = perfMetrics.tableStats.find(t => t.tablename === 'analysis_results');
      if (archiveTable && archiveTable.sequential_scans > archiveTable.index_scans) {
        recommendations.push({
          type: 'query_performance',
          severity: 'medium',
          message: 'High sequential scan ratio detected on analysis_results table.',
          current: `${archiveTable.sequential_scans} seq scans vs ${archiveTable.index_scans} index scans`,
          suggestion: 'Review queries and ensure proper index usage'
        });
      }
    }

    return recommendations;
  }

  /**
   * Start periodic monitoring
   */
  startPeriodicMonitoring(intervalMs = 60000) {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.monitorConnectionPool();
      } catch (error) {
        logger.error('Error in periodic monitoring', { error: error.message });
      }
    }, intervalMs);

    logger.info('Database monitoring started', { intervalMs });
  }

  /**
   * Stop periodic monitoring
   */
  stopPeriodicMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('Database monitoring stopped');
    }
  }
}

module.exports = DatabaseMonitor;
