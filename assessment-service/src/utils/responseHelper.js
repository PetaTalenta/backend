/**
 * Standard success response
 * @param {Object} res - Express response object
 * @param {String} message - Success message
 * @param {Object} data - Response data
 * @param {Number} statusCode - HTTP status code (default: 200)
 */
const sendSuccess = (res, message, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Standard error response
 * @param {Object} res - Express response object
 * @param {String} code - Error code
 * @param {String} message - Error message
 * @param {Object} details - Additional error details
 * @param {Number} statusCode - HTTP status code (default: 400)
 */
const sendError = (res, code, message, details = {}, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details
    }
  });
};

/**
 * Validation error response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Object} details - Validation error details
 */
const sendValidationError = (res, message, details = {}) => {
  return sendError(res, 'VALIDATION_ERROR', message, details, 400);
};

/**
 * Unauthorized error response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 */
const sendUnauthorized = (res, message = 'Authentication required') => {
  return sendError(res, 'UNAUTHORIZED', message, {}, 401);
};

/**
 * Forbidden error response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 */
const sendForbidden = (res, message = 'Access denied') => {
  return sendError(res, 'FORBIDDEN', message, {}, 403);
};

/**
 * Not found error response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 */
const sendNotFound = (res, message = 'Resource not found') => {
  return sendError(res, 'NOT_FOUND', message, {}, 404);
};

/**
 * Internal server error response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Object} details - Error details (not exposed in production)
 */
const sendInternalError = (res, message = 'Internal server error', details = {}) => {
  // In production, don't expose error details
  const sanitizedDetails = process.env.NODE_ENV === 'production' ? {} : details;
  return sendError(res, 'INTERNAL_ERROR', message, sanitizedDetails, 500);
};

module.exports = {
  sendSuccess,
  sendError,
  sendValidationError,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendInternalError
};
