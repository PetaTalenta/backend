const jwt = require('jsonwebtoken');
const logger = require('./logger');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  logger.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

/**
 * Generate JWT token for user or admin
 * @param {Object} user - User or Admin object
 * @param {string} type - Token type ('user' or 'admin')
 * @returns {string} JWT token
 */
const generateToken = (user, type = 'user') => {
  try {
    let payload;

    if (type === 'admin') {
      payload = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        type: 'admin'
      };
    } else {
      payload = {
        id: user.id,
        email: user.email,
        tokenBalance: user.token_balance,
        type: 'user'
      };
    }

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'atma-auth-service',
      audience: 'atma-services'
    });

    logger.debug('JWT token generated successfully', {
      userId: user.id,
      email: user.email,
      type,
      expiresIn: JWT_EXPIRES_IN
    });

    return token;
  } catch (error) {
    logger.error('Error generating JWT token', {
      error: error.message,
      userId: user.id,
      type
    });
    throw new Error('Token generation failed');
  }
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'atma-auth-service',
      audience: 'atma-services'
    });

    logger.debug('JWT token verified successfully', {
      userId: decoded.id,
      email: decoded.email
    });

    return decoded;
  } catch (error) {
    logger.warn('JWT token verification failed', {
      error: error.message,
      tokenType: error.name
    });

    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token format');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Token not active yet');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Decode JWT token without verification (for debugging)
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error('Error decoding JWT token', {
      error: error.message
    });
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken
};
