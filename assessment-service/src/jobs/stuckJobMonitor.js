const { Pool } = require('pg');
const logger = require('../utils/logger');
const archiveService = require('../services/archiveService');
const authService = require('../services/authService');

/**
 * StuckJobMonitor - Monitor and fix stuck analysis jobs
 * Week 2 Implementation: Assessment Service as Source of Truth
 * 
 * This monitor detects jobs that are stuck in 'processing' or 'queued' status
 * for longer than the configured timeout and automatically:
 * 1. Updates job status to 'failed'
 * 2. Updates result status to 'failed' (if result_id exists)
 * 3. Refunds tokens to user
 * 4. Publishes notification event
 */
class StuckJobMonitor {
  constructor() {
    // Database connection pool
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'atma_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 5, // Small pool for monitoring
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });

    // Configuration
    this.config = {
      checkIntervalMs: parseInt(process.env.STUCK_JOB_CHECK_INTERVAL || '300000'), // 5 minutes
      processingTimeoutMinutes: parseInt(process.env.STUCK_JOB_PROCESSING_TIMEOUT || '10'), // 10 minutes
      queuedTimeoutMinutes: parseInt(process.env.STUCK_JOB_QUEUED_TIMEOUT || '15'), // 15 minutes
      tokenCost: parseInt(process.env.ANALYSIS_TOKEN_COST || '1')
    };

    this.intervalId = null;
    this.isRunning = false;

    logger.info('StuckJobMonitor initialized', {
      checkIntervalMs: this.config.checkIntervalMs,
      processingTimeoutMinutes: this.config.processingTimeoutMinutes,
      queuedTimeoutMinutes: this.config.queuedTimeoutMinutes
    });
  }

  /**
   * Start the stuck job monitor
   */
  start() {
    if (this.isRunning) {
      logger.warn('StuckJobMonitor is already running');
      return;
    }

    this.isRunning = true;
    
    // Run initial check
    this.checkStuckJobs().catch(error => {
      logger.error('Initial stuck job check failed', { error: error.message });
    });

    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.checkStuckJobs().catch(error => {
        logger.error('Periodic stuck job check failed', { error: error.message });
      });
    }, this.config.checkIntervalMs);

    logger.info('StuckJobMonitor started', {
      checkInterval: `${this.config.checkIntervalMs / 1000}s`
    });
  }

  /**
   * Stop the stuck job monitor
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Close database pool
    await this.pool.end();

    logger.info('StuckJobMonitor stopped');
  }

  /**
   * Check for stuck jobs and fix them
   * @returns {Promise<Object>} - Result summary
   */
  async checkStuckJobs() {
    const client = await this.pool.connect();

    try {
      logger.info('Starting stuck job check');

      // Query stuck jobs from Archive Service database
      // Jobs stuck in 'processing' status
      const processingQuery = `
        SELECT 
          aj.id,
          aj.job_id,
          aj.user_id,
          aj.status,
          aj.result_id,
          aj.created_at,
          aj.updated_at,
          u.email,
          EXTRACT(EPOCH FROM (NOW() - aj.updated_at))/60 as minutes_stuck
        FROM archive.analysis_jobs aj
        JOIN auth.users u ON aj.user_id = u.id
        WHERE aj.status = 'processing'
          AND aj.updated_at < NOW() - INTERVAL '${this.config.processingTimeoutMinutes} minutes'
        ORDER BY aj.created_at ASC
      `;

      // Jobs stuck in 'queued' status (never picked up by worker)
      const queuedQuery = `
        SELECT 
          aj.id,
          aj.job_id,
          aj.user_id,
          aj.status,
          aj.result_id,
          aj.created_at,
          aj.updated_at,
          u.email,
          EXTRACT(EPOCH FROM (NOW() - aj.created_at))/60 as minutes_stuck
        FROM archive.analysis_jobs aj
        JOIN auth.users u ON aj.user_id = u.id
        WHERE aj.status = 'queued'
          AND aj.created_at < NOW() - INTERVAL '${this.config.queuedTimeoutMinutes} minutes'
        ORDER BY aj.created_at ASC
      `;

      const [processingResult, queuedResult] = await Promise.all([
        client.query(processingQuery),
        client.query(queuedQuery)
      ]);

      const stuckJobs = [...processingResult.rows, ...queuedResult.rows];

      if (stuckJobs.length === 0) {
        logger.debug('No stuck jobs found');
        return { fixed: 0, total: 0 };
      }

      logger.info(`Found ${stuckJobs.length} stuck jobs`, {
        processing: processingResult.rows.length,
        queued: queuedResult.rows.length,
        jobs: stuckJobs.map(job => ({
          jobId: job.job_id,
          email: job.email,
          status: job.status,
          minutesStuck: Math.round(job.minutes_stuck * 100) / 100
        }))
      });

      let fixedCount = 0;

      // Fix each stuck job
      for (const job of stuckJobs) {
        try {
          await this.fixStuckJob(job);
          fixedCount++;
        } catch (error) {
          logger.error('Failed to fix stuck job', {
            jobId: job.job_id,
            email: job.email,
            error: error.message
          });
        }
      }

      logger.info('Stuck job check completed', {
        totalFound: stuckJobs.length,
        fixed: fixedCount,
        failed: stuckJobs.length - fixedCount
      });

      return { fixed: fixedCount, total: stuckJobs.length };

    } catch (error) {
      logger.error('Error in stuck job monitoring', { error: error.message });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Fix a specific stuck job
   * @param {Object} job - Stuck job data
   */
  async fixStuckJob(job) {
    const { job_id, user_id, email, result_id, status, minutes_stuck } = job;

    logger.info('Fixing stuck job', {
      jobId: job_id,
      userId: user_id,
      email,
      status,
      minutesStuck: Math.round(minutes_stuck * 100) / 100,
      resultId: result_id
    });

    const errorMessage = `Job stuck in ${status} status for ${Math.round(minutes_stuck)} minutes. Automatically marked as failed.`;

    try {
      // Step 1: Update job status to failed in Archive Service
      await archiveService.updateJobStatus(job_id, 'failed', {
        error_message: errorMessage
      });

      logger.info('Job status updated to failed', { jobId: job_id });

      // Step 2: Update result status to failed if result_id exists
      if (result_id) {
        try {
          await archiveService.updateAnalysisResult(result_id, {
            status: 'failed',
            error_message: errorMessage
          });
          logger.info('Result status updated to failed', {
            jobId: job_id,
            resultId: result_id
          });
        } catch (resultError) {
          logger.error('Failed to update result status', {
            jobId: job_id,
            resultId: result_id,
            error: resultError.message
          });
          // Continue with refund even if result update fails
        }
      }

      // Step 3: Refund tokens to user
      try {
        await authService.refundTokens(user_id, null, this.config.tokenCost);
        logger.info('Tokens refunded for stuck job', {
          jobId: job_id,
          userId: user_id,
          email,
          refundedAmount: this.config.tokenCost
        });
      } catch (refundError) {
        logger.error('Failed to refund tokens for stuck job', {
          jobId: job_id,
          userId: user_id,
          error: refundError.message
        });
        // Don't throw - job is already marked as failed
      }

      // Step 4: Publish stuck job notification (future enhancement)
      // This will be handled by notification service consuming the failed status event
      logger.info('Stuck job fixed successfully', {
        jobId: job_id,
        userId: user_id,
        email
      });

    } catch (error) {
      logger.error('Failed to fix stuck job', {
        jobId: job_id,
        userId: user_id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get monitoring statistics
   * @returns {Promise<Object>} - Statistics
   */
  async getStats() {
    const client = await this.pool.connect();

    try {
      const statsQuery = `
        SELECT 
          COUNT(CASE WHEN aj.status = 'processing' THEN 1 END) as processing_jobs,
          COUNT(CASE WHEN aj.status = 'queued' THEN 1 END) as queued_jobs,
          COUNT(CASE WHEN aj.status = 'completed' THEN 1 END) as completed_jobs,
          COUNT(CASE WHEN aj.status = 'failed' THEN 1 END) as failed_jobs,
          COUNT(CASE WHEN aj.status = 'processing' 
            AND aj.updated_at < NOW() - INTERVAL '${this.config.processingTimeoutMinutes} minutes' 
            THEN 1 END) as stuck_processing,
          COUNT(CASE WHEN aj.status = 'queued' 
            AND aj.created_at < NOW() - INTERVAL '${this.config.queuedTimeoutMinutes} minutes' 
            THEN 1 END) as stuck_queued
        FROM archive.analysis_jobs aj
        WHERE aj.created_at >= NOW() - INTERVAL '24 hours'
      `;

      const result = await client.query(statsQuery);
      return result.rows[0];

    } finally {
      client.release();
    }
  }

  /**
   * Manually trigger a check (for testing/admin use)
   * @returns {Promise<Object>} - Result summary
   */
  async manualCheck() {
    logger.info('Manual stuck job check triggered');
    return this.checkStuckJobs();
  }
}

// Export singleton instance
const stuckJobMonitor = new StuckJobMonitor();

module.exports = stuckJobMonitor;

