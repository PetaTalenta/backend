const logger = require('../utils/logger');
const { sendInternalError } = require('../utils/responseHelper');

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, _next) => {
  // Log the error
  logger.error('Unhandled error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.details || {}
      }
    });
  }

  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication failed',
        details: {}
      }
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid token',
        details: {}
      }
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token expired',
        details: {}
      }
    });
  }

  // Handle custom application errors
  if (err.code) {
    return res.status(err.statusCode || 400).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details || {}
      }
    });
  }

  // Default to internal server error
  return sendInternalError(res, 'An unexpected error occurred', {
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
  constructor(code, message, statusCode = 400, details = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = {
  errorHandler,
  AppError
};
