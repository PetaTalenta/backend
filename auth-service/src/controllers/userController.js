const userService = require('../services/userService');
const { User, UserProfile, School } = require('../models');
const logger = require('../utils/logger');
const { formatResponse, formatErrorResponse } = require('../utils/responseFormatter');

/**
 * Format profile response with consistent school information
 * @param {Object} user - User object with profile
 * @returns {Object} Formatted user object
 */
const formatProfileResponse = (user) => {
  const userObj = user.toJSON();

  if (userObj.profile) {
    // Add school_info field for structured school data
    userObj.profile.school_info = {
      type: userObj.profile.school_id ? 'structured' : null,
      school_id: userObj.profile.school_id,
      school: userObj.profile.school || null
    };
  }

  return userObj;
};

/**
 * Get user profile with detailed information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user with profile using optimized query with fresh data
    const user = await User.findByPk(userId, {
      include: [{
        model: UserProfile,
        as: 'profile',
        required: false,
        include: [{
          model: School,
          as: 'school',
          required: false,
          attributes: ['id', 'name', 'city', 'province']
        }]
      }],
      attributes: { exclude: ['password_hash'] },
      reload: true // Force reload from database to ensure fresh token_balance
    });

    if (!user) {
      return res.status(404).json(formatErrorResponse(
        'USER_NOT_FOUND',
        'User not found'
      ));
    }

    logger.debug('User profile retrieved', {
      userId,
      email: user.email,
      hasProfile: !!user.profile,
      userType: user.user_type,
      ip: req.ip
    });

    // Return unified response format with improved school info
    const formattedUser = formatProfileResponse(user);
    res.json(formatResponse({
      user: {
        id: formattedUser.id,
        username: formattedUser.username,
        email: formattedUser.email,
        user_type: formattedUser.user_type,
        is_active: formattedUser.is_active,
        token_balance: formattedUser.token_balance,
        last_login: formattedUser.last_login,
        created_at: formattedUser.created_at,
        profile: formattedUser.profile || null
      }
    }));
  } catch (error) {
    logger.error('Error retrieving user profile', {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Update user profile (unified for both basic user data and profile data)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      username,
      full_name,
      school_id,
      date_of_birth,
      gender,
      ...otherData
    } = req.body;

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json(formatErrorResponse(
        'USER_NOT_FOUND',
        'User not found'
      ));
    }

    const transaction = await User.sequelize.transaction();

    try {
      // Update user basic data if provided
      const userUpdateData = {};
      if (username !== undefined && username !== null && username !== '') {
        userUpdateData.username = username;
      }

      if (Object.keys(userUpdateData).length > 0) {
        try {
          await user.update(userUpdateData, { transaction });
        } catch (userUpdateError) {
          await transaction.rollback();
          logger.error('Error updating user data', {
            userId,
            userUpdateData,
            error: userUpdateError.message,
            stack: userUpdateError.stack
          });

          // Handle specific validation errors
          if (userUpdateError.name === 'SequelizeValidationError') {
            const validationErrors = userUpdateError.errors.map(err => ({
              field: err.path,
              message: err.message,
              value: err.value
            }));
            return res.status(400).json(formatErrorResponse(
              'VALIDATION_ERROR',
              'User data validation failed',
              { validationErrors }
            ));
          }

          throw userUpdateError;
        }
      }

      // Update or create user profile if profile data provided
      const profileData = { full_name, school_id, date_of_birth, gender };
      const hasProfileData = Object.values(profileData).some(val => val !== undefined);

      let profile = null;
      if (hasProfileData) {
        // Validate school_id exists if provided
        if (school_id !== undefined && school_id !== null) {
          const schoolExists = await School.findByPk(school_id, { transaction });
          if (!schoolExists) {
            await transaction.rollback();
            return res.status(400).json(formatErrorResponse(
              'INVALID_SCHOOL_ID',
              `School with ID ${school_id} does not exist`
            ));
          }
        }

        profile = await UserProfile.findByPk(userId, { transaction });

        // Prepare profile update data
        const profileUpdateData = {
          user_id: userId,
          ...Object.fromEntries(
            Object.entries(profileData).filter(([_, value]) => value !== undefined)
          )
        };



        try {
          if (profile) {
            await profile.update(profileUpdateData, { transaction });
          } else {
            profile = await UserProfile.create(profileUpdateData, { transaction });
          }
        } catch (profileUpdateError) {
          await transaction.rollback();
          logger.error('Error updating user profile', {
            userId,
            profileUpdateData,
            error: profileUpdateError.message,
            stack: profileUpdateError.stack
          });

          // Handle specific validation errors
          if (profileUpdateError.name === 'SequelizeValidationError') {
            const validationErrors = profileUpdateError.errors.map(err => ({
              field: err.path,
              message: err.message,
              value: err.value
            }));
            return res.status(400).json(formatErrorResponse(
              'VALIDATION_ERROR',
              'Profile data validation failed',
              { validationErrors }
            ));
          }

          throw profileUpdateError;
        }
      }

      await transaction.commit();

      // Fetch updated user with profile
      const updatedUser = await User.findByPk(userId, {
        include: [{
          model: UserProfile,
          as: 'profile',
          required: false,
          include: [{
            model: School,
            as: 'school',
            required: false,
            attributes: ['id', 'name', 'city', 'province']
          }]
        }],
        attributes: { exclude: ['password_hash'] }
      });

      logger.info('User profile updated', {
        userId,
        email: updatedUser.email,
        updatedFields: Object.keys(req.body),
        hasProfile: !!updatedUser.profile,
        ip: req.ip
      });

      // Format response with improved school info
      const formattedUser = formatProfileResponse(updatedUser);
      res.json(formatResponse({
        user: {
          id: formattedUser.id,
          username: formattedUser.username,
          email: formattedUser.email,
          user_type: formattedUser.user_type,
          is_active: formattedUser.is_active,
          token_balance: formattedUser.token_balance,
          last_login: formattedUser.last_login,
          created_at: formattedUser.created_at,
          profile: formattedUser.profile || null
        },
        message: 'Profile updated successfully'
      }));

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    logger.error('Error updating user profile', {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Delete user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const deleteProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const profile = await UserProfile.findByPk(userId);
    if (!profile) {
      return res.status(404).json(formatErrorResponse(
        'PROFILE_NOT_FOUND',
        'Profile not found'
      ));
    }

    await profile.destroy();

    logger.info('User profile deleted', {
      userId,
      ip: req.ip
    });

    res.json(formatResponse({
      message: 'Profile deleted successfully'
    }));
  } catch (error) {
    logger.error('Error deleting user profile', {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Delete user account (soft delete - user self-deletion)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Check if user exists and is active
    const user = await User.findByPk(userId);
    if (!user || !user.is_active) {
      return res.status(404).json(formatErrorResponse(
        'USER_NOT_FOUND',
        'User not found or already inactive'
      ));
    }

    const transaction = await User.sequelize.transaction();

    try {
      // Soft delete by updating email to include deleted timestamp and reset token balance
      const timestamp = Math.floor(Date.now() / 1000);
      const deletedEmail = `deleted_${timestamp}_${userEmail}`;

      await user.update({
        email: deletedEmail,
        token_balance: 0,
        is_active: false
      }, { transaction });

      // Delete user profile if exists (cascade will handle this, but we'll be explicit)
      const profile = await UserProfile.findByPk(userId, { transaction });
      if (profile) {
        await profile.destroy({ transaction });
      }

      await transaction.commit();

      logger.warn('User account self-deleted', {
        userId,
        originalEmail: userEmail,
        newEmail: deletedEmail,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(formatResponse({
        message: 'Account deleted successfully',
        data: {
          deletedAt: new Date().toISOString(),
          originalEmail: userEmail
        }
      }));
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Error deleting user account', {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get user token balance (kept for backward compatibility)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getTokenBalance = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Force fresh data from database to ensure consistency with profile endpoint
    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'token_balance'],
      reload: true // Force reload from database
    });

    if (!user) {
      return res.status(404).json(formatErrorResponse(
        'USER_NOT_FOUND',
        'User not found'
      ));
    }

    logger.debug('Token balance retrieved', {
      userId,
      tokenBalance: user.token_balance,
      ip: req.ip
    });

    res.json(formatResponse({
      user_id: userId,
      token_balance: user.token_balance
    }));
  } catch (error) {
    logger.error('Error retrieving token balance', {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Update user token balance (internal service only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const updateTokenBalance = async (req, res, next) => {
  try {
    const { userId, amount, operation } = req.body;
    
    // Update token balance
    const result = await userService.updateTokenBalance(userId, amount, operation);
    
    logger.info('Token balance updated via internal service', {
      userId,
      amount,
      operation,
      newBalance: result.new_balance,
      ip: req.ip
    });
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Token balance updated',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get schools list - optimized version
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getSchools = async (req, res, next) => {
  try {
    const { search, city, province, page = 1, limit = 20, useFullText = false } = req.query;

    let result;

    // Use full-text search if requested and search term exists
    if (useFullText && search) {
      const schools = await School.fullTextSearch(search, parseInt(limit));
      result = {
        count: schools.length,
        rows: schools
      };
    } else {
      // Use optimized search method
      result = await School.searchOptimized({
        search,
        city,
        province,
        page: parseInt(page),
        limit: parseInt(limit)
      });
    }

    const { count, rows: schools } = result;

    logger.info('Schools list retrieved (optimized)', {
      count,
      page,
      limit,
      useFullText,
      filters: { search, city, province }
    });

    res.json(formatResponse({
      schools,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    }));
  } catch (error) {
    logger.error('Error retrieving schools', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Create new school
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const createSchool = async (req, res, next) => {
  try {
    const { name, address, city, province } = req.body;

    const school = await School.create({
      name,
      address,
      city,
      province
    });

    logger.info('School created', {
      schoolId: school.id,
      name: school.name,
      city: school.city,
      createdBy: req.user.id
    });

    res.status(201).json(formatResponse({
      school,
      message: 'School created successfully'
    }));
  } catch (error) {
    logger.error('Error creating school', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};



module.exports = {
  getProfile,
  updateProfile,
  deleteProfile,
  deleteAccount,
  getTokenBalance,
  updateTokenBalance,
  getSchools,
  createSchool
};
