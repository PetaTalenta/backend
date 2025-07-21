const bcrypt = require('bcrypt');
const { User, UserProfile } = require('../models');
const { generateToken } = require('../utils/jwt');
const { hashPassword, comparePassword, validatePassword } = require('../utils/password');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// Remove local implementations - use utility functions from password.js

/**
 * Register a new admin
 * @param {Object} adminData - Admin registration data
 * @returns {Promise<Object>} User and token
 */
const registerAdmin = async (adminData) => {
  const { username, email, password, full_name, user_type = 'admin' } = adminData;

  // Validate admin user type
  if (!['admin', 'superadmin', 'moderator'].includes(user_type)) {
    throw new Error('Invalid user type for admin registration');
  }

  const transaction = await User.sequelize.transaction();

  try {
    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          { username: username || null }
        ]
      },
      transaction
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new Error('Email already exists');
      }
      if (existingUser.username === username) {
        throw new Error('Username already exists');
      }
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create admin user
    const user = await User.create({
      username,
      email,
      password_hash,
      user_type,
      is_active: true,
      token_balance: null // Admins don't have token balance
    }, { transaction });

    // Create user profile if full_name provided
    if (full_name) {
      await UserProfile.create({
        user_id: user.id,
        full_name
      }, { transaction });
    }

    await transaction.commit();

    // Fetch user with profile for response
    const userWithProfile = await User.findByPk(user.id, {
      include: [{
        model: UserProfile,
        as: 'profile',
        required: false
      }],
      attributes: { exclude: ['password_hash'] }
    });

    // Generate JWT token
    const token = generateToken(userWithProfile, 'admin');

    logger.info('Admin registered successfully', {
      adminId: user.id,
      username: user.username,
      email: user.email,
      user_type: user.user_type
    });

    return {
      user: userWithProfile.toJSON(),
      token
    };
  } catch (error) {
    await transaction.rollback();
    logger.error('Admin registration failed', {
      error: error.message,
      username,
      email
    });
    throw error;
  }
};

/**
 * Authenticate admin login
 * @param {Object} credentials - Login credentials
 * @returns {Promise<Object>} User and token
 */
const loginAdmin = async (credentials) => {
  const { username, password } = credentials;

  try {
    // Find admin user by username or email
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email: username } // Allow login with email
        ],
        user_type: ['admin', 'superadmin', 'moderator'],
        is_active: true
      },
      include: [{
        model: UserProfile,
        as: 'profile',
        required: false
      }]
    });

    if (!user) {
      throw new Error('Invalid username/email or password');
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid username/email or password');
    }

    // Update last login
    await user.update({ last_login: new Date() });

    // Generate JWT token
    const token = generateToken(user, 'admin');

    logger.info('Admin login successful', {
      adminId: user.id,
      username: user.username,
      email: user.email,
      user_type: user.user_type
    });

    return {
      user: user.toJSON(),
      token
    };
  } catch (error) {
    logger.error('Admin login failed', {
      error: error.message,
      username
    });
    throw error;
  }
};

/**
 * Change admin password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Success result
 */
const changeAdminPassword = async (userId, currentPassword, newPassword) => {
  try {
    // Find admin user
    const user = await User.findByPk(userId);
    if (!user || !user.isAdmin()) {
      throw new Error('Admin not found');
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

    logger.info('Admin password changed successfully', {
      adminId: user.id,
      username: user.username
    });

    return {
      success: true,
      message: 'Password changed successfully'
    };
  } catch (error) {
    logger.error('Admin password change failed', {
      error: error.message,
      userId
    });
    throw error;
  }
};

/**
 * Get admin by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Admin data
 */
const getAdminById = async (userId) => {
  try {
    const user = await User.findByPk(userId, {
      include: [{
        model: UserProfile,
        as: 'profile',
        required: false
      }],
      attributes: { exclude: ['password_hash'] }
    });

    if (!user || !user.isAdmin()) {
      throw new Error('Admin not found');
    }

    return user.toJSON();
  } catch (error) {
    logger.error('Get admin by ID failed', {
      error: error.message,
      userId
    });
    throw error;
  }
};

/**
 * Update admin profile
 * @param {string} userId - User ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} Updated admin data
 */
const updateAdminProfile = async (userId, updateData) => {
  const transaction = await User.sequelize.transaction();

  try {
    const user = await User.findByPk(userId, {
      include: [{
        model: UserProfile,
        as: 'profile',
        required: false
      }],
      transaction
    });

    if (!user || !user.isAdmin()) {
      throw new Error('Admin not found');
    }

    // Separate user fields and profile fields
    const { username, email, full_name, ...profileData } = updateData;

    // Update user fields
    const userUpdateData = {};
    if (username !== undefined) userUpdateData.username = username;
    if (email !== undefined) userUpdateData.email = email;

    // Check if email is being changed and if it's unique
    if (email && email !== user.email) {
      const existingUser = await User.findOne({
        where: {
          email,
          id: { [Op.ne]: userId }
        },
        transaction
      });

      if (existingUser) {
        throw new Error('Email already exists');
      }
    }

    // Check if username is being changed and if it's unique
    if (username && username !== user.username) {
      const existingUser = await User.findOne({
        where: {
          username,
          id: { [Op.ne]: userId }
        },
        transaction
      });

      if (existingUser) {
        throw new Error('Username already exists');
      }
    }

    // Update user data
    if (Object.keys(userUpdateData).length > 0) {
      await user.update(userUpdateData, { transaction });
    }

    // Update or create profile data
    const profileUpdateData = { full_name, ...profileData };
    const hasProfileData = Object.values(profileUpdateData).some(val => val !== undefined);

    if (hasProfileData) {
      let profile = user.profile;

      const cleanProfileData = Object.fromEntries(
        Object.entries(profileUpdateData).filter(([_, value]) => value !== undefined)
      );

      if (profile) {
        await profile.update(cleanProfileData, { transaction });
      } else {
        await UserProfile.create({
          user_id: userId,
          ...cleanProfileData
        }, { transaction });
      }
    }

    await transaction.commit();

    // Fetch updated user with profile
    const updatedUser = await User.findByPk(userId, {
      include: [{
        model: UserProfile,
        as: 'profile',
        required: false
      }],
      attributes: { exclude: ['password_hash'] }
    });

    logger.info('Admin profile updated successfully', {
      adminId: userId,
      username: updatedUser.username,
      updatedFields: Object.keys(updateData)
    });

    return updatedUser.toJSON();
  } catch (error) {
    await transaction.rollback();
    logger.error('Admin profile update failed', {
      error: error.message,
      userId
    });
    throw error;
  }
};

module.exports = {
  registerAdmin,
  loginAdmin,
  changeAdminPassword,
  getAdminById,
  updateAdminProfile
};
