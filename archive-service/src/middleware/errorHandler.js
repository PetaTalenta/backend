/**
 * Error Handler Middleware
 */

const logger = require('../utils/logger');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error with comprehensive context
  logger.error('Error occurred', {
    // Error details
    error: err.message,
    errorName: err.name,
    stack: err.stack,

    // Request context
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    referer: req.get('referer'),
    requestId: req.requestId,

    // Query and params
    query: req.query,
    params: req.params,

    // Additional context
    timestamp: new Date().toISOString(),
    hasBody: req.body && Object.keys(req.body).length > 0,
    contentType: req.get('content-type')
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
  // Collect comprehensive request information for debugging
  const requestInfo = {
    // Basic request info
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    url: req.url,

    // Network info
    ip: req.ip,
    protocol: req.protocol,
    hostname: req.hostname,

    // Query and params
    query: req.query,
    params: req.params,

    // Headers (selective for security)
    headers: {
      'user-agent': req.get('user-agent'),
      'referer': req.get('referer'),
      'accept': req.get('accept'),
      'content-type': req.get('content-type'),
      'authorization': req.get('authorization') ? '[PRESENT]' : '[NOT_PRESENT]',
      'x-forwarded-for': req.get('x-forwarded-for'),
      'x-real-ip': req.get('x-real-ip')
    },

    // Request context
    requestId: req.requestId,
    timestamp: new Date().toISOString(),

    // Body info (for non-GET requests, but don't log sensitive data)
    hasBody: req.body && Object.keys(req.body).length > 0,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    contentLength: req.get('content-length')
  };

  // Log with comprehensive information
  logger.warn('Route not found - Detailed request information', requestInfo);

  // Also log a simpler version for quick scanning
  logger.warn(`404 - ${req.method} ${req.originalUrl} from ${req.ip}`, {
    userAgent: req.get('user-agent'),
    referer: req.get('referer')
  });

  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      requestId: req.requestId,
      timestamp: new Date().toISOString()
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
