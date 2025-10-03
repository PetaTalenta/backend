/**
 * Validation Middleware
 * Validates request data using Joi schemas
 */

const logger = require('../utils/logger');

/**
 * Create validation middleware for request body
 * @param {Object} schema - Joi validation schema
 * @returns {Function} - Express middleware
 */
const validateBody = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    logger.warn('Request body validation failed', {
      error: error.details.map(detail => detail.message),
      path: req.path,
      method: req.method
    });
    
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.details[0].message,
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      }
    });
  }
  
  // Replace request body with validated and sanitized data
  req.body = value;
  next();
};

/**
 * Create validation middleware for query parameters
 * @param {Object} schema - Joi validation schema
 * @returns {Function} - Express middleware
 */
const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    logger.warn('Query parameters validation failed', {
      error: error.details.map(detail => detail.message),
      path: req.path,
      method: req.method
    });
    
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.details[0].message,
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      }
    });
  }
  
  // Replace query parameters with validated and sanitized data
  req.query = value;
  next();
};

/**
 * Create validation middleware for URL parameters
 * @param {Object} schema - Joi validation schema
 * @returns {Function} - Express middleware
 */
const validateParams = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.params, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    logger.warn('URL parameters validation failed', {
      error: error.details.map(detail => detail.message),
      path: req.path,
      method: req.method
    });
    
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.details[0].message,
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      }
    });
  }
  
  // Replace URL parameters with validated and sanitized data
  req.params = value;
  next();
};

module.exports = {
  validateBody,
  validateQuery,
  validateParams
};
