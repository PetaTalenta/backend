/**
 * Service Authentication Middleware
 * Validates internal service requests from analysis-worker
 */

const { serviceAuthConfig } = require('../config/auth');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate internal service requests
 * Checks X-Internal-Service and X-Service-Key headers
 */
const authenticateService = (req, res, next) => {
  const isInternalService = req.headers[serviceAuthConfig.internalServiceHeader.toLowerCase()];
  const serviceKey = req.headers[serviceAuthConfig.headerName.toLowerCase()];



  // Check if this is an internal service request
  if (isInternalService === 'true') {
    // Validate service key
    if (!serviceKey || serviceKey !== serviceAuthConfig.serviceKey) {
      logger.warn('Invalid service authentication', {
        hasServiceKey: !!serviceKey,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SERVICE_KEY',
          message: 'Invalid or missing service key'
        }
      });
    }
    
    // Mark request as internal service
    req.isInternalService = true;
    
    logger.info('Internal service request authenticated', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    
    return next();
  }
  
  // Not an internal service request, continue to regular auth
  req.isInternalService = false;
  next();
};

/**
 * Middleware to require internal service authentication
 * Use this for endpoints that should only be accessible by internal services
 */
const requireServiceAuth = (req, res, next) => {
  if (!req.isInternalService) {
    logger.warn('Unauthorized access to internal endpoint', {
      path: req.path,
      originalUrl: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      headers: req.headers
    });

    return res.status(403).json({
      success: false,
      error: {
        code: 'INTERNAL_ENDPOINT',
        message: 'This endpoint is only accessible by internal services'
      }
    });
  }

  next();
};

module.exports = {
  authenticateService,
  requireServiceAuth
};
