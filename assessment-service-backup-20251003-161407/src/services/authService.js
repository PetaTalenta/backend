const axios = require('axios');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const REQUEST_TIMEOUT = 10000; // 10 seconds

// Create axios instance with default configuration
const authClient = axios.create({
  baseURL: AUTH_SERVICE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Verify user and get user information from auth service
 * @param {String} userId - User ID from JWT token
 * @param {String} token - JWT token
 * @returns {Promise<Object|null>} - User object or null if not found
 */
const verifyUser = async(userId, token) => {
  try {
    const response = await authClient.get('/auth/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.data.success && response.data.data.user) {
      const user = response.data.data.user;

      logger.debug('User verification successful', {
        userId: user.id,
        email: user.email,
        tokenBalance: user.token_balance
      });

      return user;
    }

    logger.warn('User verification failed: Invalid response format', {
      userId,
      responseData: response.data
    });

    return null;
  } catch (error) {
    if (error.response) {
      // Auth service responded with error
      logger.warn('User verification failed: Auth service error', {
        userId,
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });

      if (error.response.status === 401) {
        return null; // Invalid token
      }
    } else if (error.request) {
      // Auth service not reachable
      logger.error('User verification failed: Auth service unreachable', {
        userId,
        error: error.message,
        url: AUTH_SERVICE_URL
      });

      throw new AppError('AUTH_SERVICE_UNAVAILABLE', 'Authentication service is temporarily unavailable', 503);
    } else {
      // Other error
      logger.error('User verification failed: Unexpected error', {
        userId,
        error: error.message
      });
    }

    return null;
  }
};

/**
 * Deduct tokens from user balance
 * @param {String} userId - User ID
 * @param {String} token - JWT token
 * @param {Number} tokenAmount - Number of tokens to deduct
 * @returns {Promise<Object>} - Updated user object
 */
const deductTokens = async(userId, token, tokenAmount = 1) => {
  try {
    const response = await authClient.put('/auth/token-balance', {
      userId: userId,
      amount: tokenAmount,
      operation: 'subtract'
    }, {
      headers: {
        'X-Internal-Service': 'true',
        'X-Service-Key': process.env.INTERNAL_SERVICE_KEY || 'internal_service_secret_key_change_in_production'
      }
    });

    if (response.data.success && response.data.data) {
      // Get updated user info after token deduction
      const userResponse = await verifyUser(userId, token);

      logger.info('Token deduction successful', {
        userId: userId,
        deductedAmount: tokenAmount,
        remainingBalance: userResponse.token_balance
      });

      return userResponse;
    }

    logger.error('Token deduction failed: Invalid response format', {
      userId,
      tokenAmount,
      responseData: response.data
    });

    throw new AppError('TOKEN_DEDUCTION_FAILED', 'Failed to deduct tokens', 500);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      logger.error('Token deduction failed: Auth service error', {
        userId,
        tokenAmount,
        status,
        statusText: error.response.statusText,
        data
      });

      if (status === 400 && data.error?.code === 'INSUFFICIENT_TOKENS') {
        throw new AppError('INSUFFICIENT_TOKENS', data.error.message, 402, data.error.details);
      }

      if (status === 401) {
        throw new AppError('UNAUTHORIZED', 'Invalid or expired token', 401);
      }

      throw new AppError('TOKEN_DEDUCTION_FAILED', 'Failed to deduct tokens', 500);
    } else if (error.request) {
      logger.error('Token deduction failed: Auth service unreachable', {
        userId,
        tokenAmount,
        error: error.message,
        url: AUTH_SERVICE_URL
      });

      throw new AppError('AUTH_SERVICE_UNAVAILABLE', 'Authentication service is temporarily unavailable', 503);
    } else {
      logger.error('Token deduction failed: Unexpected error', {
        userId,
        tokenAmount,
        error: error.message
      });

      throw new AppError('TOKEN_DEDUCTION_FAILED', 'Failed to deduct tokens', 500);
    }
  }
};

/**
 * Refund tokens to user balance (for failed AI analysis)
 * @param {String} userId - User ID
 * @param {String} token - JWT token
 * @param {Number} tokenAmount - Number of tokens to refund
 * @returns {Promise<Object>} - Updated user object
 */
const refundTokens = async(userId, token, tokenAmount = 1) => {
  try {
    const response = await authClient.put('/auth/token-balance', {
      userId: userId,
      amount: tokenAmount,
      operation: 'add'
    }, {
      headers: {
        'X-Internal-Service': 'true',
        'X-Service-Key': process.env.INTERNAL_SERVICE_KEY || 'internal_service_secret_key_change_in_production'
      }
    });

    if (response.data.success && response.data.data) {
      logger.info('Token refund successful', {
        userId: userId,
        refundedAmount: tokenAmount,
        newBalance: response.data.data.new_balance
      });

      // Return a simplified user object since we don't have a valid token
      return {
        id: userId,
        token_balance: response.data.data.new_balance
      };
    }

    logger.error('Token refund failed: Invalid response format', {
      userId,
      tokenAmount,
      responseData: response.data
    });

    throw new AppError('TOKEN_REFUND_FAILED', 'Failed to refund tokens', 500);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      logger.error('Token refund failed: Auth service error', {
        userId,
        tokenAmount,
        status,
        statusText: error.response.statusText,
        data
      });

      if (status === 401) {
        throw new AppError('UNAUTHORIZED', 'Invalid or expired token', 401);
      }

      throw new AppError('TOKEN_REFUND_FAILED', 'Failed to refund tokens', 500);
    } else if (error.request) {
      logger.error('Token refund failed: Auth service unreachable', {
        userId,
        tokenAmount,
        error: error.message,
        url: AUTH_SERVICE_URL
      });

      throw new AppError('AUTH_SERVICE_UNAVAILABLE', 'Authentication service is temporarily unavailable', 503);
    } else {
      logger.error('Token refund failed: Unexpected error', {
        userId,
        tokenAmount,
        error: error.message
      });

      throw new AppError('TOKEN_REFUND_FAILED', 'Failed to refund tokens', 500);
    }
  }
};

/**
 * Check auth service health
 * @returns {Promise<boolean>} - Health status
 */
const checkHealth = async() => {
  try {
    const response = await authClient.get('/health', {
      timeout: 5000
    });

    return response.status === 200;
  } catch (error) {
    logger.error('Auth service health check failed', {
      error: error.message,
      url: AUTH_SERVICE_URL
    });

    return false;
  }
};

module.exports = {
  verifyUser,
  deductTokens,
  refundTokens,
  checkHealth
};
