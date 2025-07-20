/**
 * Error Handler Middleware
 */

const logger = require('../utils/logger');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  // Default error response
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let errorMessage = 'An unexpected error occurred';
  
  // Handle specific error types
  if (err.name === 'ValidationError' || err.name === 'JoiValidationError') {
    // Joi validation error
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    errorMessage = err.details ? err.details[0].message : err.message;
  } else if (err.name === 'SequelizeValidationError') {
    // Sequelize validation error
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    errorMessage = err.errors[0].message;
  } else if (err.name === 'SequelizeDatabaseError') {
    // Database error
    statusCode = 500;
    errorCode = 'DATABASE_ERROR';
    errorMessage = 'A database error occurred';
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    // Unique constraint error
    statusCode = 409;
    errorCode = 'DUPLICATE_ENTRY';
    errorMessage = 'A record with this data already exists';
  } else if (err.name === 'NotFoundError') {
    // Not found error
    statusCode = 404;
    errorCode = 'RESULT_NOT_FOUND';
    errorMessage = err.message || 'Analysis result not found or access denied';
  } else if (err.name === 'UnauthorizedError') {
    // Unauthorized error
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    errorMessage = 'Invalid or expired token';
  } else if (err.name === 'ForbiddenError') {
    // Forbidden error
    statusCode = 403;
    errorCode = 'ACCESS_DENIED';
    errorMessage = err.message || 'You do not have access to this resource';
  }
  
  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: errorMessage
    }
  });
};

/**
 * Not found handler middleware
 */
const notFoundHandler = (req, res) => {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    }
  });
};

/**
 * Custom error classes
 */

class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  NotFoundError,
  ForbiddenError
};
