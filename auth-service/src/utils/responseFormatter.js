/**
 * Response Formatter Utilities for Auth Service
 * Provides consistent response formatting functions
 */

/**
 * Format standard success response
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
 * Format error response
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
 * Format validation error response
 * @param {String} message - Error message
 * @param {Object} details - Validation error details
 * @returns {Object} - Formatted validation error response
 */
const formatValidationErrorResponse = (message, details = {}) => {
  return formatErrorResponse('VALIDATION_ERROR', message, details);
};

/**
 * Format unauthorized error response
 * @param {String} message - Error message
 * @returns {Object} - Formatted unauthorized error response
 */
const formatUnauthorizedResponse = (message = 'Authentication required') => {
  return formatErrorResponse('UNAUTHORIZED', message);
};

/**
 * Format forbidden error response
 * @param {String} message - Error message
 * @returns {Object} - Formatted forbidden error response
 */
const formatForbiddenResponse = (message = 'Access denied') => {
  return formatErrorResponse('FORBIDDEN', message);
};

/**
 * Format not found error response
 * @param {String} message - Error message
 * @returns {Object} - Formatted not found error response
 */
const formatNotFoundResponse = (message = 'Resource not found') => {
  return formatErrorResponse('NOT_FOUND', message);
};

/**
 * Format internal server error response
 * @param {String} message - Error message
 * @param {Object} details - Error details (not exposed in production)
 * @returns {Object} - Formatted internal server error response
 */
const formatInternalErrorResponse = (message = 'Internal server error', details = {}) => {
  // In production, don't expose error details
  const sanitizedDetails = process.env.NODE_ENV === 'production' ? {} : details;
  return formatErrorResponse('INTERNAL_ERROR', message, sanitizedDetails);
};

module.exports = {
  formatResponse,
  formatErrorResponse,
  formatValidationErrorResponse,
  formatUnauthorizedResponse,
  formatForbiddenResponse,
  formatNotFoundResponse,
  formatInternalErrorResponse
};
