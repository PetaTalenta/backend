const { User } = require('../models');
const { Op } = require('sequelize');
const { hashPassword, comparePassword, validatePassword } = require('../utils/password');
const { generateToken, verifyToken } = require('../utils/jwt');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');
const userCacheService = require('./userCacheService');

// Import metrics recording function
let recordAuthOperation;
try {
  const { recordAuthOperation: recordMetrics } = require('../middleware/metricsMiddleware');
  recordAuthOperation = recordMetrics;
} catch (error) {
  // Graceful fallback if metrics middleware is not available
  recordAuthOperation = () => {};
}

/**
 * Register a single user with optimized database queries
 * @param {Object} userData - User registration data
 * @param {Object} options - Registration options
 * @returns {Promise<Object>} User and token
 */
const registerUser = async (userData, options = {}) => {
  const { username, email, password } = userData;
  const startTime = Date.now();

  try {
    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check for existing email/username to return specific errors
    const existing = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          { username }
        ]
      }
    });

    if (existing) {
      if (existing.email === email) {
        throw new Error('Email already exists');
      }
      if (existing.username === username) {
        throw new Error('Username already exists');
      }
      // Fallback
      throw new Error('User already exists');
    }

    // Hash password before database operation
    const password_hash = await hashPassword(password);

    // Create user
    const user = await User.create({
      username,
      email,
      password_hash,
      user_type: 'user',
      token_balance: parseInt(process.env.DEFAULT_TOKEN_BALANCE) || 5
    });

    // Generate JWT token
    const token = generateToken(user, 'user');

    // Cache the new user
    const userData = user.toJSON();
    userCacheService.setUser(userData);

    const duration = Date.now() - startTime;

    // Record metrics
    recordAuthOperation('register', duration, 'success');

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      tokenBalance: user.token_balance,
      duration,
      performance: duration < 100 ? 'optimal' : duration < 200 ? 'acceptable' : 'slow',
      cached: userCacheService.isAvailable()
    });

    return {
      user: userData,
      token
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    // Record metrics for failed operation
    recordAuthOperation('register', duration, 'failure');

    logger.error('User registration failed', {
      error: error.message,
      email,
      duration
    });
    throw error;
  }
};

/**
 * Register multiple users in batch (simplified version)
 * @param {Array} usersData - Array of user registration data
 * @returns {Promise<Array>} Array of registration results
 */
const registerUsersBatch = async (usersData) => {
  if (!Array.isArray(usersData) || usersData.length === 0) {
    throw new Error('Users data must be a non-empty array');
  }

  if (usersData.length > 50) {
    throw new Error('Batch size cannot exceed 50 users');
  }

  const results = [];
  const transaction = await User.sequelize.transaction();

  try {
    // Step 1: Validate all emails are unique in the batch
    const emails = usersData.map(u => u.email);
    const uniqueEmails = new Set(emails);
    
    if (emails.length !== uniqueEmails.size) {
      throw new Error('Duplicate emails found in batch');
    }

    // Step 2: Check for existing emails in database
    const existingUsers = await User.findAll({
      where: { email: emails },
      attributes: ['email'],
      transaction
    });

    const existingEmails = new Set(existingUsers.map(u => u.email));

    // Step 3: Process each user
    for (let i = 0; i < usersData.length; i++) {
      const userData = usersData[i];
      
      try {
        if (existingEmails.has(userData.email)) {
          results.push({
            success: false,
            error: 'Email already exists'
          });
          continue;
        }

        // Validate password
        const passwordValidation = validatePassword(userData.password);
        if (!passwordValidation.isValid) {
          results.push({
            success: false,
            error: `Password validation failed: ${passwordValidation.errors.join(', ')}`
          });
          continue;
        }

        // Hash password and create user
        const password_hash = await hashPassword(userData.password);
        const user = await User.create({
          email: userData.email,
          password_hash,
          user_type: 'user',
          token_balance: parseInt(process.env.DEFAULT_TOKEN_BALANCE) || 5
        }, { transaction });

        // Generate token
        const token = generateToken(user, 'user');

        results.push({
          success: true,
          data: {
            user: user.toJSON(),
            token
          }
        });

      } catch (error) {
        results.push({
          success: false,
          error: error.message
        });
      }
    }

    await transaction.commit();

    logger.info('Batch user registration completed', {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

    return results;

  } catch (error) {
    await transaction.rollback();
    logger.error('Batch user registration failed', {
      error: error.message,
      batchSize: usersData.length
    });
    throw error;
  }
};

/**
 * Login user with optimized performance
 * @param {Object} credentials - Login credentials
 * @returns {Promise<Object>} User and token
 */
const loginUser = async (credentials) => {
  const { email, username, password } = credentials;
  const startTime = Date.now();

  try {
    // For login, always fetch from database to ensure we have password_hash
    // Cache doesn't store password_hash for security reasons
    logger.info('Debug - Looking for user with identifier', { email, username });
    const user = await User.findOne({
      where: {
        [Op.and]: [
          { is_active: true },
          email ? { email } : {},
          !email && username ? { username } : {}
        ]
      }
    });

    logger.info('Debug - User found', { found: user ? 'YES' : 'NO' });
    if (user) {
      logger.info('Debug - User details', { id: user.id, email: user.email, user_type: user.user_type, is_active: user.is_active });
    }

    if (!user) {
      logger.info('Debug - No user found, throwing error');
      throw new Error('Invalid username or email');
    }

    // Compare password
    logger.info('Debug - About to compare password');
    logger.info('Debug - Password from request', { password });
    logger.info('Debug - Hash from DB', { hash: user.password_hash });
    const isPasswordValid = await comparePassword(password, user.password_hash);
    logger.info('Debug - Password comparison result', { isPasswordValid });
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    // Cache the user for future requests (without password_hash)
    userCacheService.setUser(user.toJSON());

    // Generate JWT token - use admin type for admin users
    const tokenType = user.user_type === 'admin' || user.user_type === 'superadmin' ? 'admin' : 'user';
    const token = generateToken(user, tokenType);

    // Update last login asynchronously (fire-and-forget) if enabled
    if (process.env.ASYNC_LAST_LOGIN === 'true') {
      // Don't await this - let it run in background
      user.update({ last_login: new Date() }).catch(error => {
        logger.warn('Async last_login update failed', {
          userId: user.id,
          error: error.message
        });
      });
    } else {
      // Synchronous update for backward compatibility
      await user.update({ last_login: new Date() });
    }

    const duration = Date.now() - startTime;

    // Record metrics
    recordAuthOperation('login', duration, 'success');

    logger.info('User login successful', {
      userId: user.id,
      email: user.email,
      duration,
      performance: duration < 80 ? 'optimal' : duration < 150 ? 'acceptable' : 'slow',
      asyncLastLogin: process.env.ASYNC_LAST_LOGIN === 'true'
    });

    return {
      user: user.toJSON(),
      token
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    // Record metrics for failed operation
    recordAuthOperation('login', duration, 'failure');

    logger.error('User login failed', {
      error: error.message,
      email,
      duration
    });
    throw error;
  }
};

/**
 * Change user password
 * @param {string} userId - User ID
 * @param {Object} passwordData - Password change data
 * @returns {Promise<Object>} Success result
 */
const changePassword = async (userId, passwordData) => {
  const { currentPassword, newPassword } = passwordData;

  try {
    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await user.update({ password_hash: newPasswordHash });

    logger.info('User password changed successfully', {
      userId: user.id,
      email: user.email
    });

    return {
      success: true,
      message: 'Password changed successfully'
    };
  } catch (error) {
    logger.error('User password change failed', {
      error: error.message,
      userId
    });
    throw error;
  }
};

/**
 * Verify user token with caching and performance monitoring
 * @param {string} token - JWT token
 * @returns {Promise<Object>} User data
 */
const verifyUserToken = async (token) => {
  const startTime = Date.now();

  try {
    // Verify token first (this is fast)
    const decoded = verifyToken(token);

    // Try to get user from cache first
    let user = userCacheService.getUserById(decoded.id);
    let cacheHit = !!user;

    if (!user) {
      // Cache miss - fetch from database
      user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password_hash'] }
      });

      // Cache the user for future requests
      if (user && user.is_active) {
        userCacheService.setUser(user.toJSON());
      }
    }

    if (!user || !user.is_active) {
      throw new Error('User not found or inactive');
    }

    const duration = Date.now() - startTime;

    // Record metrics
    recordAuthOperation('verify', duration, 'success');

    logger.debug('Token verification successful', {
      userId: user.id,
      duration,
      performance: duration < 20 ? 'optimal' : duration < 50 ? 'acceptable' : 'slow',
      cacheHit
    });

    return typeof user.toJSON === 'function' ? user.toJSON() : user;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Record metrics for failed operation
    recordAuthOperation('verify', duration, 'failure');

    logger.error('Token verification failed', {
      error: error.message,
      duration
    });
    throw error;
  }
};

module.exports = {
  registerUser,
  registerUsersBatch,
  loginUser,
  changePassword,
  verifyUserToken
};
