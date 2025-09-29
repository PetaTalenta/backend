/**
 * Stuck Job Monitor Service
 * 
 * Automatically detects and fixes jobs that are stuck in processing status
 * but already have completed analysis results
 */

const logger = require('../utils/logger');
const { Pool } = require('pg');

class StuckJobMonitor {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.monitorIntervalMs = 15 * 60 * 1000; // Check every 15 minutes
    
    // Database connection
    this.pool = new Pool({
      host: process.env.DB_HOST || 'postgres',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'atma_db',
      user: process.env.DB_USER || 'atma_user',
      password: process.env.DB_PASSWORD
    });
  }

  /**
   * Start monitoring for stuck jobs
   */
  start() {
    if (this.isRunning) {
      logger.warn('Stuck job monitor is already running');
      return;
    }

    logger.info('Starting stuck job monitor', {
      intervalMs: this.monitorIntervalMs
    });

    this.isRunning = true;
    
    // Run initial check
    this.checkAndFixStuckJobs().catch(error => {
      logger.error('Error in initial stuck job check', { error: error.message });
    });

    // Set up periodic monitoring
    this.interval = setInterval(() => {
      this.checkAndFixStuckJobs().catch(error => {
        logger.error('Error in periodic stuck job check', { error: error.message });
      });
    }, this.monitorIntervalMs);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping stuck job monitor');
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    this.isRunning = false;
  }

  /**
   * Check for stuck jobs and fix them
   */
  async checkAndFixStuckJobs() {
    const client = await this.pool.connect();
    
    try {
      logger.debug('Checking for stuck jobs...');

      // Find jobs that are stuck in processing but have corresponding analysis results
      const stuckJobsQuery = `
        SELECT 
          aj.id,
          aj.job_id,
          aj.user_id,
          aj.status,
          aj.created_at,
          aj.updated_at,
          ar.id as result_id,
          ar.created_at as result_created_at,
          u.email,
          EXTRACT(EPOCH FROM (NOW() - aj.updated_at))/3600 as hours_stuck
        FROM archive.analysis_jobs aj
        JOIN auth.users u ON aj.user_id = u.id
        LEFT JOIN archive.analysis_results ar ON aj.user_id = ar.user_id 
          AND ar.created_at >= aj.created_at 
          AND ar.created_at <= aj.created_at + INTERVAL '10 minutes'
        WHERE aj.status = 'processing'
          AND ar.id IS NOT NULL
          AND aj.updated_at < NOW() - INTERVAL '30 minutes'
        ORDER BY aj.created_at ASC
      `;

      const result = await client.query(stuckJobsQuery);
      const stuckJobs = result.rows;

      if (stuckJobs.length === 0) {
        logger.debug('No stuck jobs found');
        return { fixed: 0, total: 0 };
      }

      logger.info(`Found ${stuckJobs.length} stuck jobs to fix`, {
        stuckJobs: stuckJobs.map(job => ({
          jobId: job.job_id,
          email: job.email,
          hoursStuck: Math.round(job.hours_stuck * 100) / 100
        }))
      });

      let fixedCount = 0;

      // Fix each stuck job
      for (const job of stuckJobs) {
        try {
          await this.fixStuckJob(client, job);
          fixedCount++;
        } catch (error) {
          logger.error('Failed to fix stuck job', {
            jobId: job.job_id,
            email: job.email,
            error: error.message
          });
        }
      }

      logger.info('Stuck job monitor completed', {
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
   */
  async fixStuckJob(client, job) {
    await client.query('BEGIN');

    try {
      logger.info('Fixing stuck job', {
        jobId: job.job_id,
        email: job.email,
        resultId: job.result_id,
        hoursStuck: Math.round(job.hours_stuck * 100) / 100
      });

      // Update the job status to completed
      const updateQuery = `
        UPDATE archive.analysis_jobs
        SET 
          status = 'completed',
          result_id = $1,
          completed_at = $2,
          updated_at = NOW()
        WHERE job_id = $3
      `;

      const updateResult = await client.query(updateQuery, [
        job.result_id,
        job.result_created_at,
        job.job_id
      ]);

      if (updateResult.rowCount === 0) {
        throw new Error('Job not found or already updated');
      }

      await client.query('COMMIT');

      logger.info('Successfully fixed stuck job', {
        jobId: job.job_id,
        email: job.email,
        resultId: job.result_id
      });

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to fix stuck job', {
        jobId: job.job_id,
        email: job.email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get monitoring statistics
   */
  async getStats() {
    const client = await this.pool.connect();
    
    try {
      const statsQuery = `
        SELECT 
          COUNT(CASE WHEN aj.status = 'processing' AND ar.id IS NOT NULL THEN 1 END) as stuck_jobs,
          COUNT(CASE WHEN aj.status = 'processing' THEN 1 END) as total_processing,
          COUNT(CASE WHEN aj.status = 'completed' THEN 1 END) as total_completed,
          COUNT(CASE WHEN aj.status = 'failed' THEN 1 END) as total_failed
        FROM archive.analysis_jobs aj
        LEFT JOIN archive.analysis_results ar ON aj.user_id = ar.user_id 
          AND ar.created_at >= aj.created_at 
          AND ar.created_at <= aj.created_at + INTERVAL '10 minutes'
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
   */
  async manualCheck() {
    logger.info('Manual stuck job check triggered');
    return await this.checkAndFixStuckJobs();
  }
}

module.exports = new StuckJobMonitor();
