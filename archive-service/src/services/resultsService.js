/**
 * Results Service
 * Business logic for analysis results management
 */

const AnalysisResult = require('../models/AnalysisResult');
const AnalysisJob = require('../models/AnalysisJob');
const { NotFoundError, ForbiddenError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const batchMetrics = require('../middleware/batchMetrics');
const { sequelize } = require('../config/database');

/**
 * NOTE: Creation-time heavy business validation was deprecated (worker assumed trusted).
 * We keep only normalization & sanitization here; update transitions still validated.
 */

/**
 * Normalize & sanitize result payload.
 * - Flattens assessment_data.rawResponses → raw_responses
 * - Removes sensitive keys from assessment_data
 * Idempotent: safe to call multiple times.
 * @param {Object} data
 * @returns {Object}
 */
function normalizeResultPayload(data = {}) {
  const clone = { ...data };
  if (clone.assessment_data && typeof clone.assessment_data === 'object') {
    const sanitized = { ...clone.assessment_data };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    if (sanitized.rawResponses && !clone.raw_responses) {
      clone.raw_responses = sanitized.rawResponses;
    }
    clone.assessment_data = sanitized;
  }
  return clone;
}

/** Dev helper to create user automatically in development when FK missing */
async function ensureDevUser(userId, sequelize) {
  await sequelize.query(`
    INSERT INTO auth.users (id, email, password_hash, token_balance)
    VALUES (:userId, :email, :passwordHash, :tokenBalance)
    ON CONFLICT (id) DO NOTHING
  `, {
    replacements: {
      userId,
      email: `dev-user-${userId}@example.com`,
      passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.G',
      tokenBalance: 100
    }
  });
}

// Deprecated: validateBusinessLogic removed (worker provides validated data)

/**
 * Validate business logic for update operations
 * @param {Object} updateData - Update data
 * @param {Object} existingResult - Existing result from database
 * @param {Object} options - Additional options (e.g., isRetry)
 * @throws {Error} - If validation fails
 */
const validateUpdateBusinessLogic = async (updateData, existingResult, options = {}) => {
  // 1. Prevent status regression (completed -> processing) except for retry operations
  if (updateData.status && existingResult.status === 'completed' && updateData.status === 'processing') {
    if (!options.isRetry) {
      throw new Error('Cannot change status from completed back to processing');
    }
  }

  // 2. Validate status transitions
  const validTransitions = {
    'processing': ['completed', 'failed'],
    'failed': ['processing'], // Allow retry
    'completed': ['failed'] // Allow marking as failed if issues found
  };

  // Allow completed -> processing transition for retry operations
  if (options.isRetry && existingResult.status === 'completed' && updateData.status === 'processing') {
    // Allow this transition for retry
  } else if (updateData.status && existingResult.status !== updateData.status) {
    const allowedTransitions = validTransitions[existingResult.status] || [];
    if (!allowedTransitions.includes(updateData.status)) {
      throw new Error(`Invalid status transition from ${existingResult.status} to ${updateData.status}`);
    }
  }

  // 3. Validate data consistency for updates
  if (updateData.status === 'completed') {
    // persona_profile must exist either after update or currently stored
    const personaAfter = updateData.persona_profile !== undefined ? updateData.persona_profile : existingResult.persona_profile;
    if (!personaAfter) {
      throw new Error('Cannot mark as completed without persona_profile');
    }
  }

  if (updateData.status === 'failed') {
    const personaPresent = !!(updateData.persona_profile || existingResult.persona_profile);
    if (personaPresent && !updateData.error_message) {
      throw new Error('Failed status requires error_message when persona_profile exists');
    }
  }

  // 4. Validate persona profile updates
  if (updateData.persona_profile && typeof updateData.persona_profile === 'object') {
    const requiredFields = ['archetype', 'shortSummary', 'strengths', 'weaknesses', 'careerRecommendation'];
    const missingFields = requiredFields.filter(field => !updateData.persona_profile[field]);

    if (missingFields.length > 0) {
      throw new Error(`Updated persona profile missing required fields: ${missingFields.join(', ')}`);
    }
  }

  // 5. Prevent unauthorized modifications
  if (updateData.user_id && updateData.user_id !== existingResult.user_id) {
    throw new Error('Cannot change user_id of existing result');
  }

  if (updateData.created_at) {
    throw new Error('Cannot modify created_at timestamp');
  }

  logger.debug('Update business logic validation passed', {
    resultId: existingResult.id,
    updateFields: Object.keys(updateData),
    currentStatus: existingResult.status,
    newStatus: updateData.status
  });
};

// Batch processing configuration (UPDATED)
const BATCH_CONFIG = {
  MAX_BATCH_SIZE: parseInt(process.env.BATCH_MAX_SIZE || '100'),  // Naik dari 50 → 100
  BATCH_TIMEOUT: parseInt(process.env.BATCH_TIMEOUT || '2000'),   // Tetap 2 detik
  MAX_QUEUE_SIZE: parseInt(process.env.BATCH_MAX_QUEUE_SIZE || '2000') // Naik dari 1000 → 2000
};

// Batch processing queue
class BatchProcessor {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.batchTimer = null;
  }

  async addToBatch(data) {
    return new Promise((resolve, reject) => {
      // Check queue size limit
      if (this.queue.length >= BATCH_CONFIG.MAX_QUEUE_SIZE) {
        reject(new Error('Batch queue is full. Please try again later.'));
        return;
      }

      // Add to queue with promise resolvers
      this.queue.push({
        data,
        resolve,
        reject,
        timestamp: Date.now()
      });

      logger.debug('Added item to batch queue', {
        queueSize: this.queue.length,
        userId: data.user_id
      });

      // Process immediately if batch is full
      if (this.queue.length >= BATCH_CONFIG.MAX_BATCH_SIZE) {
        if (this.batchTimer) {
          clearTimeout(this.batchTimer);
          this.batchTimer = null;
        }
        this.processBatch();
      } else if (!this.batchTimer) {
        // Set timer for batch processing
        this.batchTimer = setTimeout(() => {
          this.processBatch();
        }, BATCH_CONFIG.BATCH_TIMEOUT);
      }
    });
  }

  async processBatch() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Get current batch
    const batch = this.queue.splice(0, BATCH_CONFIG.MAX_BATCH_SIZE);

    // Record batch start for metrics
    const batchInfo = batchMetrics.recordBatchStart(batch.length);

    logger.info('Processing batch', {
      batchSize: batch.length,
      remainingQueue: this.queue.length
    });

    try {
  // Normalize each item before bulk insert (sanitize + flatten)
  const normalizedBatch = batch.map(item => normalizeResultPayload(item.data));

      // Process batch using bulk insert
      const results = await this.bulkCreateResults(normalizedBatch);

      // Resolve all promises (reject if null/unexpected)
      batch.forEach((item, index) => {
        const res = results[index];
        if (res) {
          item.resolve(res);
        } else {
          item.reject(new Error('Result creation failed for item (null result)'));
        }
      });

      // Record successful batch completion
      batchMetrics.recordBatchEnd(batchInfo, true);

      logger.info('Batch processed successfully', {
        batchSize: batch.length,
        successCount: results.length
      });

    } catch (error) {
      // Record failed batch completion
      batchMetrics.recordBatchEnd(batchInfo, false, error);

      logger.error('Batch processing failed', {
        error: error.message,
        batchSize: batch.length
      });

      // Reject all promises in the batch
      batch.forEach(item => {
        item.reject(error);
      });
    } finally {
      this.processing = false;

      // Process next batch if queue is not empty
      if (this.queue.length > 0) {
        setImmediate(() => this.processBatch());
      }
    }
  }

  // TAMBAH: Enhanced Bulk Operations dengan Chunking
  async bulkCreateResults(dataArray) {
    const { Transaction } = require('sequelize');
    const transaction = await AnalysisResult.sequelize.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });

    try {
      logger.info('Starting enhanced bulk insert with chunking', {
        count: dataArray.length
      });

  // Chunk large batches untuk memory efficiency (cap 50 or batch size)
  const chunkSize = Math.min(50, BATCH_CONFIG.MAX_BATCH_SIZE);
      const chunks = [];
      for (let i = 0; i < dataArray.length; i += chunkSize) {
        chunks.push(dataArray.slice(i, i + chunkSize));
      }

      const allResults = [];
      for (const chunk of chunks) {
  // Normalize defensively (idempotent helper)
  const normalizedChunk = chunk.map(d => normalizeResultPayload(d));

  const results = await AnalysisResult.bulkCreate(normalizedChunk, {
          transaction,
          returning: true,
          validate: true,
          ignoreDuplicates: false,
          // BARU: Optimize untuk PostgreSQL
          logging: false
        });
        allResults.push(...results);

        logger.debug('Chunk processed', {
          chunkSize: chunk.length,
          totalProcessed: allResults.length
        });
      }

      await transaction.commit();

      logger.info('Enhanced bulk insert completed successfully', {
        insertedCount: allResults.length,
        chunksProcessed: chunks.length
      });

      return allResults;
    } catch (error) {
      await transaction.rollback();

      logger.error('Enhanced bulk insert failed', {
        error: error.message,
        count: dataArray.length
      });

  // If bulk insert fails, try individual inserts for better error clarity (may throw Aggregate)
  return await this.fallbackIndividualInserts(dataArray);
    }
  }

  async fallbackIndividualInserts(dataArray) {
    logger.info('Falling back to individual inserts', {
      count: dataArray.length
    });

  const results = [];
  const errors = [];

    for (let i = 0; i < dataArray.length; i++) {
      try {
        const result = await this.createSingleResult(dataArray[i]);
        results.push(result);
      } catch (error) {
        logger.error('Individual insert failed', {
          error: error.message,
          userId: dataArray[i].user_id,
          index: i
        });
        errors.push({ index: i, error: error.message });
        results.push(null); // maintain positional alignment
      }
    }

    if (errors.length > 0) {
      logger.warn('Some individual inserts failed', {
        totalCount: dataArray.length,
        successCount: results.filter(r => r !== null).length,
        errorCount: errors.length,
        errors: errors
      });
      const aggregate = new Error('Partial failure in individual inserts');
      aggregate.partial = true;
      aggregate.errors = errors;
      throw aggregate;
    }

    return results;
  }

  async createSingleResult(data) {
    // This is the original createResult logic for individual items
    try {
      const result = await AnalysisResult.create(data);
      return result;
    } catch (error) {
      // Handle foreign key constraint error for user_id in development mode
      if (error.name === 'SequelizeForeignKeyConstraintError' &&
          error.constraint === 'fk_analysis_results_user_id' &&
          process.env.NODE_ENV === 'development') {

        logger.warn('User not found, creating user for development mode', {
          userId: data.user_id
        });

        try {
          // Create user in auth.users table
          await ensureDevUser(data.user_id, AnalysisResult.sequelize);

          // Retry creating the analysis result
          const result = await AnalysisResult.create(data);
          return result;
        } catch (retryError) {
          logger.error('Failed to create user or retry analysis result creation', {
            error: retryError.message,
            userId: data.user_id
          });
          throw retryError;
        }
      }
      throw error;
    }
  }
}

// Global batch processor instance
const batchProcessor = new BatchProcessor();

/**
 * Create a new analysis result
 * @param {Object} data - Analysis result data
 * @param {Object} options - Creation options
 * @returns {Promise<Object>} - Created result
 */
const createResult = async (data, options = {}) => {
  const { useBatching = true } = options;

  try {
  // Normalize & sanitize
  const normalized = normalizeResultPayload(data);

    logger.info('Creating new analysis result', {
      userId: normalized.user_id,
      status: normalized.status,
      dataKeys: Object.keys(normalized),
      assessmentDataType: typeof normalized.assessment_data,
      personaProfileType: typeof normalized.persona_profile,
      useBatching
    });

    // Use batch processing for better performance under high load
    if (useBatching && process.env.NODE_ENV !== 'test') {
      logger.debug('Using batch processing for result creation', {
        userId: normalized.user_id,
        queueSize: batchProcessor.queue.length
      });

      const result = await batchProcessor.addToBatch(normalized);

      logger.info('Analysis result queued for batch processing', {
        userId: normalized.user_id,
        resultId: result?.id
      });

      return result;
    }

    // Fallback to individual processing
    logger.debug('Using individual processing for result creation', {
      userId: normalized.user_id
    });

    const result = await batchProcessor.createSingleResult(normalized);

    logger.info('Analysis result created individually', {
      id: result.id,
      userId: result.user_id,
      status: result.status
    });

    return result;
  } catch (error) {
    logger.error('Failed to create analysis result', {
      error: error.message,
      errorName: error.name,
      errorCode: error.code,
      constraint: error.constraint,
      detail: error.detail,
      userId: data.user_id,
      useBatching,
      stack: error.stack
    });

    throw error;
  }
};

/**
 * Create multiple analysis results in batch
 * @param {Array} dataArray - Array of analysis result data
 * @returns {Promise<Array>} - Array of created results
 */
const createResultsBatch = async (dataArray) => {
  try {
    logger.info('Creating multiple analysis results in batch', {
      count: dataArray.length,
      userIds: dataArray.map(d => d.user_id)
    });

    const normalized = dataArray.map(d => normalizeResultPayload(d));
    const results = await batchProcessor.bulkCreateResults(normalized);

    logger.info('Batch analysis results created successfully', {
      count: results.length,
      successCount: results.filter(r => r !== null).length
    });

    return results;
  } catch (error) {
    logger.error('Failed to create batch analysis results', {
      error: error.message,
      count: dataArray.length
    });
    throw error;
  }
};

/**
 * Get analysis results for a user with pagination
 * @param {String} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Results with pagination
 */
const getResultsByUser = async (userId, options = {}) => {
  try {
    logger.info('Fetching analysis results for user', {
      userId,
      options
    });
    
    const results = await AnalysisResult.findByUserWithPagination(userId, options);
    
    logger.info('Analysis results fetched successfully', {
      userId,
      count: results.results.length,
      total: results.pagination.total
    });
    
    return results;
  } catch (error) {
    logger.error('Failed to fetch analysis results', {
      error: error.message,
      userId
    });
    throw error;
  }
};

/**
 * Get a specific analysis result by ID
 * @param {String} resultId - Result ID
 * @param {String} userId - User ID (for access control)
 * @param {Boolean} isInternalService - Whether request is from internal service
 * @returns {Promise<Object>} - Analysis result
 */
const getResultById = async (resultId, userId = null, isInternalService = false) => {
  try {
    logger.info('Fetching analysis result by ID', {
      resultId,
      userId,
      isInternalService
    });
    
    const result = await AnalysisResult.findByPk(resultId);
    
    if (!result) {
      throw new NotFoundError('Analysis result not found');
    }
    
    // Check access permissions (skip for internal services)
    // NOTE: All results are now always public - removed private access control
    if (!isInternalService) {
      // Always allow access for all users and non-users (results are always public)
      logger.info('Access granted to public result', {
        resultId,
        requestingUserId: userId,
        ownerUserId: result.user_id,
        isNonUser: !userId
      });
    }
    
    logger.info('Analysis result fetched successfully', {
      resultId,
      userId: result.user_id
    });
    
    return result;
  } catch (error) {
    logger.error('Failed to fetch analysis result', {
      error: error.message,
      resultId,
      userId
    });
    throw error;
  }
};

/**
 * Update an analysis result
 * @param {String} resultId - Result ID
 * @param {Object} updateData - Update data
 * @param {String} userId - User ID (for access control)
 * @param {Boolean} isInternalService - Whether request is from internal service
 * @param {Object} options - Additional options (e.g., isRetry)
 * @returns {Promise<Object>} - Updated result
 */
const updateResult = async (resultId, updateData, userId = null, isInternalService = false, options = {}) => {
  try {
    logger.info('Updating analysis result', {
      resultId,
      userId,
      isInternalService,
      updateFields: Object.keys(updateData)
    });

    const result = await AnalysisResult.findByPk(resultId);

    if (!result) {
      throw new NotFoundError('Analysis result not found');
    }

    // Check access permissions (skip for internal services)
    if (!isInternalService && userId && result.user_id !== userId) {
      throw new ForbiddenError('You do not have access to this analysis result');
    }

    // Business logic validation for updates
    await validateUpdateBusinessLogic(updateData, result, options);

    // Update the result
    await result.update(updateData);
    
    logger.info('Analysis result updated successfully', {
      resultId,
      userId: result.user_id
    });
    
    return result;
  } catch (error) {
    logger.error('Failed to update analysis result', {
      error: error.message,
      resultId,
      userId
    });
    throw error;
  }
};

/**
 * Delete an analysis result
 * @param {String} resultId - Result ID
 * @param {String} userId - User ID (for access control)
 * @returns {Promise<void>}
 */
const deleteResult = async (resultId, userId) => {
  const transaction = await sequelize.transaction();

  try {
    logger.info('Deleting analysis result', {
      resultId,
      userId
    });

    const result = await AnalysisResult.findByPk(resultId, { transaction });

    if (!result) {
      await transaction.rollback();
      throw new NotFoundError('Analysis result not found');
    }

    // Check access permissions
    if (result.user_id !== userId) {
      await transaction.rollback();
      throw new ForbiddenError('You do not have access to this analysis result');
    }

    // Find and delete related jobs (cascade delete)
    const relatedJobs = await AnalysisJob.findAll({
      where: { result_id: resultId },
      transaction
    });

    if (relatedJobs.length > 0) {
      logger.info('Deleting related jobs', {
        resultId,
        jobCount: relatedJobs.length,
        jobIds: relatedJobs.map(job => job.job_id)
      });

      // Delete all related jobs
      await AnalysisJob.destroy({
        where: { result_id: resultId },
        transaction
      });
    }

    // Delete the result
    await result.destroy({ transaction });

    await transaction.commit();

    logger.info('Analysis result deleted successfully', {
      resultId,
      userId,
      relatedJobsDeleted: relatedJobs.length
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Failed to delete analysis result', {
      error: error.message,
      resultId,
      userId
    });
    throw error;
  }
};

/**
 * Toggle public status of an analysis result
 * DISABLED: All results are now always public
 * @param {String} resultId - Result ID
 * @param {String} userId - User ID (must be the owner)
 * @param {Boolean} isPublic - New public status
 * @returns {Promise<Object>} - Updated result
 */
// const togglePublicStatus = async (resultId, userId, isPublic) => {
//   try {
//     logger.info('Toggling public status of analysis result', {
//       resultId,
//       userId,
//       isPublic
//     });

//     const result = await AnalysisResult.findByPk(resultId);

//     if (!result) {
//       throw new NotFoundError('Analysis result not found');
//     }

//     // Check access permissions - only owner can change public status
//     if (result.user_id !== userId) {
//       throw new ForbiddenError('You do not have access to modify this analysis result');
//     }

//     // Update the public status
//     await result.update({ is_public: isPublic });

//     logger.info('Public status updated successfully', {
//       resultId,
//       userId,
//       isPublic
//     });

//     return result;
//   } catch (error) {
//     logger.error('Failed to toggle public status', {
//       error: error.message,
//       resultId,
//       userId,
//       isPublic
//     });
//     throw error;
//   }
// };

/**
 * Get batch processing statistics
 * @returns {Object} - Batch processing stats
 */
const getBatchStats = () => {
  return {
    queueSize: batchProcessor.queue.length,
    isProcessing: batchProcessor.processing,
    config: BATCH_CONFIG,
    hasTimer: !!batchProcessor.batchTimer
  };
};

/**
 * Force process current batch (for testing or manual triggers)
 * @returns {Promise<void>}
 */
const forceBatchProcess = async () => {
  logger.info('Manually triggering batch processing', {
    queueSize: batchProcessor.queue.length
  });

  await batchProcessor.processBatch();
};

/**
 * Clear batch queue (for emergency situations)
 * @returns {Number} - Number of items cleared
 */
const clearBatchQueue = () => {
  const clearedCount = batchProcessor.queue.length;

  // Reject all pending promises
  batchProcessor.queue.forEach(item => {
    item.reject(new Error('Batch queue was manually cleared'));
  });

  batchProcessor.queue = [];

  if (batchProcessor.batchTimer) {
    clearTimeout(batchProcessor.batchTimer);
    batchProcessor.batchTimer = null;
  }

  logger.warn('Batch queue cleared manually', {
    clearedCount
  });

  return clearedCount;
};

module.exports = {
  createResult,
  createResultsBatch,
  getResultsByUser,
  getResultById,
  updateResult,
  deleteResult,
  // togglePublicStatus, // DISABLED: All results are now always public
  getBatchStats,
  forceBatchProcess,
  clearBatchQueue
};
