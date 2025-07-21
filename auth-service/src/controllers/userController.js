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

    // Get user with profile using optimized query
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
      attributes: { exclude: ['password_hash'] }
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
      if (username !== undefined) userUpdateData.username = username;

      if (Object.keys(userUpdateData).length > 0) {
        await user.update(userUpdateData, { transaction });
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



        if (profile) {
          await profile.update(profileUpdateData, { transaction });
        } else {
          profile = await UserProfile.create(profileUpdateData, { transaction });
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
 * Get user token balance (kept for backward compatibility)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getTokenBalance = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'token_balance']
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

/**
 * Get schools by location - optimized for geographic queries
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getSchoolsByLocation = async (req, res, next) => {
  try {
    const { province, city, limit = 50 } = req.query;

    if (!province) {
      return res.status(400).json(formatErrorResponse(
        'MISSING_PROVINCE',
        'Province parameter is required'
      ));
    }

    const schools = await School.searchByLocation(province, city, parseInt(limit));

    logger.info('Schools by location retrieved', {
      province,
      city,
      limit,
      schoolsFound: schools.length
    });

    res.json(formatResponse({
      schools,
      filters: { province, city },
      total: schools.length
    }));

  } catch (error) {
    logger.error('Error retrieving schools by location', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get location statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getLocationStats = async (req, res, next) => {
  try {
    const stats = await School.getLocationStats();

    logger.info('Location statistics retrieved', {
      provincesCount: stats.length
    });

    res.json(formatResponse({
      locationStats: stats
    }));

  } catch (error) {
    logger.error('Error retrieving location statistics', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get user profiles by school ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getUsersBySchool = async (req, res, next) => {
  try {
    const { schoolId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!schoolId || isNaN(parseInt(schoolId))) {
      return res.status(400).json(formatErrorResponse(
        'INVALID_SCHOOL_ID',
        'Valid school ID is required'
      ));
    }

    const offset = (page - 1) * limit;
    const result = await UserProfile.findBySchoolId(parseInt(schoolId), {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const { count, rows: userProfiles } = result;

    logger.info('Users by school retrieved', {
      schoolId,
      count,
      page,
      limit
    });

    res.json(formatResponse({
      userProfiles,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    }));

  } catch (error) {
    logger.error('Error retrieving users by school', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get school distribution statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getSchoolDistribution = async (req, res, next) => {
  try {
    const distribution = await UserProfile.getSchoolDistribution();

    logger.info('School distribution retrieved', {
      schoolsCount: distribution.length
    });

    res.json(formatResponse({
      schoolDistribution: distribution
    }));

  } catch (error) {
    logger.error('Error retrieving school distribution', {
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
  getTokenBalance,
  updateTokenBalance,
  getSchools,
  createSchool,
  getSchoolsByLocation,
  getLocationStats,
  getUsersBySchool,
  getSchoolDistribution
};
