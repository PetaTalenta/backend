/**
 * Idempotency Cache Cleanup Job
 * Scheduled job to clean up expired idempotency cache entries
 */

const cron = require('node-cron');
const idempotencyService = require('../services/idempotencyService');
const logger = require('../utils/logger');

class IdempotencyCleanupJob {
  constructor() {
    this.isRunning = false;
    this.task = null;
    this.intervalMinutes = parseInt(process.env.IDEMPOTENCY_CLEANUP_INTERVAL_MINUTES || '60');
  }

  /**
   * Start the cleanup job
   */
  start() {
    if (!idempotencyService.isEnabled()) {
      logger.info('Idempotency cleanup job disabled (idempotency service disabled)');
      return;
    }

    // Create cron expression for the specified interval
    const cronExpression = this.getCronExpression();
    
    this.task = cron.schedule(cronExpression, async () => {
      await this.runCleanup();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.task.start();
    
    logger.info('Idempotency cleanup job started', {
      intervalMinutes: this.intervalMinutes,
      cronExpression,
      nextRun: this.getNextRunTime()
    });
  }

  /**
   * Stop the cleanup job
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Idempotency cleanup job stopped');
    }
  }

  /**
   * Run cleanup manually
   */
  async runCleanup() {
    if (this.isRunning) {
      logger.warn('Idempotency cleanup already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting idempotency cache cleanup');
      
      const deletedCount = await idempotencyService.cleanupExpired();
      const duration = Date.now() - startTime;
      
      logger.info('Idempotency cache cleanup completed', {
        deletedEntries: deletedCount,
        durationMs: duration,
        nextRun: this.getNextRunTime()
      });

      return {
        success: true,
        deletedEntries: deletedCount,
        durationMs: duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Idempotency cache cleanup failed', {
        error: error.message,
        durationMs: duration
      });

      return {
        success: false,
        error: error.message,
        durationMs: duration
      };

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get cron expression based on interval minutes
   */
  getCronExpression() {
    if (this.intervalMinutes >= 60) {
      // For intervals >= 60 minutes, run every N hours
      const hours = Math.floor(this.intervalMinutes / 60);
      return `0 */${hours} * * *`;
    } else {
      // For intervals < 60 minutes, run every N minutes
      return `*/${this.intervalMinutes} * * * *`;
    }
  }

  /**
   * Get next run time for logging
   */
  getNextRunTime() {
    if (!this.task) {
      return 'Not scheduled';
    }

    try {
      // Calculate next run based on interval
      const now = new Date();
      const nextRun = new Date(now.getTime() + (this.intervalMinutes * 60 * 1000));
      return nextRun.toISOString();
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      enabled: idempotencyService.isEnabled(),
      running: this.isRunning,
      scheduled: this.task !== null,
      intervalMinutes: this.intervalMinutes,
      nextRun: this.getNextRunTime()
    };
  }
}

// Export singleton instance
module.exports = new IdempotencyCleanupJob();
