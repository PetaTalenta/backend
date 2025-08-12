/**
 * Analysis Jobs Service
 * Service layer for managing analysis jobs
 */

const AnalysisJob = require('../models/AnalysisJob');
const AnalysisResult = require('../models/AnalysisResult');
const AssociationService = require('./associationService');
const logger = require('../utils/logger');
const { sequelize } = require('../config/database');

class AnalysisJobsService {
  /**
   * Create a new analysis job
   * @param {Object} jobData - Job data
   * @returns {Promise<Object>} Created job
   */
  async createJob(jobData) {
    try {
      logger.info('Creating analysis job', { 
        jobId: jobData.job_id, 
        userId: jobData.user_id 
      });

      const job = await AnalysisJob.create(jobData);
      
      logger.info('Analysis job created successfully', { 
        jobId: job.job_id,
        userId: job.user_id,
        status: job.status
      });
      
      return job;
    } catch (error) {
      logger.error('Failed to create analysis job', { 
        jobId: jobData.job_id,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get job by job ID
   * @param {String} jobId - Job ID
   * @returns {Promise<Object|null>} Job or null if not found
   */
  async getJobByJobId(jobId) {
    try {
      const job = await AnalysisJob.findByJobId(jobId);
      return job;
    } catch (error) {
      logger.error('Failed to get job by job ID', {
        jobId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get job by job ID with result data
   * @param {String} jobId - Job ID
   * @returns {Promise<Object|null>} Job object with archetype only
   */
  async getJobByJobIdWithResult(jobId) {
    try {
      const job = await AnalysisJob.findByJobId(jobId, true); // includeAssociations = true

      if (!job) {
        return null;
      }

      const jobData = job.toJSON();

      // If result exists, extract only archetype from persona_profile
      if (jobData.result && jobData.result.persona_profile && jobData.result.persona_profile.archetype) {
        jobData.archetype = jobData.result.persona_profile.archetype;
      } else {
        jobData.archetype = null;
      }

      // Remove the nested result object
      delete jobData.result;

      return jobData;
    } catch (error) {
      logger.error('Failed to get job by job ID with result', {
        jobId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get job by database ID
   * @param {String} id - Database ID
   * @returns {Promise<Object|null>} Job or null if not found
   */
  async getJobById(id) {
    try {
      const job = await AnalysisJob.findByPk(id, {
        include: [{
          model: AnalysisResult,
          as: 'result',
          required: false
        }]
      });
      return job;
    } catch (error) {
      logger.error('Failed to get job by ID', { 
        id, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Update job status
   * @param {String} jobId - Job ID
   * @param {String} status - New status
   * @param {Object} additionalData - Additional data to update
   * @returns {Promise<Object>} Updated job
   */
  async updateJobStatus(jobId, status, additionalData = {}) {
    const transaction = await sequelize.transaction();
    
    try {
      logger.info('Updating analysis job status', { 
        jobId, 
        status, 
        additionalData 
      });

      const updateData = { status, ...additionalData };
      
      // Set completed_at timestamp for completed or failed jobs
      if (status === 'completed' || status === 'failed') {
        updateData.completed_at = new Date();
      }
      
      const [updatedRows] = await AnalysisJob.update(updateData, {
        where: { job_id: jobId },
        transaction
      });
      
      if (updatedRows === 0) {
        await transaction.rollback();
        throw new Error(`Job with ID ${jobId} not found`);
      }
      
      // Get the updated job
      const updatedJob = await this.getJobByJobId(jobId);
      
      await transaction.commit();
      
      logger.info('Analysis job status updated successfully', { 
        jobId, 
        status,
        updatedAt: updatedJob.updated_at
      });
      
      return updatedJob;
    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to update job status', { 
        jobId, 
        status,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get jobs by user ID
   * @param {String} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Jobs with pagination info
   */
  async getJobsByUser(userId, options = {}) {
    try {
      // Ensure includeAssociations is set to true to fetch AnalysisResult data
      const optionsWithAssociations = { ...options, includeAssociations: true };
      const result = await AnalysisJob.getJobsByUser(userId, optionsWithAssociations);

      // Transform jobs to extract only archetype from persona_profile
      const transformedJobs = result.rows.map(job => {
        const jobData = job.toJSON();

        // If result exists, extract only archetype from persona_profile
        if (jobData.result && jobData.result.persona_profile && jobData.result.persona_profile.archetype) {
          jobData.archetype = jobData.result.persona_profile.archetype;
        } else {
          jobData.archetype = null;
        }

        // Remove the nested result object
        delete jobData.result;

        return jobData;
      });

      return {
        jobs: transformedJobs,
        pagination: {
          total: result.count,
          limit: options.limit || 10,
          offset: options.offset || 0,
          hasMore: (options.offset || 0) + (options.limit || 10) < result.count
        }
      };
    } catch (error) {
      logger.error('Failed to get jobs by user', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all jobs (for internal services)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Jobs with pagination info
   */
  async getJobs(options = {}) {
    try {
      // For internal services, we can get all jobs without user restriction
      const { limit = 10, offset = 0, status, assessment_name } = options;

      const whereClause = {};
      if (status) {
        whereClause.status = status;
      }
      if (assessment_name) {
        whereClause.assessment_name = assessment_name;
      }

      const result = await AnalysisJob.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: AnalysisResult,
            as: 'result',
            required: false
          }
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      // Transform jobs to extract only archetype from persona_profile
      const transformedJobs = result.rows.map(job => {
        const jobData = job.toJSON();

        // If result exists, extract only archetype from persona_profile
        if (jobData.result && jobData.result.persona_profile && jobData.result.persona_profile.archetype) {
          jobData.archetype = jobData.result.persona_profile.archetype;
        } else {
          jobData.archetype = null;
        }

        // Remove the nested result object
        delete jobData.result;

        return jobData;
      });

      return {
        jobs: transformedJobs,
        pagination: {
          total: result.count,
          limit: limit,
          offset: offset,
          hasMore: offset + limit < result.count
        }
      };
    } catch (error) {
      logger.error('Failed to get all jobs', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get job statistics
   * @param {String} userId - User ID (optional, for user-specific stats)
   * @returns {Promise<Object>} Job statistics
   */
  async getJobStats(userId = null) {
    try {
      const stats = await AnalysisJob.getJobStats(userId);
      return stats;
    } catch (error) {
      logger.error('Failed to get job statistics', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete job (soft delete by updating status)
   * @param {String} jobId - Job ID
   * @param {String} userId - User ID (for authorization)
   * @returns {Promise<Boolean>} Success status
   */
  async deleteJob(jobId, userId) {
    const transaction = await sequelize.transaction();
    
    try {
      logger.info('Deleting analysis job', { jobId, userId });

      // First check if job exists and belongs to user
      const job = await AnalysisJob.findOne({
        where: { 
          job_id: jobId,
          user_id: userId 
        },
        transaction
      });

      if (!job) {
        await transaction.rollback();
        throw new Error(`Job with ID ${jobId} not found or access denied`);
      }

      // Don't allow deletion of processing jobs
      if (job.status === 'processing') {
        await transaction.rollback();
        throw new Error('Cannot delete job that is currently processing');
      }

      // Update status to indicate deletion
      await AnalysisJob.update(
        { status: 'cancelled' },
        { 
          where: { job_id: jobId },
          transaction 
        }
      );

      await transaction.commit();
      
      logger.info('Analysis job deleted successfully', { jobId, userId });
      return true;
    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to delete job', { 
        jobId, 
        userId,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Clean up old jobs (for maintenance)
   * @param {Number} daysOld - Delete jobs older than this many days
   * @returns {Promise<Number>} Number of jobs cleaned up
   */
  async cleanupOldJobs(daysOld = 30) {
    try {
      logger.info('Starting cleanup of old jobs', { daysOld });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const [deletedCount] = await sequelize.query(`
        DELETE FROM archive.analysis_jobs 
        WHERE created_at < :cutoffDate 
        AND status IN ('completed', 'failed', 'cancelled')
      `, {
        replacements: { cutoffDate },
        type: sequelize.QueryTypes.DELETE
      });

      logger.info('Cleanup completed', { 
        daysOld, 
        deletedCount: deletedCount || 0 
      });
      
      return deletedCount || 0;
    } catch (error) {
      logger.error('Failed to cleanup old jobs', { 
        daysOld,
        error: error.message 
      });
      throw error;
    }
  }
}

module.exports = new AnalysisJobsService();
