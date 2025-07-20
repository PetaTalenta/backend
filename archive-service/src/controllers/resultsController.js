/**
 * Results Controller
 * Handles HTTP requests for analysis results
 */

const resultsService = require('../services/resultsService');
const { formatPaginatedResponse } = require('../utils/pagination');
const logger = require('../utils/logger');

/**
 * Get analysis results for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getResults = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const options = {
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      assessment_name: req.query.assessment_name,
      sort: req.query.sort,
      order: req.query.order
    };
    
    const results = await resultsService.getResultsByUser(userId, options);
    
    // Format response
    const response = formatPaginatedResponse(
      results.results.map(result => ({
        id: result.id,
        user_id: result.user_id,
        persona_profile: result.persona_profile,
        status: result.status,
        assessment_name: result.assessment_name,
        created_at: result.created_at
      })),
      results.pagination
    );
    
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific analysis result by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getResultById = async (req, res, next) => {
  try {
    const resultId = req.params.id;
    const userId = req.user?.id;
    const isInternalService = req.isInternalService;
    
    const result = await resultsService.getResultById(resultId, userId, isInternalService);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new analysis result
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createResult = async (req, res, next) => {
  try {
    const options = {
      useBatching: req.query.batch !== 'false' // Default to true, can be disabled with ?batch=false
    };

    const result = await resultsService.createResult(req.body, options);

    res.status(201).json({
      success: true,
      message: 'Analysis result saved successfully',
      data: {
        id: result?.id,
        user_id: result?.user_id,
        status: result?.status,
        assessment_name: result?.assessment_name,
        created_at: result?.created_at,
        batched: options.useBatching
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create multiple analysis results in batch
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createResultsBatch = async (req, res, next) => {
  try {
    const { results: resultsData } = req.body;

    if (!Array.isArray(resultsData) || resultsData.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body must contain a non-empty array of results'
        }
      });
    }

    if (resultsData.length > 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Batch size cannot exceed 100 items'
        }
      });
    }

    const results = await resultsService.createResultsBatch(resultsData);
    const successCount = results.filter(r => r !== null).length;

    res.status(201).json({
      success: true,
      message: `Batch analysis results processed successfully`,
      data: {
        total: results.length,
        successful: successCount,
        failed: results.length - successCount,
        results: results.map((result, index) => ({
          index,
          success: result !== null,
          id: result?.id,
          user_id: result?.user_id,
          status: result?.status,
          assessment_name: result?.assessment_name,
          created_at: result?.created_at
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an analysis result
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updateResult = async (req, res, next) => {
  try {
    const resultId = req.params.id;
    const userId = req.user?.id;
    const isInternalService = req.isInternalService;
    
    const result = await resultsService.updateResult(
      resultId,
      req.body,
      userId,
      isInternalService
    );
    
    res.json({
      success: true,
      message: 'Analysis result updated successfully',
      data: {
        id: result.id,
        updated_at: result.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an analysis result
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const deleteResult = async (req, res, next) => {
  try {
    const resultId = req.params.id;
    const userId = req.user.id;
    
    await resultsService.deleteResult(resultId, userId);
    
    res.json({
      success: true,
      message: 'Analysis result deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get batch processing statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getBatchStats = async (req, res, next) => {
  try {
    const stats = resultsService.getBatchStats();

    res.json({
      success: true,
      data: {
        batch_processing: stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Force process current batch
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const forceBatchProcess = async (req, res, next) => {
  try {
    const statsBefore = resultsService.getBatchStats();
    await resultsService.forceBatchProcess();
    const statsAfter = resultsService.getBatchStats();

    res.json({
      success: true,
      message: 'Batch processing triggered successfully',
      data: {
        before: statsBefore,
        after: statsAfter,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear batch queue (emergency operation)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const clearBatchQueue = async (req, res, next) => {
  try {
    const clearedCount = resultsService.clearBatchQueue();

    res.json({
      success: true,
      message: 'Batch queue cleared successfully',
      data: {
        cleared_items: clearedCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getResults,
  getResultById,
  createResult,
  createResultsBatch,
  updateResult,
  deleteResult,
  getBatchStats,
  forceBatchProcess,
  clearBatchQueue
};
