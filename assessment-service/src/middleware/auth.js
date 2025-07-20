const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { sendUnauthorized } = require('../utils/responseHelper');
const authService = require('../services/authService');

/**
 * JWT Authentication middleware
 * Verifies JWT token and extracts user information
 */
const authenticateToken = async(req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn('Authentication failed: No authorization header', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl
      });
      return sendUnauthorized(res, 'Authorization header required');
    }

    const token = authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      logger.warn('Authentication failed: No token provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl
      });
      return sendUnauthorized(res, 'Token required');
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user information from auth service
    const user = await authService.verifyUser(decoded.id, token);

    if (!user) {
      logger.warn('Authentication failed: User not found or token invalid', {
        userId: decoded.id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl
      });
      return sendUnauthorized(res, 'Invalid token or user not found');
    }

    // Attach user information to request
    req.user = {
      id: user.id,
      email: user.email,
      tokenBalance: user.token_balance
    };

    req.token = token;

    logger.debug('User authenticated successfully', {
      userId: user.id,
      email: user.email,
      tokenBalance: user.token_balance,
      url: req.originalUrl
    });

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.warn('Authentication failed: Invalid JWT token', {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl
      });
      return sendUnauthorized(res, 'Invalid token');
    }

    if (error.name === 'TokenExpiredError') {
      logger.warn('Authentication failed: JWT token expired', {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl
      });
      return sendUnauthorized(res, 'Token expired');
    }

    logger.error('Authentication error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl
    });

    return sendUnauthorized(res, 'Authentication failed');
  }
};

/**
 * Middleware to check if user has sufficient token balance
 * @param {Number} requiredTokens - Number of tokens required
 */
const requireTokenBalance = (requiredTokens = 1) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (req.user.tokenBalance < requiredTokens) {
      logger.warn('Insufficient token balance', {
        userId: req.user.id,
        email: req.user.email,
        currentBalance: req.user.tokenBalance,
        requiredTokens,
        url: req.originalUrl
      });

      return res.status(402).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_TOKENS',
          message: `Insufficient token balance. Required: ${requiredTokens}, Available: ${req.user.tokenBalance}`,
          details: {
            required: requiredTokens,
            available: req.user.tokenBalance
          }
        }
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireTokenBalance
};
