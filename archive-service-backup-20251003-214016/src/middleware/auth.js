/**
 * Authentication Middleware
 * Validates JWT tokens from API Gateway
 */

const { expressjwt: jwt } = require('express-jwt');
const { jwtConfig } = require('../config/auth');
const logger = require('../utils/logger');

/**
 * JWT authentication middleware
 * Validates JWT tokens from API Gateway
 */
const authenticateToken = jwt({
  secret: jwtConfig.secret,
  algorithms: jwtConfig.algorithms,
  credentialsRequired: jwtConfig.credentialsRequired,
  requestProperty: jwtConfig.requestProperty,
  getToken: (req) => {
    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
      return req.headers.authorization.split(' ')[1];
    }
    
    // Check X-User-ID header (from API Gateway)
    if (req.headers['x-user-id']) {
      // Create a minimal user object from headers
      req.user = {
        id: req.headers['x-user-id'],
        email: req.headers['x-user-email'] || 'unknown'
      };
      
      // Return null to skip JWT validation
      return null;
    }
    
    return null;
  }
});

/**
 * Error handler for JWT authentication
 */
const handleAuthError = (err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    logger.warn('Authentication failed', {
      error: err.message,
      path: req.path,
      ip: req.ip
    });
    
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token'
      }
    });
  }
  
  next(err);
};

/**
 * Middleware to check if user has access to a resource
 * @param {String} resourceUserId - User ID of the resource owner
 * @returns {Function} - Express middleware
 */
const checkUserAccess = (resourceUserId) => (req, res, next) => {
  // Skip check for internal services
  if (req.isInternalService) {
    return next();
  }
  
  const userId = req.user.id;
  
  if (userId !== resourceUserId) {
    logger.warn('Access denied', {
      userId,
      resourceUserId,
      path: req.path,
      ip: req.ip
    });
    
    return res.status(403).json({
      success: false,
      error: {
        code: 'ACCESS_DENIED',
        message: 'You do not have access to this resource'
      }
    });
  }
  
  next();
};

module.exports = {
  authenticateToken,
  handleAuthError,
  checkUserAccess
};
