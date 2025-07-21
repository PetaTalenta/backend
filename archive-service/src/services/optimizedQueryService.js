/**
 * Optimized Query Service
 * Provides high-performance database queries with proper indexing
 */

const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

class OptimizedQueryService {
  /**
   * Get job queue statistics with optimized queries
   * @returns {Promise<Object>} Queue statistics
   */
  static async getJobQueueStats() {
    try {
      const [results] = await sequelize.query(`
        SELECT 
          status,
          COUNT(*) as count,
          AVG(priority) as avg_priority,
          MIN(created_at) as oldest_job,
          MAX(created_at) as newest_job,
          AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_wait_time_seconds
        FROM archive.analysis_jobs
        WHERE status IN ('queued', 'processing')
        GROUP BY status
        ORDER BY 
          CASE status 
            WHEN 'processing' THEN 1 
            WHEN 'queued' THEN 2 
            ELSE 3 
          END;
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      return results;
    } catch (error) {
      logger.error('Failed to get job queue statistics', { error: error.message });
      throw error;
    }
  }

  /**
   * Get next jobs to process with priority ordering
   * @param {Number} limit - Number of jobs to fetch
   * @returns {Promise<Array>} Jobs ready for processing
   */
  static async getNextJobsToProcess(limit = 10) {
    try {
      const results = await sequelize.query(`
        SELECT 
          id,
          job_id,
          user_id,
          priority,
          created_at,
          retry_count,
          max_retries
        FROM archive.analysis_jobs
        WHERE status = 'queued'
          AND retry_count < max_retries
        ORDER BY 
          priority DESC,
          created_at ASC
        LIMIT :limit
        FOR UPDATE SKIP LOCKED;
      `, {
        replacements: { limit },
        type: sequelize.QueryTypes.SELECT
      });

      return results;
    } catch (error) {
      logger.error('Failed to get next jobs to process', { error: error.message });
      throw error;
    }
  }

  /**
   * Get failed jobs that can be retried
   * @param {Number} limit - Number of jobs to fetch
   * @returns {Promise<Array>} Failed jobs eligible for retry
   */
  static async getRetryableFailedJobs(limit = 5) {
    try {
      const results = await sequelize.query(`
        SELECT 
          id,
          job_id,
          user_id,
          error_message,
          retry_count,
          max_retries,
          created_at,
          completed_at
        FROM archive.analysis_jobs
        WHERE status = 'failed'
          AND retry_count < max_retries
          AND completed_at < NOW() - INTERVAL '5 minutes'
        ORDER BY 
          priority DESC,
          completed_at ASC
        LIMIT :limit;
      `, {
        replacements: { limit },
        type: sequelize.QueryTypes.SELECT
      });

      return results;
    } catch (error) {
      logger.error('Failed to get retryable failed jobs', { error: error.message });
      throw error;
    }
  }

  /**
   * Get comprehensive analysis statistics
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Analysis statistics
   */
  static async getAnalysisStatistics(filters = {}) {
    try {
      const { timeRange = '7 days', userId = null } = filters;
      
      let userFilter = '';
      const replacements = { timeRange };
      
      if (userId) {
        userFilter = 'AND ar.user_id = :userId';
        replacements.userId = userId;
      }

      const [results] = await sequelize.query(`
        WITH analysis_stats AS (
          SELECT 
            COUNT(*) as total_analyses,
            COUNT(CASE WHEN ar.status = 'completed' THEN 1 END) as completed_analyses,
            COUNT(CASE WHEN ar.status = 'failed' THEN 1 END) as failed_analyses,
            COUNT(DISTINCT ar.user_id) as unique_users,
            AVG(EXTRACT(EPOCH FROM (ar.updated_at - ar.created_at))) as avg_processing_time
          FROM archive.analysis_results ar
          WHERE ar.created_at >= NOW() - INTERVAL :timeRange
            ${userFilter}
        ),
        archetype_stats AS (
          SELECT 
            ar.persona_profile->>'archetype' as archetype,
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
          FROM archive.analysis_results ar
          WHERE ar.created_at >= NOW() - INTERVAL :timeRange
            AND ar.status = 'completed'
            AND ar.persona_profile->>'archetype' IS NOT NULL
            ${userFilter}
          GROUP BY ar.persona_profile->>'archetype'
          ORDER BY count DESC
          LIMIT 10
        )
        SELECT 
          (SELECT row_to_json(analysis_stats) FROM analysis_stats) as general_stats,
          (SELECT json_agg(archetype_stats) FROM archetype_stats) as archetype_distribution;
      `, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      return {
        general_stats: results.general_stats || {},
        archetype_distribution: results.archetype_distribution || [],
        generated_at: new Date().toISOString(),
        time_range: timeRange
      };
    } catch (error) {
      logger.error('Failed to get analysis statistics', { error: error.message });
      throw error;
    }
  }

  /**
   * Get demographic insights with optimized joins
   * @param {Object} filters - Demographic filters
   * @returns {Promise<Object>} Demographic insights
   */
  static async getDemographicInsights(filters = {}) {
    try {
      const { 
        gender = null, 
        ageMin = null, 
        ageMax = null, 
        schoolOrigin = null,
        limit = 1000 
      } = filters;

      let whereConditions = ['ar.status = \'completed\''];
      const replacements = { limit };

      if (gender) {
        whereConditions.push('up.gender = :gender');
        replacements.gender = gender;
      }

      if (ageMin && ageMax) {
        const currentYear = new Date().getFullYear();
        const maxBirthYear = currentYear - ageMin;
        const minBirthYear = currentYear - ageMax;
        
        whereConditions.push('up.date_of_birth BETWEEN :minDate AND :maxDate');
        replacements.minDate = `${minBirthYear}-01-01`;
        replacements.maxDate = `${maxBirthYear}-12-31`;
      }

      if (schoolOrigin) {
        whereConditions.push('s.name ILIKE :schoolOrigin');
        replacements.schoolOrigin = `%${schoolOrigin}%`;
      }

      const whereClause = whereConditions.join(' AND ');

      const results = await sequelize.query(`
        WITH demographic_data AS (
          SELECT
            ar.persona_profile->>'archetype' as archetype,
            up.gender,
            EXTRACT(YEAR FROM AGE(up.date_of_birth)) as age,
            s.name as school_name,
            ar.created_at
          FROM archive.analysis_results ar
          INNER JOIN auth.user_profiles up ON ar.user_id = up.user_id
          LEFT JOIN public.schools s ON up.school_id = s.id
          WHERE ${whereClause}
          LIMIT :limit
        )
        SELECT
          archetype,
          gender,
          COUNT(*) as count,
          ROUND(AVG(age), 1) as avg_age,
          MIN(age) as min_age,
          MAX(age) as max_age,
          COUNT(DISTINCT school_name) as unique_schools,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
        FROM demographic_data
        WHERE archetype IS NOT NULL
        GROUP BY archetype, gender
        ORDER BY count DESC;
      `, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      return {
        insights: results,
        total_records: results.reduce((sum, row) => sum + parseInt(row.count), 0),
        filters_applied: filters,
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get demographic insights', { error: error.message });
      throw error;
    }
  }

  /**
   * Get performance metrics for database optimization
   * @returns {Promise<Object>} Performance metrics
   */
  static async getPerformanceMetrics() {
    try {
      // Get index usage statistics
      const indexStats = await sequelize.query(`
        SELECT
          schemaname,
          tablename,
          indexname,
          idx_scan as scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched,
          ROUND(idx_tup_read::numeric / NULLIF(idx_scan, 0), 2) as avg_tuples_per_scan
        FROM pg_stat_user_indexes
        WHERE schemaname IN ('archive', 'auth')
          AND tablename IN ('analysis_results', 'analysis_jobs', 'user_profiles')
        ORDER BY idx_scan DESC;
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      // Get table statistics
      const tableStats = await sequelize.query(`
        SELECT
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          seq_scan as sequential_scans,
          seq_tup_read as sequential_reads,
          idx_scan as index_scans,
          idx_tup_fetch as index_reads,
          ROUND(seq_tup_read::numeric / NULLIF(seq_scan, 0), 2) as avg_seq_read_per_scan,
          ROUND(idx_tup_fetch::numeric / NULLIF(idx_scan, 0), 2) as avg_idx_read_per_scan
        FROM pg_stat_user_tables
        WHERE schemaname IN ('archive', 'auth')
          AND tablename IN ('analysis_results', 'analysis_jobs', 'user_profiles')
        ORDER BY schemaname, tablename;
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      // Get slow query information (if pg_stat_statements is available)
      let slowQueries = [];
      try {
        slowQueries = await sequelize.query(`
          SELECT
            query,
            calls,
            total_time,
            mean_time,
            rows
          FROM pg_stat_statements
          WHERE query LIKE '%archive%' OR query LIKE '%analysis_%'
          ORDER BY mean_time DESC
          LIMIT 10;
        `, {
          type: sequelize.QueryTypes.SELECT
        });
      } catch (error) {
        // pg_stat_statements might not be available
        logger.warn('pg_stat_statements not available for slow query analysis');
      }

      return {
        index_statistics: indexStats,
        table_statistics: tableStats,
        slow_queries: slowQueries,
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get performance metrics', { error: error.message });
      throw error;
    }
  }
}

module.exports = OptimizedQueryService;
