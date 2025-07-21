/**
 * Optimized Archive Service with Connection Pooling and Async Operations
 */

const axios = require('axios');
const { Agent } = require('https');
const { Agent: HttpAgent } = require('http');
const logger = require('../utils/logger');
const performanceMonitor = require('../utils/performanceMonitor');

// Enhanced HTTP agents dengan monitoring
const http = require('http');
const https = require('https');

const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: parseInt(process.env.HTTP_KEEP_ALIVE_TIMEOUT || '30000'),
  maxSockets: parseInt(process.env.HTTP_MAX_SOCKETS_PER_HOST || '20'),
  maxTotalSockets: parseInt(process.env.HTTP_TOTAL_MAX_SOCKETS || '100'),
  timeout: 60000,
  // BARU: Connection monitoring
  scheduling: 'fifo'
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: parseInt(process.env.HTTP_KEEP_ALIVE_TIMEOUT || '30000'),
  maxSockets: parseInt(process.env.HTTP_MAX_SOCKETS_PER_HOST || '20'),
  maxTotalSockets: parseInt(process.env.HTTP_TOTAL_MAX_SOCKETS || '100'),
  timeout: 60000,
  scheduling: 'fifo'
});

// TAMBAH: Connection health monitoring
httpAgent.on('free', (socket, options) => {
  logger.debug('HTTP connection freed', {
    host: options.host,
    port: options.port
  });
});

httpsAgent.on('free', (socket, options) => {
  logger.debug('HTTPS connection freed', {
    host: options.host,
    port: options.port
  });
});

// Archive service configuration
const config = {
  baseURL: process.env.ARCHIVE_SERVICE_URL || 'http://localhost:3002/archive',
  serviceKey: process.env.INTERNAL_SERVICE_KEY || 'internal_service_secret_key_change_in_production',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
};

// Create optimized axios instance with connection pooling
const archiveClient = axios.create({
  baseURL: config.baseURL,
  timeout: config.timeout,
  httpAgent: httpAgent,
  httpsAgent: httpsAgent,
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Service': 'true',
    'X-Service-Key': config.serviceKey,
    'Connection': 'keep-alive'
  }
});

// Internal queue for non-critical operations
class AsyncOperationQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.batchSize = parseInt(process.env.DB_BATCH_SIZE || '50');
    this.batchInterval = parseInt(process.env.DB_BATCH_INTERVAL || '1500'); // 1.5 seconds
    this.maxQueueSize = parseInt(process.env.DB_BATCH_MAX_QUEUE || '2000');

    // Start batch processor
    this.startBatchProcessor();
  }

  add(operation) {
    // Check queue size limit
    if (this.queue.length >= this.maxQueueSize) {
      logger.warn('Async queue is full, dropping operation', {
        operation: operation.type,
        queueSize: this.queue.length,
        maxQueueSize: this.maxQueueSize
      });
      return false;
    }

    this.queue.push({
      ...operation,
      timestamp: Date.now(),
      retries: 0
    });

    logger.debug('Operation added to async queue', {
      operation: operation.type,
      queueSize: this.queue.length,
      maxQueueSize: this.maxQueueSize
    });

    return true;
  }

  async startBatchProcessor() {
    setInterval(async () => {
      if (this.queue.length > 0 && !this.processing) {
        await this.processBatch();
      }
    }, this.batchInterval);
  }

  async processBatch() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const batch = this.queue.splice(0, this.batchSize);
    const batchStartTime = Date.now();

    // Update performance monitor
    performanceMonitor.updateQueueDepth(this.queue.length);

    logger.info('Processing async operation batch', {
      batchSize: batch.length,
      remainingQueue: this.queue.length
    });

    let successCount = 0;
    for (const operation of batch) {
      try {
        await this.executeOperation(operation);
        successCount++;
      } catch (error) {
        logger.error('Failed to execute async operation', {
          operation: operation.type,
          error: error.message,
          retries: operation.retries
        });

        // Retry logic
        if (operation.retries < 3) {
          operation.retries++;
          this.queue.push(operation);
        }
      }
    }

    // Record batch processing performance
    const batchSuccess = successCount === batch.length;
    performanceMonitor.recordBatchProcessing(batchStartTime, batch.length, batchSuccess);

    this.processing = false;
  }

  async executeOperation(operation) {
    switch (operation.type) {
      case 'updateJobStatus':
        return await this.updateJobStatusDirect(operation.jobId, operation.status, operation.data);
      case 'logUsage':
        return await this.logUsageData(operation.data);
      default:
        logger.warn('Unknown async operation type', { type: operation.type });
    }
  }

  async updateJobStatusDirect(jobId, status, additionalData = {}) {
    const requestBody = { status, ...additionalData };
    const response = await archiveClient.put(`/jobs/${jobId}/status`, requestBody);
    return response.data;
  }

  async logUsageData(usageData) {
    const response = await archiveClient.post('/usage-logs', usageData);
    return response.data;
  }
}

// Initialize async queue
const asyncQueue = new AsyncOperationQueue();

/**
 * Batch operation for multiple database updates
 * @param {Array} operations - Array of operations to execute
 * @returns {Promise<Array>} - Results array
 */
const executeBatchOperations = async (operations) => {
  try {
    logger.info('Executing batch database operations', {
      operationCount: operations.length
    });

    const batchRequest = {
      operations: operations.map(op => ({
        type: op.type,
        data: op.data,
        id: op.id || Date.now() + Math.random()
      }))
    };

    const response = await archiveClient.post('/batch-operations', batchRequest);
    
    logger.info('Batch operations completed successfully', {
      operationCount: operations.length,
      successCount: response.data.results.filter(r => r.success).length
    });

    return response.data.results;
  } catch (error) {
    logger.error('Batch operations failed', {
      operationCount: operations.length,
      error: error.message
    });
    throw error;
  }
};

/**
 * Async job status update (non-blocking)
 * @param {String} jobId - Job ID
 * @param {String} status - New status
 * @param {Object} additionalData - Additional data
 */
const updateJobStatusAsync = (jobId, status, additionalData = {}) => {
  asyncQueue.add({
    type: 'updateJobStatus',
    jobId,
    status,
    data: additionalData
  });
};

/**
 * Optimized save analysis result with retry logic
 * @param {String} userId - User ID
 * @param {Object} assessmentData - Assessment data
 * @param {Object} personaProfile - Persona profile
 * @param {String} jobId - Job ID
 * @param {String} assessmentName - Assessment name
 * @returns {Promise<Object>} - Save result
 */
const saveAnalysisResultOptimized = async (userId, assessmentData, personaProfile, jobId, assessmentName = 'AI-Driven Talent Mapping') => {
  const maxRetries = config.retryAttempts;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info('Saving analysis result (optimized)', {
        jobId,
        userId,
        attempt,
        maxRetries
      });

      const requestBody = {
        user_id: userId,
        assessment_data: assessmentData,
        persona_profile: personaProfile,
        assessment_name: assessmentName,
        status: 'completed'
      };

      const response = await archiveClient.post('/results', requestBody);

      logger.info('Analysis result saved successfully (optimized)', {
        jobId,
        userId,
        resultId: response.data.data.id,
        attempt
      });

      return {
        success: true,
        id: response.data.data.id,
        status: response.data.data.status,
        created_at: response.data.data.created_at
      };

    } catch (error) {
      lastError = error;
      
      logger.warn('Save analysis result attempt failed', {
        jobId,
        userId,
        attempt,
        maxRetries,
        error: error.message
      });

      if (attempt < maxRetries) {
        const delay = config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  logger.error('All save analysis result attempts failed', {
    jobId,
    userId,
    maxRetries,
    error: lastError.message
  });

  throw lastError;
};

module.exports = {
  saveAnalysisResultOptimized,
  executeBatchOperations,
  updateJobStatusAsync,
  asyncQueue
};
