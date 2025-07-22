/**
 * Response Formatter Utilities for Archive Service
 * Provides consistent response formatting functions
 */

const { formatPaginatedResponse } = require('./pagination');

/**
 * Default field selections for different data types
 */
const DEFAULT_FIELD_SELECTIONS = {
  analysisResult: ['id', 'user_id', 'status', 'created_at', 'assessment_name'],
  analysisResultDetailed: ['id', 'user_id', 'persona_profile', 'status', 'created_at', 'updated_at', 'assessment_name'],
  userProfile: ['user_id', 'full_name', 'gender'],
  demographics: ['archetype', 'count', 'percentage'],
  stats: ['total', 'completed', 'failed', 'processing']
};

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {String} message - Success message
 * @param {*} data - Response data
 * @param {Number} statusCode - HTTP status code
 */
const sendSuccess = (res, message = 'Success', data = null, statusCode = 200) => {
  // Ensure response is only sent once
  if (res.headersSent) {
    console.warn('Attempted to send response after headers were already sent');
    return;
  }

  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send paginated success response
 * @param {Object} res - Express response object
 * @param {String} message - Success message
 * @param {Array} data - Response data array
 * @param {Object} pagination - Pagination info
 * @param {Number} statusCode - HTTP status code
 */
const sendPaginatedSuccess = (res, message = 'Success', data = [], pagination = {}, statusCode = 200) => {
  const response = {
    success: true,
    message,
    data,
    pagination,
    timestamp: new Date().toISOString()
  };

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {String} code - Error code
 * @param {String} message - Error message
 * @param {Object} details - Error details
 * @param {Number} statusCode - HTTP status code
 */
const sendError = (res, code = 'INTERNAL_ERROR', message = 'An error occurred', details = {}, statusCode = 500) => {
  // Ensure response is only sent once
  if (res.headersSent) {
    console.warn('Attempted to send error response after headers were already sent');
    return;
  }

  const response = {
    success: false,
    error: {
      code,
      message,
      timestamp: new Date().toISOString()
    }
  };

  if (Object.keys(details).length > 0) {
    response.error.details = details;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send not found response
 * @param {Object} res - Express response object
 * @param {String} message - Not found message
 */
const sendNotFound = (res, message = 'Resource not found') => {
  return sendError(res, 'NOT_FOUND', message, {}, 404);
};

/**
 * Send validation error response
 * @param {Object} res - Express response object
 * @param {Array|Object} errors - Validation errors
 */
const sendValidationError = (res, errors) => {
  return sendError(res, 'VALIDATION_ERROR', 'Validation failed', { errors }, 400);
};

/**
 * Format standard success response (legacy)
 * @param {Object} data - Response data
 * @param {String} message - Success message
 * @returns {Object} - Formatted response
 */
const formatResponse = (data, message = 'Success') => {
  return {
    success: true,
    message,
    data
  };
};

/**
 * Format error response (legacy)
 * @param {String} code - Error code
 * @param {String} message - Error message
 * @param {Object} details - Additional error details
 * @returns {Object} - Formatted error response
 */
const formatErrorResponse = (code, message, details = {}) => {
  return {
    success: false,
    error: {
      code,
      message,
      details
    }
  };
};

/**
 * Select specific fields from an object
 * @param {Object} obj - Source object
 * @param {Array} fields - Fields to select
 * @returns {Object} - Object with selected fields only
 */
const selectFields = (obj, fields) => {
  if (!obj || !fields || !Array.isArray(fields)) {
    return obj;
  }

  const result = {};
  fields.forEach(field => {
    if (field.includes('.')) {
      // Handle nested fields like 'persona_profile.archetype'
      const parts = field.split('.');
      let source = obj;
      let target = result;

      for (let i = 0; i < parts.length - 1; i++) {
        if (source[parts[i]] === undefined) break;
        if (!target[parts[i]]) target[parts[i]] = {};
        source = source[parts[i]];
        target = target[parts[i]];
      }

      if (source && source[parts[parts.length - 1]] !== undefined) {
        target[parts[parts.length - 1]] = source[parts[parts.length - 1]];
      }
    } else {
      // Handle simple fields
      if (obj[field] !== undefined) {
        result[field] = obj[field];
      }
    }
  });

  return result;
};

/**
 * Optimize response data by selecting specific fields
 * @param {*} data - Response data (object, array, or primitive)
 * @param {String} type - Data type for field selection
 * @param {Array} customFields - Custom field selection (overrides default)
 * @returns {*} - Optimized data
 */
const optimizeResponseData = (data, type = null, customFields = null) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const fields = customFields || DEFAULT_FIELD_SELECTIONS[type];

  if (!fields) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => selectFields(item, fields));
  }

  return selectFields(data, fields);
};

/**
 * Send optimized success response with field selection
 * @param {Object} res - Express response object
 * @param {String} message - Success message
 * @param {*} data - Response data
 * @param {Object} options - Optimization options
 * @param {Number} statusCode - HTTP status code
 */
const sendOptimizedSuccess = (res, message = 'Success', data = null, options = {}, statusCode = 200) => {
  const { type, fields, includeMetadata = true } = options;

  // Ensure response is only sent once
  if (res.headersSent) {
    console.warn('Attempted to send response after headers were already sent');
    return;
  }

  const response = {
    success: true,
    message
  };

  if (includeMetadata) {
    response.timestamp = new Date().toISOString();
  }

  if (data !== null) {
    response.data = optimizeResponseData(data, type, fields);
  }

  return res.status(statusCode).json(response);
};

/**
 * Send optimized paginated response
 * @param {Object} res - Express response object
 * @param {String} message - Success message
 * @param {Array} data - Response data array
 * @param {Object} pagination - Pagination info
 * @param {Object} options - Optimization options
 * @param {Number} statusCode - HTTP status code
 */
const sendOptimizedPaginatedSuccess = (res, message = 'Success', data = [], pagination = {}, options = {}, statusCode = 200) => {
  const { type, fields, includeMetadata = true } = options;

  const response = {
    success: true,
    message,
    data: optimizeResponseData(data, type, fields),
    pagination
  };

  if (includeMetadata) {
    response.timestamp = new Date().toISOString();
  }

  return res.status(statusCode).json(response);
};

/**
 * Parse field selection from query parameters
 * @param {Object} query - Express query object
 * @returns {Array|null} - Array of fields or null
 */
const parseFieldSelection = (query) => {
  if (!query.fields) {
    return null;
  }

  if (typeof query.fields === 'string') {
    return query.fields.split(',').map(field => field.trim());
  }

  if (Array.isArray(query.fields)) {
    return query.fields;
  }

  return null;
};

module.exports = {
  sendSuccess,
  sendPaginatedSuccess,
  sendError,
  sendNotFound,
  sendValidationError,
  formatResponse,
  formatErrorResponse,
  formatPaginatedResponse,
  // New optimization functions
  selectFields,
  optimizeResponseData,
  sendOptimizedSuccess,
  sendOptimizedPaginatedSuccess,
  parseFieldSelection,
  DEFAULT_FIELD_SELECTIONS
};
