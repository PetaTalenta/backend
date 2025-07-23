const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token format');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Middleware to authenticate JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      logger.warn('Authentication failed: No token provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        requestId: req.id
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
    const decoded = verifyToken(token);

    // For chatbot service, we'll make a request to auth service to validate user
    // For now, we'll use a simplified approach and trust the JWT payload
    if (!decoded.id) {
      logger.warn('Authentication failed: Invalid token payload', {
        ip: req.ip,
        requestId: req.id
      });
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid token payload'
        }
      });
    }

    // Attach user information to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      user_type: decoded.user_type || 'user'
    };
    req.token = token;

    logger.debug('User authenticated successfully', {
      userId: req.user.id,
      email: req.user.email,
      userType: req.user.user_type,
      url: req.originalUrl,
      requestId: req.id
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      requestId: req.id
    });

    let statusCode = 401;
    let errorCode = 'UNAUTHORIZED';
    let errorMessage = 'Invalid or expired token';

    if (error.message === 'Token has expired') {
      errorCode = 'TOKEN_EXPIRED';
      errorMessage = 'Token has expired';
    } else if (error.message === 'Invalid token format') {
      errorCode = 'INVALID_TOKEN';
      errorMessage = 'Invalid token format';
    }

    return res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage
      }
    });
  }
};

/**
 * Middleware to authenticate internal service requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateInternalService = (req, res, next) => {
  try {
    const internalServiceHeader = req.headers['x-internal-service'];
    const serviceKey = req.headers['x-service-key'];

    if (!internalServiceHeader || internalServiceHeader !== 'true') {
      logger.warn('Internal service authentication failed: Missing internal service header', {
        ip: req.ip,
        url: req.originalUrl,
        requestId: req.id
      });
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Internal service access required'
        }
      });
    }

    if (!serviceKey || serviceKey !== process.env.INTERNAL_SERVICE_KEY) {
      logger.warn('Internal service authentication failed: Invalid service key', {
        ip: req.ip,
        url: req.originalUrl,
        requestId: req.id
      });
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid service key'
        }
      });
    }

    logger.debug('Internal service authenticated successfully', {
      ip: req.ip,
      url: req.originalUrl,
      requestId: req.id
    });

    next();
  } catch (error) {
    logger.error('Internal service authentication error', {
      error: error.message,
      ip: req.ip,
      url: req.originalUrl,
      requestId: req.id
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal service authentication failed'
      }
    });
  }
};

/**
 * Middleware to set user context for RLS
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const setUserContext = async (req, res, next) => {
  if (req.user && req.user.id) {
    try {
      const { sequelize } = require('../models');
      await sequelize.query(`SET app.current_user_id = '${req.user.id}'`);
      logger.debug('User context set for RLS', {
        userId: req.user.id,
        requestId: req.id
      });
    } catch (error) {
      logger.warn('Failed to set user context for RLS', {
        error: error.message,
        userId: req.user.id,
        requestId: req.id
      });
    }
  }
  next();
};

module.exports = {
  authenticateToken,
  authenticateInternalService,
  setUserContext,
  verifyToken
};
