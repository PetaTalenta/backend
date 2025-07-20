const bcrypt = require('bcryptjs');
const logger = require('./logger');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  try {
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    logger.debug('Password hashed successfully');
    return hash;
  } catch (error) {
    logger.error('Error hashing password', {
      error: error.message
    });
    throw new Error('Password hashing failed');
  }
};

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
const comparePassword = async (password, hash) => {
  try {
    const isMatch = await bcrypt.compare(password, hash);
    logger.debug('Password comparison completed', {
      isMatch
    });
    return isMatch;
  } catch (error) {
    logger.error('Error comparing password', {
      error: error.message
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
