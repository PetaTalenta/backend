const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate admin JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      logger.warn('Admin authentication failed: No token provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl
      });
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is required'
        }
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token is for admin
    if (decoded.type !== 'admin') {
      logger.warn('Admin authentication failed: Invalid token type', {
        tokenType: decoded.type,
        ip: req.ip,
        url: req.originalUrl
      });
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Admin access required'
        }
      });
    }

    // Attach admin information to request
    req.admin = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };

    req.token = token;

    logger.debug('Admin authenticated successfully', {
      adminId: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
      url: req.originalUrl
    });

    next();
  } catch (error) {
    logger.warn('Admin authentication failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl
    });

    let errorMessage = 'Invalid token';
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token has expired';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid token format';
    }

    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: errorMessage
      }
    });
  }
};

/**
 * Middleware to check if admin has specific role
 * @param {string|Array} allowedRoles - Allowed roles
 * @returns {Function} Middleware function
 */
const requireAdminRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Admin authentication required'
        }
      });
    }

    if (!roles.includes(req.admin.role)) {
      logger.warn('Admin authorization failed: Insufficient role', {
        adminId: req.admin.id,
        username: req.admin.username,
        currentRole: req.admin.role,
        requiredRoles: roles,
        url: req.originalUrl
      });
      
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
    }

    next();
  };
};

module.exports = {
  authenticateAdmin,
  requireAdminRole
};
