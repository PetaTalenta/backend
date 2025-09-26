const { verifyToken } = require('../utils/jwt');
const { User } = require('../models');
const logger = require('../utils/logger');

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
    const decoded = verifyToken(token);

    // Get user information
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user || !user.is_active) {
      logger.warn('Authentication failed: User not found or inactive', {
        userId: decoded.id,
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

    // Attach user information to request
    req.user = user;
    req.token = token;

    logger.debug('User authenticated successfully', {
      userId: user.id,
      email: user.email,
      userType: user.user_type,
      url: req.originalUrl
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl
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
    } else if (error.message === 'User not found') {
      errorCode = 'USER_NOT_FOUND';
      errorMessage = 'User not found';
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
        url: req.originalUrl
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
        url: req.originalUrl
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
      url: req.originalUrl
    });

    next();
  } catch (error) {
    logger.error('Internal service authentication error', {
      error: error.message,
      ip: req.ip,
      url: req.originalUrl
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



module.exports = {
  authenticateToken,
  authenticateInternalService
};
