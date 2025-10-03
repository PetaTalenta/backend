/**
 * Association Service
 * Handles complex operations involving model associations
 * Prevents circular dependencies by centralizing association logic
 */

const { AnalysisResult, AnalysisJob, UserProfile } = require('../models');
const logger = require('../utils/logger');

class AssociationService {
  /**
   * Get analysis result with all related data
   * @param {String} resultId - Result ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Complete result with associations
   */
  static async getCompleteAnalysisResult(resultId, options = {}) {
    try {
      const { includeJobs = true, includeUserProfile = false } = options;

      const includeArray = [];

      if (includeJobs) {
        includeArray.push({
          model: AnalysisJob,
          as: 'jobs',
          required: false,
          order: [['created_at', 'DESC']]
        });
      }

      if (includeUserProfile && UserProfile) {
        includeArray.push({
          model: UserProfile,
          as: 'userProfile',
          required: false
        });
      }

      const result = await AnalysisResult.findByPk(resultId, {
        include: includeArray
      });

      return result;
    } catch (error) {
      logger.error('Failed to get complete analysis result', {
        resultId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get analysis job with result data
   * @param {String} jobId - Job ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Job with result association
   */
  static async getJobWithResult(jobId, options = {}) {
    try {
      const { includeUserProfile = false } = options;

      const includeArray = [
        {
          model: AnalysisResult,
          as: 'result',
          required: false
        }
      ];

      if (includeUserProfile && UserProfile) {
        includeArray.push({
          model: UserProfile,
          as: 'userProfile',
          required: false
        });
      }

      const job = await AnalysisJob.findOne({
        where: { job_id: jobId },
        include: includeArray
      });

      return job;
    } catch (error) {
      logger.error('Failed to get job with result', {
        jobId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user's complete analysis history
   * @param {String} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Complete user analysis history
   */
  static async getUserAnalysisHistory(userId, options = {}) {
    try {
      const { 
        limit = 10, 
        offset = 0, 
        includeJobs = true,
        status = null 
      } = options;

      // Get results with optional job associations
      const whereClause = { user_id: userId };
      if (status) {
        whereClause.status = status;
      }

      const includeArray = [];
      if (includeJobs) {
        includeArray.push({
          model: AnalysisJob,
          as: 'jobs',
          required: false,
          order: [['created_at', 'DESC']]
        });
      }

      const results = await AnalysisResult.findAndCountAll({
        where: whereClause,
        include: includeArray,
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      // Get separate job statistics
      const jobStats = await AnalysisJob.getJobStats(userId);

      return {
        results: results.rows,
        totalResults: results.count,
        jobStatistics: jobStats,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total: results.count,
          totalPages: Math.ceil(results.count / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to get user analysis history', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create analysis result and link to job
   * @param {Object} resultData - Result data
   * @param {String} jobId - Optional job ID to link
   * @returns {Promise<Object>} Created result with job link
   */
  static async createResultWithJobLink(resultData, jobId = null) {
    const transaction = await AnalysisResult.sequelize.transaction();

    try {
      // Create the analysis result
      const result = await AnalysisResult.create(resultData, { transaction });

      // Link to job if provided
      if (jobId) {
        const job = await AnalysisJob.findOne({
          where: { job_id: jobId },
          transaction
        });

        if (job) {
          await job.update({
            result_id: result.id,
            status: 'completed',
            completed_at: new Date()
          }, { transaction });

          logger.info('Linked analysis result to job', {
            resultId: result.id,
            jobId: job.job_id
          });
        }
      }

      await transaction.commit();

      // Return result with job association if linked
      if (jobId) {
        return await this.getCompleteAnalysisResult(result.id, { includeJobs: true });
      }

      return result;
    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to create result with job link', {
        jobId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update job status and handle result linking
   * @param {String} jobId - Job ID
   * @param {String} status - New status
   * @param {Object} updateData - Additional update data
   * @returns {Promise<Object>} Updated job with associations
   */
  static async updateJobWithAssociations(jobId, status, updateData = {}) {
    const transaction = await AnalysisJob.sequelize.transaction();

    try {
      const job = await AnalysisJob.findOne({
        where: { job_id: jobId },
        transaction
      });

      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }

      const updates = {
        status,
        ...updateData
      };

      // Set completion timestamp for completed/failed jobs
      if (['completed', 'failed'].includes(status)) {
        updates.completed_at = new Date();
      }

      // Set processing start time for processing status
      if (status === 'processing' && !job.processing_started_at) {
        updates.processing_started_at = new Date();
      }

      await job.update(updates, { transaction });

      await transaction.commit();

      // Return job with associations
      return await this.getJobWithResult(jobId, { includeUserProfile: false });
    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to update job with associations', {
        jobId,
        status,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get comprehensive statistics with associations
   * @param {String} userId - Optional user ID for user-specific stats
   * @returns {Promise<Object>} Comprehensive statistics
   */
  static async getComprehensiveStats(userId = null) {
    try {
      const [resultStats, jobStats] = await Promise.all([
        userId ? AnalysisResult.getUserStats(userId) : this.getGlobalResultStats(),
        AnalysisJob.getJobStats(userId)
      ]);

      // Get recent activity with associations
      const recentActivity = await this.getRecentActivity(userId, 10);

      return {
        results: resultStats,
        jobs: jobStats,
        recentActivity,
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get comprehensive stats', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get recent activity with associations
   * @param {String} userId - Optional user ID
   * @param {Number} limit - Number of activities to return
   * @returns {Promise<Array>} Recent activities
   */
  static async getRecentActivity(userId = null, limit = 10) {
    try {
      const whereClause = userId ? { user_id: userId } : {};

      const [recentResults, recentJobs] = await Promise.all([
        AnalysisResult.findAll({
          where: whereClause,
          order: [['created_at', 'DESC']],
          limit: Math.ceil(limit / 2),
          include: [{
            model: AnalysisJob,
            as: 'jobs',
            required: false,
            limit: 1,
            order: [['created_at', 'DESC']]
          }]
        }),
        AnalysisJob.findAll({
          where: whereClause,
          order: [['created_at', 'DESC']],
          limit: Math.ceil(limit / 2),
          include: [{
            model: AnalysisResult,
            as: 'result',
            required: false
          }]
        })
      ]);

      // Combine and sort by timestamp
      const combined = [
        ...recentResults.map(r => ({ type: 'result', data: r, timestamp: r.created_at })),
        ...recentJobs.map(j => ({ type: 'job', data: j, timestamp: j.created_at }))
      ];

      return combined
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    } catch (error) {
      logger.error('Failed to get recent activity', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get global result statistics
   * @returns {Promise<Object>} Global statistics
   */
  static async getGlobalResultStats() {
    const { sequelize } = require('../config/database');
    
    const [results] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_analyses,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(DISTINCT user_id) as unique_users,
        MAX(created_at) as latest_analysis
      FROM archive.analysis_results
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    return {
      total_analyses: parseInt(results.total_analyses) || 0,
      completed: parseInt(results.completed) || 0,
      processing: parseInt(results.processing) || 0,
      failed: parseInt(results.failed) || 0,
      unique_users: parseInt(results.unique_users) || 0,
      latest_analysis: results.latest_analysis
    };
  }
}

module.exports = AssociationService;
