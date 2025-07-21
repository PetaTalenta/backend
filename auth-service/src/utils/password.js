const bcrypt = require('bcrypt');
const logger = require('./logger');

// Import metrics recording function
let recordPasswordHashing;
try {
  const { recordPasswordHashing: recordMetrics } = require('../middleware/metricsMiddleware');
  recordPasswordHashing = recordMetrics;
} catch (error) {
  // Graceful fallback if metrics middleware is not available
  recordPasswordHashing = () => {};
}

// Use environment-based configuration with performance optimization
const BCRYPT_ROUNDS = process.env.NODE_ENV === 'test'
  ? 4  // Very fast for testing
  : process.env.NODE_ENV === 'production'
    ? parseInt(process.env.BCRYPT_ROUNDS) || 10  // Optimized for production
    : parseInt(process.env.BCRYPT_ROUNDS) || 8;  // Balanced for development

/**
 * Hash password using bcrypt with performance monitoring
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  const startTime = Date.now();

  try {
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const duration = Date.now() - startTime;

    // Record metrics
    recordPasswordHashing(duration);

    logger.debug('Password hashed successfully', {
      duration,
      rounds: BCRYPT_ROUNDS,
      performance: duration < 100 ? 'optimal' : duration < 200 ? 'acceptable' : 'slow'
    });

    // Log performance warning if hashing takes too long
    if (duration > 200) {
      logger.warn('Password hashing performance warning', {
        duration,
        rounds: BCRYPT_ROUNDS,
        suggestion: 'Consider reducing BCRYPT_ROUNDS for production'
      });
    }

    return hash;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error hashing password', {
      error: error.message,
      duration,
      rounds: BCRYPT_ROUNDS
    });
    throw new Error('Password hashing failed');
  }
};

/**
 * Compare password with hash with performance monitoring
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
const comparePassword = async (password, hash) => {
  const startTime = Date.now();

  try {
    const isMatch = await bcrypt.compare(password, hash);
    const duration = Date.now() - startTime;

    logger.debug('Password comparison completed', {
      isMatch,
      duration,
      performance: duration < 50 ? 'optimal' : duration < 100 ? 'acceptable' : 'slow'
    });

    // Log performance warning if comparison takes too long
    if (duration > 100) {
      logger.warn('Password comparison performance warning', {
        duration,
        suggestion: 'Consider optimizing bcrypt configuration'
      });
    }

    return isMatch;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error comparing password', {
      error: error.message,
      duration
    });
    throw new Error('Password comparison failed');
  }
};

/**
 * Validate password strength
 * @param {string} password - Plain text password
 * @returns {Object} Validation result
 */
const validatePassword = (password) => {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[a-zA-Z]/.test(password)) {
    errors.push('Password must contain at least one letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Optional: Check for special characters
  // if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
  //   errors.push('Password must contain at least one special character');
  // }

  const isValid = errors.length === 0;
  
  logger.debug('Password validation completed', {
    isValid,
    errorCount: errors.length
  });

  return {
    isValid,
    errors
  };
};

module.exports = {
  hashPassword,
  comparePassword,
  validatePassword
};
