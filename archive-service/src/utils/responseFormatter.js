/**
 * Response Formatter Utilities for Archive Service
 * Provides consistent response formatting functions
 */

const { formatPaginatedResponse } = require('./pagination');

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

module.exports = {
  sendSuccess,
  sendPaginatedSuccess,
  sendError,
  sendNotFound,
  sendValidationError,
  formatResponse,
  formatErrorResponse,
  formatPaginatedResponse
};
