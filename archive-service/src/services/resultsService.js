/**
 * Results Service
 * Business logic for analysis results management
 */

const AnalysisResult = require('../models/AnalysisResult');
const { NotFoundError, ForbiddenError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const batchMetrics = require('../middleware/batchMetrics');

/**
 * Validate business logic for analysis result data
 * @param {Object} data - Analysis result data
 * @throws {Error} - If validation fails
 */
const validateBusinessLogic = async (data) => {
  // 1. Validate user existence (only in production)
  if (process.env.NODE_ENV === 'production') {
    try {
      const userExists = await AnalysisResult.sequelize.query(
        'SELECT 1 FROM auth.users WHERE id = :userId LIMIT 1',
        {
          replacements: { userId: data.user_id },
          type: AnalysisResult.sequelize.QueryTypes.SELECT
        }
      );

      if (!userExists.length) {
        throw new Error(`User with ID ${data.user_id} does not exist`);
      }
    } catch (error) {
      logger.error('User validation failed', {
        userId: data.user_id,
        error: error.message
      });
      throw new Error('Invalid user ID provided');
    }
  }

  // 2. Validate data consistency
  if (data.status === 'completed' && !data.persona_profile) {
    throw new Error('Completed analysis must have persona_profile');
  }

  if (data.status === 'failed' && data.persona_profile) {
    logger.warn('Failed analysis should not have persona_profile', {
      userId: data.user_id,
      status: data.status
    });
    // Don't throw error, just log warning and clean up
    data.persona_profile = null;
  }

  if (data.status === 'failed' && !data.error_message) {
    throw new Error('Failed analysis must have error_message');
  }

  // 3. Sanitize assessment data
  if (data.assessment_data && typeof data.assessment_data === 'object') {
    // Remove any potentially sensitive fields
    const sanitizedData = { ...data.assessment_data };
    delete sanitizedData.password;
    delete sanitizedData.token;
    delete sanitizedData.secret;
    data.assessment_data = sanitizedData;
  }

  // 4. Validate persona profile structure if present
  if (data.persona_profile && typeof data.persona_profile === 'object') {
    const requiredFields = ['archetype', 'shortSummary', 'strengths', 'weaknesses', 'careerRecommendation'];
    const missingFields = requiredFields.filter(field => !data.persona_profile[field]);

    if (missingFields.length > 0) {
      throw new Error(`Persona profile missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate array fields
    if (!Array.isArray(data.persona_profile.strengths) || data.persona_profile.strengths.length < 3) {
      throw new Error('Persona profile must have at least 3 strengths');
    }

    if (!Array.isArray(data.persona_profile.weaknesses) || data.persona_profile.weaknesses.length < 3) {
      throw new Error('Persona profile must have at least 3 weaknesses');
    }

    if (!Array.isArray(data.persona_profile.careerRecommendation) || data.persona_profile.careerRecommendation.length < 3) {
      throw new Error('Persona profile must have at least 3 career recommendations');
    }
  }

  logger.debug('Business logic validation passed', {
    userId: data.user_id,
    status: data.status,
    hasPersonaProfile: !!data.persona_profile,
    hasAssessmentData: !!data.assessment_data
  });
};

/**
 * Validate business logic for update operations
 * @param {Object} updateData - Update data
 * @param {Object} existingResult - Existing result from database
 * @throws {Error} - If validation fails
 */
const validateUpdateBusinessLogic = async (updateData, existingResult) => {
  // 1. Prevent status regression (completed -> processing)
  if (updateData.status && existingResult.status === 'completed' && updateData.status === 'processing') {
    throw new Error('Cannot change status from completed back to processing');
  }

  // 2. Validate status transitions
  const validTransitions = {
    'processing': ['completed', 'failed'],
    'failed': ['processing'], // Allow retry
    'completed': ['failed'] // Allow marking as failed if issues found
  };

  if (updateData.status && existingResult.status !== updateData.status) {
    const allowedTransitions = validTransitions[existingResult.status] || [];
    if (!allowedTransitions.includes(updateData.status)) {
      throw new Error(`Invalid status transition from ${existingResult.status} to ${updateData.status}`);
    }
  }

  // 3. Validate data consistency for updates
  if (updateData.status === 'completed' && updateData.persona_profile === null) {
    throw new Error('Cannot mark as completed without persona_profile');
  }

  if (updateData.status === 'failed' && updateData.persona_profile && !updateData.error_message) {
    throw new Error('Failed status requires error_message');
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
      // Process batch using bulk insert
      const results = await this.bulkCreateResults(batch.map(item => item.data));

      // Resolve all promises with their respective results
      batch.forEach((item, index) => {
        item.resolve(results[index]);
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

      // BARU: Chunk large batches untuk memory efficiency
      const chunkSize = 50;
      const chunks = [];
      for (let i = 0; i < dataArray.length; i += chunkSize) {
        chunks.push(dataArray.slice(i, i + chunkSize));
      }

      const allResults = [];
      for (const chunk of chunks) {
        const results = await AnalysisResult.bulkCreate(chunk, {
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

      // If bulk insert fails, try individual inserts for better error handling
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
        // Still add a placeholder to maintain array indices
        results.push(null);
      }
    }

    if (errors.length > 0) {
      logger.warn('Some individual inserts failed', {
        totalCount: dataArray.length,
        successCount: results.filter(r => r !== null).length,
        errorCount: errors.length,
        errors: errors
      });
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
          await AnalysisResult.sequelize.query(`
            INSERT INTO auth.users (id, email, password_hash, token_balance)
            VALUES (:userId, :email, :passwordHash, :tokenBalance)
            ON CONFLICT (id) DO NOTHING
          `, {
            replacements: {
              userId: data.user_id,
              email: `dev-user-${data.user_id}@example.com`,
              passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.G',
              tokenBalance: 100
            }
          });

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
    // Business logic validation
    await validateBusinessLogic(data);

    logger.info('Creating new analysis result', {
      userId: data.user_id,
      status: data.status,
      dataKeys: Object.keys(data),
      assessmentDataType: typeof data.assessment_data,
      personaProfileType: typeof data.persona_profile,
      useBatching
    });

    // Use batch processing for better performance under high load
    if (useBatching && process.env.NODE_ENV !== 'test') {
      logger.debug('Using batch processing for result creation', {
        userId: data.user_id,
        queueSize: batchProcessor.queue.length
      });

      const result = await batchProcessor.addToBatch(data);

      logger.info('Analysis result queued for batch processing', {
        userId: data.user_id,
        resultId: result?.id
      });

      return result;
    }

    // Fallback to individual processing
    logger.debug('Using individual processing for result creation', {
      userId: data.user_id
    });

    const result = await batchProcessor.createSingleResult(data);

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

    const results = await batchProcessor.bulkCreateResults(dataArray);

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
    if (!isInternalService && userId && result.user_id !== userId) {
      throw new ForbiddenError('You do not have access to this analysis result');
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
 * @returns {Promise<Object>} - Updated result
 */
const updateResult = async (resultId, updateData, userId = null, isInternalService = false) => {
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
    await validateUpdateBusinessLogic(updateData, result);

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
  try {
    logger.info('Deleting analysis result', {
      resultId,
      userId
    });
    
    const result = await AnalysisResult.findByPk(resultId);
    
    if (!result) {
      throw new NotFoundError('Analysis result not found');
    }
    
    // Check access permissions
    if (result.user_id !== userId) {
      throw new ForbiddenError('You do not have access to this analysis result');
    }
    
    // Delete the result
    await result.destroy();
    
    logger.info('Analysis result deleted successfully', {
      resultId,
      userId
    });
  } catch (error) {
    logger.error('Failed to delete analysis result', {
      error: error.message,
      resultId,
      userId
    });
    throw error;
  }
};

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
  getBatchStats,
  forceBatchProcess,
  clearBatchQueue
};
