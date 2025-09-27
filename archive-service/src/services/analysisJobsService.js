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

      // CRITICAL VALIDATION: Prevent jobs from being marked completed without result_id
      if (status === 'completed' && !additionalData.result_id) {
        await transaction.rollback();
        const errorMsg = `Cannot mark job as completed without result_id. Job ID: ${jobId}`;
        logger.error(errorMsg, { jobId, status, additionalData });
        throw new Error(errorMsg);
      }

      // CRITICAL VALIDATION: Prevent jobs from being marked completed if there's an error message
      if (status === 'completed' && additionalData.error_message) {
        await transaction.rollback();
        const errorMsg = `Cannot mark job as completed when error_message is present. Job ID: ${jobId}, Error: ${additionalData.error_message}`;
        logger.error(errorMsg, { jobId, status, additionalData });
        throw new Error(errorMsg);
      }

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
      logger.info('Deleting analysis job - START', { jobId, userId });

      // First check if job exists and belongs to user
      logger.info('Finding job in database', { jobId, userId });
      const job = await AnalysisJob.findOne({
        where: {
          job_id: jobId,
          user_id: userId
        },
        include: [{
          model: AnalysisResult,
          as: 'result',
          required: false
        }],
        transaction
      });

      if (!job) {
        logger.warn('Job not found or access denied', { jobId, userId });
        await transaction.rollback();
        throw new Error(`Job with ID ${jobId} not found or access denied`);
      }

      logger.info('Job found, checking status', {
        jobId,
        userId,
        currentStatus: job.status,
        hasResult: !!job.result_id
      });

      // Don't allow deletion of processing jobs
      if (job.status === 'processing') {
        logger.warn('Cannot delete processing job', { jobId, userId });
        await transaction.rollback();
        throw new Error('Cannot delete job that is currently processing');
      }

      // If job has a result, delete it first (cascade delete)
      if (job.result_id) {
        logger.info('Deleting associated result', { jobId, resultId: job.result_id });
        await AnalysisResult.destroy({
          where: { id: job.result_id },
          transaction
        });
      }

      // Update status to indicate deletion
      logger.info('Updating job status to cancelled', { jobId, userId });
      const updateResult = await AnalysisJob.update(
        {
          status: 'cancelled',
          result_id: null // Clear result_id since we deleted the result
        },
        {
          where: { job_id: jobId },
          transaction
        }
      );

      logger.info('Update result', { jobId, userId, updateResult });

      await transaction.commit();
      logger.info('Transaction committed successfully', { jobId, userId });

      logger.info('Analysis job deleted successfully', { jobId, userId });
      return true;
    } catch (error) {
      logger.error('Error in deleteJob - rolling back transaction', {
        jobId,
        userId,
        error: error.message,
        stack: error.stack
      });
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
   * Delete job by job ID (for internal services, no user check)
   * @param {String} jobId - Job ID
   * @returns {Promise<Boolean>} Success status
   */
  async deleteJobByJobId(jobId) {
    const transaction = await sequelize.transaction();

    try {
      logger.info('Deleting analysis job by jobId - START', { jobId });

      // Find job without user restriction (for internal services)
      const job = await AnalysisJob.findOne({
        where: { job_id: jobId },
        include: [{
          model: AnalysisResult,
          as: 'result',
          required: false
        }],
        transaction
      });

      if (!job) {
        logger.warn('Job not found', { jobId });
        await transaction.rollback();
        throw new Error(`Job with ID ${jobId} not found`);
      }

      logger.info('Job found, checking status', {
        jobId,
        currentStatus: job.status,
        hasResult: !!job.result_id
      });

      // Don't allow deletion of processing jobs
      if (job.status === 'processing') {
        logger.warn('Cannot delete processing job', { jobId });
        await transaction.rollback();
        throw new Error('Cannot delete job that is currently processing');
      }

      // If job has a result, delete it first (cascade delete)
      if (job.result_id) {
        logger.info('Deleting associated result', { jobId, resultId: job.result_id });
        await AnalysisResult.destroy({
          where: { id: job.result_id },
          transaction
        });
      }

      // Update status to indicate deletion
      logger.info('Updating job status to cancelled', { jobId });
      const updateResult = await AnalysisJob.update(
        {
          status: 'cancelled',
          result_id: null // Clear result_id since we deleted the result
        },
        {
          where: { job_id: jobId },
          transaction
        }
      );

      logger.info('Update result', { jobId, updateResult });

      await transaction.commit();
      logger.info('Transaction committed successfully', { jobId });

      logger.info('Analysis job deleted successfully', { jobId });
      return true;
    } catch (error) {
      logger.error('Error in deleteJobByJobId - rolling back transaction', {
        jobId,
        error: error.message,
        stack: error.stack
      });
      await transaction.rollback();
      logger.error('Failed to delete job by jobId', {
        jobId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Ensure status consistency between job and result
   * @param {String} jobId - Job ID
   * @returns {Promise<Object>} Sync result
   */
  async syncJobResultStatus(jobId) {
    const transaction = await sequelize.transaction();

    try {
      logger.info('Syncing job-result status', { jobId });

      const job = await AnalysisJob.findOne({
        where: { job_id: jobId },
        include: [{
          model: AnalysisResult,
          as: 'result',
          required: false
        }],
        transaction
      });

      if (!job) {
        await transaction.rollback();
        throw new Error(`Job with ID ${jobId} not found`);
      }

      let syncActions = [];

      // If job has result_id but no result association, clear result_id
      if (job.result_id && !job.result) {
        logger.warn('Job has result_id but no result found, clearing result_id', {
          jobId,
          resultId: job.result_id
        });

        await job.update({ result_id: null }, { transaction });
        syncActions.push('cleared_orphaned_result_id');
      }

      // If job has result, ensure status consistency
      if (job.result) {
        const jobStatus = job.status;
        const resultStatus = job.result.status;

        // Define status mapping rules
        const statusMapping = {
          'completed': 'completed',
          'failed': 'failed',
          'processing': 'processing',
          'queued': 'processing', // Results don't have queued status
          'cancelled': 'failed' // Cancelled jobs should have failed results
        };

        const expectedResultStatus = statusMapping[jobStatus];

        if (resultStatus !== expectedResultStatus) {
          logger.info('Status mismatch detected, syncing result status', {
            jobId,
            jobStatus,
            resultStatus,
            expectedResultStatus
          });

          await job.result.update({ status: expectedResultStatus }, { transaction });
          syncActions.push(`synced_result_status_${resultStatus}_to_${expectedResultStatus}`);
        }
      }

      await transaction.commit();

      logger.info('Job-result status sync completed', {
        jobId,
        syncActions
      });

      return {
        jobId,
        syncActions,
        success: true
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to sync job-result status', {
        jobId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Clean up orphaned jobs (jobs with result_id that don't exist)
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOrphanedJobs() {
    const transaction = await sequelize.transaction();

    try {
      logger.info('Starting cleanup of orphaned jobs');

      // Find jobs with result_id that don't have corresponding results
      const orphanedJobs = await AnalysisJob.findAll({
        where: {
          result_id: {
            [sequelize.Sequelize.Op.ne]: null
          }
        },
        include: [{
          model: AnalysisResult,
          as: 'result',
          required: false
        }],
        transaction
      });

      // Filter jobs where result_id exists but result is null (orphaned)
      const jobsToDelete = orphanedJobs.filter(job => job.result_id && !job.result);

      if (jobsToDelete.length === 0) {
        await transaction.commit();
        logger.info('No orphaned jobs found');
        return {
          success: true,
          deletedCount: 0,
          message: 'No orphaned jobs found'
        };
      }

      const jobIds = jobsToDelete.map(job => job.job_id);
      logger.info('Found orphaned jobs to delete', {
        count: jobsToDelete.length,
        jobIds
      });

      // Delete orphaned jobs
      await AnalysisJob.destroy({
        where: {
          job_id: {
            [sequelize.Sequelize.Op.in]: jobIds
          }
        },
        transaction
      });

      await transaction.commit();

      logger.info('Orphaned jobs cleanup completed successfully', {
        deletedCount: jobsToDelete.length,
        deletedJobIds: jobIds
      });

      return {
        success: true,
        deletedCount: jobsToDelete.length,
        deletedJobIds: jobIds,
        message: `Successfully deleted ${jobsToDelete.length} orphaned jobs`
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to cleanup orphaned jobs', {
        error: error.message,
        stack: error.stack
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
