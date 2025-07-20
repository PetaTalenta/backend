const { User } = require('../models');
const logger = require('../utils/logger');

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User data
 */
const getUserById = async (userId) => {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    logger.debug('User retrieved successfully', {
      userId: user.id,
      email: user.email
    });

    return user.toJSON();
  } catch (error) {
    logger.error('Error retrieving user', {
      error: error.message,
      userId
    });
    throw error;
  }
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} userData - User data to update
 * @returns {Promise<Object>} Updated user data
 */
const updateUserProfile = async (userId, userData) => {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // If email is being updated, check if it's already in use
    if (userData.email && userData.email !== user.email) {
      const existingUser = await User.findOne({ where: { email: userData.email } });
      if (existingUser) {
        throw new Error('Email already exists');
      }
    }

    // Update user data
    await user.update(userData);

    logger.info('User profile updated successfully', {
      userId: user.id,
      email: user.email,
      updatedFields: Object.keys(userData)
    });

    return user.toJSON();
  } catch (error) {
    logger.error('Error updating user profile', {
      error: error.message,
      userId,
      updatedFields: Object.keys(userData || {})
    });
    throw error;
  }
};

/**
 * Update user token balance
 * @param {string} userId - User ID
 * @param {number} amount - Amount to add or subtract
 * @param {string} operation - 'add' or 'subtract'
 * @returns {Promise<Object>} Updated user data
 */
const updateTokenBalance = async (userId, amount, operation) => {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    let newBalance;
    if (operation === 'add') {
      newBalance = user.token_balance + amount;
    } else if (operation === 'subtract') {
      if (user.token_balance < amount) {
        throw new Error('Insufficient token balance');
      }
      newBalance = user.token_balance - amount;
    } else {
      throw new Error('Invalid operation. Use "add" or "subtract"');
    }

    // Update token balance
    await user.update({ token_balance: newBalance });

    logger.info('Token balance updated successfully', {
      userId: user.id,
      email: user.email,
      operation,
      amount,
      oldBalance: user.token_balance,
      newBalance
    });

    return {
      user_id: user.id,
      new_balance: newBalance
    };
  } catch (error) {
    logger.error('Error updating token balance', {
      error: error.message,
      userId,
      operation,
      amount
    });
    throw error;
  }
};

/**
 * Get user token balance
 * @param {string} userId - User ID
 * @returns {Promise<number>} Token balance
 */
const getTokenBalance = async (userId) => {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    logger.debug('Token balance retrieved successfully', {
      userId: user.id,
      email: user.email,
      tokenBalance: user.token_balance
    });

    return user.token_balance;
  } catch (error) {
    logger.error('Error retrieving token balance', {
      error: error.message,
      userId
    });
    throw error;
  }
};

module.exports = {
  getUserById,
  updateUserProfile,
  updateTokenBalance,
  getTokenBalance
};
