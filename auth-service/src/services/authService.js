const { User } = require('../models');
const { hashPassword, comparePassword, validatePassword } = require('../utils/password');
const { generateToken, verifyToken } = require('../utils/jwt');
const logger = require('../utils/logger');

/**
 * Register a single user
 * @param {Object} userData - User registration data
 * @param {Object} options - Registration options
 * @returns {Promise<Object>} User and token
 */
const registerUser = async (userData, options = {}) => {
  const { email, password } = userData;

  try {
    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: { email }
    });

    if (existingUser) {
      throw new Error('Email already exists');
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const user = await User.create({
      email,
      password_hash,
      user_type: 'user',
      token_balance: parseInt(process.env.DEFAULT_TOKEN_BALANCE) || 5
    });

    // Generate JWT token
    const token = generateToken(user, 'user');

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      tokenBalance: user.token_balance
    });

    return {
      user: user.toJSON(),
      token
    };
  } catch (error) {
    logger.error('User registration failed', {
      error: error.message,
      email
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
 * Login user
 * @param {Object} credentials - Login credentials
 * @returns {Promise<Object>} User and token
 */
const loginUser = async (credentials) => {
  const { email, password } = credentials;

  try {
    // Find user by email
    const user = await User.findOne({
      where: { 
        email,
        user_type: 'user',
        is_active: true
      }
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await user.update({ last_login: new Date() });

    // Generate JWT token
    const token = generateToken(user, 'user');

    logger.info('User login successful', {
      userId: user.id,
      email: user.email
    });

    return {
      user: user.toJSON(),
      token
    };
  } catch (error) {
    logger.error('User login failed', {
      error: error.message,
      email
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
 * Verify user token
 * @param {string} token - JWT token
 * @returns {Promise<Object>} User data
 */
const verifyUserToken = async (token) => {
  try {
    // Verify token
    const decoded = verifyToken(token);
    
    // Find user
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password_hash'] }
    });
    
    if (!user || !user.is_active) {
      throw new Error('User not found or inactive');
    }

    return user.toJSON();
  } catch (error) {
    logger.error('Token verification failed', {
      error: error.message
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
