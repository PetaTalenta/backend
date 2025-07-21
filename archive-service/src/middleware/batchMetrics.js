/**
 * Batch Metrics Middleware
 * Phase 4: Monitoring & Metrics
 * 
 * Middleware untuk monitoring batch processing performance
 */

const logger = require('../utils/logger');

class BatchMetrics {
  constructor() {
    this.metrics = {
      batchesProcessed: 0,
      totalItemsProcessed: 0,
      averageBatchSize: 0,
      averageProcessingTime: 0,
      processingTimes: [],
      batchSizes: [],
      errors: 0,
      lastProcessedAt: null
    };
    
    this.startTime = Date.now();
    
    // Start periodic reporting
    this.startPeriodicReporting();
  }

  recordBatchStart(batchSize) {
    return {
      startTime: Date.now(),
      batchSize
    };
  }

  recordBatchEnd(batchInfo, success = true, error = null) {
    const endTime = Date.now();
    const processingTime = endTime - batchInfo.startTime;
    
    // Update metrics
    this.metrics.batchesProcessed++;
    this.metrics.totalItemsProcessed += batchInfo.batchSize;
    this.metrics.lastProcessedAt = endTime;
    
    // Track processing times (keep last 50 for memory efficiency)
    this.metrics.processingTimes.push(processingTime);
    if (this.metrics.processingTimes.length > 50) {
      this.metrics.processingTimes.shift();
    }
    
    // Track batch sizes (keep last 50)
    this.metrics.batchSizes.push(batchInfo.batchSize);
    if (this.metrics.batchSizes.length > 50) {
      this.metrics.batchSizes.shift();
    }
    
    // Calculate averages
    this.metrics.averageProcessingTime = this.metrics.processingTimes.reduce((a, b) => a + b, 0) / this.metrics.processingTimes.length;
    this.metrics.averageBatchSize = this.metrics.batchSizes.reduce((a, b) => a + b, 0) / this.metrics.batchSizes.length;
    
    if (!success) {
      this.metrics.errors++;
    }
    
    logger.debug('Batch processing completed', {
      batchSize: batchInfo.batchSize,
      processingTime,
      success,
      error: error?.message
    });
    
    // Alert untuk slow batches
    if (processingTime > 10000) { // 10 seconds
      logger.warn('Slow batch processing detected', {
        processingTime,
        batchSize: batchInfo.batchSize,
        averageTime: Math.round(this.metrics.averageProcessingTime)
      });
    }
  }

  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const uptimeInSeconds = uptime / 1000;
    
    return {
      batchesProcessed: this.metrics.batchesProcessed,
      totalItemsProcessed: this.metrics.totalItemsProcessed,
      averageBatchSize: Math.round(this.metrics.averageBatchSize * 100) / 100,
      averageProcessingTime: Math.round(this.metrics.averageProcessingTime),
      errors: this.metrics.errors,
      errorRate: this.metrics.batchesProcessed > 0 ? 
        Math.round((this.metrics.errors / this.metrics.batchesProcessed) * 10000) / 100 : 0,
      throughput: uptimeInSeconds > 0 ? 
        Math.round((this.metrics.totalItemsProcessed / uptimeInSeconds) * 100) / 100 : 0,
      batchThroughput: uptimeInSeconds > 0 ? 
        Math.round((this.metrics.batchesProcessed / uptimeInSeconds) * 100) / 100 : 0,
      uptime: Math.round(uptimeInSeconds),
      lastProcessedAt: this.metrics.lastProcessedAt
    };
  }

  startPeriodicReporting() {
    // Report metrics every 5 minutes
    setInterval(() => {
      const metrics = this.getMetrics();
      
      logger.info('Batch processing metrics report', metrics);
      
      // Performance alerts
      if (metrics.errorRate > 5) {
        logger.warn('High error rate in batch processing', {
          errorRate: metrics.errorRate,
          errors: metrics.errors,
          totalBatches: metrics.batchesProcessed
        });
      }
      
      if (metrics.averageProcessingTime > 5000) {
        logger.warn('High average processing time', {
          averageProcessingTime: metrics.averageProcessingTime
        });
      }
      
      if (metrics.throughput < 10) {
        logger.warn('Low throughput detected', {
          throughput: metrics.throughput,
          itemsPerSecond: metrics.throughput
        });
      }
      
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Express middleware function
  middleware() {
    return (req, res, next) => {
      // Add metrics recording to request object
      req.batchMetrics = {
        recordStart: (batchSize) => this.recordBatchStart(batchSize),
        recordEnd: (batchInfo, success, error) => this.recordBatchEnd(batchInfo, success, error),
        getMetrics: () => this.getMetrics()
      };
      
      next();
    };
  }

  reset() {
    this.metrics = {
      batchesProcessed: 0,
      totalItemsProcessed: 0,
      averageBatchSize: 0,
      averageProcessingTime: 0,
      processingTimes: [],
      batchSizes: [],
      errors: 0,
      lastProcessedAt: null
    };
    
    this.startTime = Date.now();
    
    logger.info('Batch metrics reset');
  }
}

// Singleton instance
const batchMetrics = new BatchMetrics();

module.exports = batchMetrics;
