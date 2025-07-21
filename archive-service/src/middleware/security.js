/**
 * Security Middleware
 * Additional security validations and protections
 */

const logger = require('../utils/logger');

/**
 * Sanitize request data to prevent injection attacks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const sanitizeRequest = (req, res, next) => {
  try {
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize params
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    logger.error('Request sanitization failed', {
      error: error.message,
      path: req.path,
      method: req.method
    });
    
    return res.status(400).json({
      success: false,
      error: {
        code: 'SANITIZATION_ERROR',
        message: 'Invalid request data format'
      }
    });
  }
};

/**
 * Sanitize object recursively
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 */
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Skip dangerous prototype properties
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }

      // Sanitize key
      const cleanKey = sanitizeString(key);
      
      // Recursively sanitize value
      if (typeof value === 'string') {
        sanitized[cleanKey] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[cleanKey] = sanitizeObject(value);
      } else {
        sanitized[cleanKey] = value;
      }
    }
    
    return sanitized;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  return obj;
};

/**
 * Sanitize string to prevent injection attacks
 * @param {String} str - String to sanitize
 * @returns {String} - Sanitized string
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') {
    return str;
  }

  // Remove null bytes
  let sanitized = str.replace(/\0/g, '');
  
  // Remove potential script tags (basic protection)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove potential SQL injection patterns (basic protection)
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    /(--|\/\*|\*\/|;)/g
  ];
  
  sqlPatterns.forEach(pattern => {
    if (pattern.test(sanitized)) {
      logger.warn('Potential SQL injection attempt detected', {
        originalString: str,
        pattern: pattern.toString()
      });
      // Don't completely remove, just log for monitoring
    }
  });

  return sanitized;
};

/**
 * Validate request size to prevent DoS attacks
 * @param {Object} options - Configuration options
 * @returns {Function} - Express middleware
 */
const validateRequestSize = (options = {}) => {
  const {
    maxBodySize = 10 * 1024 * 1024, // 10MB default
    maxQueryParams = 50,
    maxQueryStringLength = 2048
  } = options;

  return (req, res, next) => {
    try {
      // Check query string length
      if (req.url.length > maxQueryStringLength) {
        logger.warn('Request URL too long', {
          length: req.url.length,
          maxLength: maxQueryStringLength,
          path: req.path
        });
        
        return res.status(414).json({
          success: false,
          error: {
            code: 'REQUEST_TOO_LARGE',
            message: 'Request URL too long'
          }
        });
      }

      // Check number of query parameters
      if (req.query && Object.keys(req.query).length > maxQueryParams) {
        logger.warn('Too many query parameters', {
          count: Object.keys(req.query).length,
          maxCount: maxQueryParams,
          path: req.path
        });
        
        return res.status(400).json({
          success: false,
          error: {
            code: 'TOO_MANY_PARAMETERS',
            message: 'Too many query parameters'
          }
        });
      }

      // Check body size (if body exists)
      if (req.body && req.get('content-length')) {
        const contentLength = parseInt(req.get('content-length'));
        if (contentLength > maxBodySize) {
          logger.warn('Request body too large', {
            size: contentLength,
            maxSize: maxBodySize,
            path: req.path
          });
          
          return res.status(413).json({
            success: false,
            error: {
              code: 'REQUEST_TOO_LARGE',
              message: 'Request body too large'
            }
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Request size validation failed', {
        error: error.message,
        path: req.path
      });
      next(error);
    }
  };
};

/**
 * Add security headers to response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const addSecurityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy (basic)
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  
  next();
};

module.exports = {
  sanitizeRequest,
  validateRequestSize,
  addSecurityHeaders,
  sanitizeObject,
  sanitizeString
};
