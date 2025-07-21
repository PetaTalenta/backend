const adminService = require('../services/adminService');
const { User, UserProfile } = require('../models');
const logger = require('../utils/logger');
const { formatResponse, formatErrorResponse } = require('../utils/responseFormatter');

/**
 * Register a new admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const register = async (req, res, next) => {
  try {
    const { username, email, password, full_name, user_type = 'admin' } = req.body;

    // Only superadmin can create other admins
    if (req.user && !req.user.isSuperAdmin()) {
      return res.status(403).json(formatErrorResponse(
        'FORBIDDEN',
        'Only superadmin can create new admins'
      ));
    }

    // Register admin using unified service
    const result = await adminService.registerAdmin({
      username,
      email,
      password,
      full_name,
      user_type
    });

    logger.info('Admin registered successfully', {
      adminId: result.user.id,
      username: result.user.username,
      email: result.user.email,
      user_type: result.user.user_type,
      createdBy: req.user ? req.user.id : 'system',
      ip: req.ip
    });

    res.status(201).json(formatResponse({
      user: result.user,
      token: result.token,
      message: 'Admin registered successfully'
    }));
  } catch (error) {
    logger.error('Error registering admin', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Login admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Login admin using unified service
    const result = await adminService.loginAdmin({ username, password });

    logger.info('Admin login successful', {
      adminId: result.user.id,
      username: result.user.username,
      email: result.user.email,
      user_type: result.user.user_type,
      ip: req.ip
    });

    res.json(formatResponse({
      user: result.user,
      token: result.token,
      message: 'Login successful'
    }));
  } catch (error) {
    logger.error('Error during admin login', {
      username: req.body?.username,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Change admin password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.admin.id;
    
    // Change password
    const result = await adminService.changeAdminPassword(
      adminId, 
      currentPassword, 
      newPassword
    );
    
    logger.info('Admin password changed successfully', {
      adminId,
      username: req.admin.username,
      ip: req.ip
    });
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get admin profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get admin profile with profile data
    const user = await User.findByPk(userId, {
      include: [{
        model: UserProfile,
        as: 'profile',
        required: false
      }],
      attributes: { exclude: ['password_hash'] }
    });

    if (!user || !user.isAdmin()) {
      return res.status(404).json(formatErrorResponse(
        'ADMIN_NOT_FOUND',
        'Admin not found'
      ));
    }

    logger.debug('Admin profile retrieved', {
      adminId: userId,
      username: user.username,
      email: user.email,
      user_type: user.user_type,
      ip: req.ip
    });

    res.json(formatResponse({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        user_type: user.user_type,
        is_active: user.is_active,
        last_login: user.last_login,
        created_at: user.created_at,
        profile: user.profile || null
      }
    }));
  } catch (error) {
    logger.error('Error retrieving admin profile', {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Update admin profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const updateProfile = async (req, res, next) => {
  try {
    const adminId = req.admin.id;
    const updateData = req.body;
    
    // Update admin profile
    const admin = await adminService.updateAdminProfile(adminId, updateData);
    
    logger.info('Admin profile updated successfully', {
      adminId,
      username: admin.username,
      email: admin.email,
      updatedFields: Object.keys(updateData),
      ip: req.ip
    });
    
    // Return success response
    res.status(200).json(formatResponse({
      user: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        user_type: admin.user_type,
        is_active: admin.is_active,
        last_login: admin.last_login,
        created_at: admin.created_at,
        profile: admin.profile || null
      },
      message: 'Profile updated successfully'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Logout admin (invalidate token on client side)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const logout = (req, res) => {
  const adminId = req.admin.id;
  
  logger.info('Admin logged out', {
    adminId,
    username: req.admin.username,
    ip: req.ip
  });
  
  // Return success response
  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
};

module.exports = {
  register,
  login,
  changePassword,
  getProfile,
  updateProfile,
  logout
};
