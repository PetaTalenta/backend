const authService = require('../services/authService');
const logger = require('../utils/logger');
const { verifyToken } = require('../utils/jwt');

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Register user
    const result = await authService.registerUser({ email, password });

    logger.info('User registered successfully', {
      userId: result.user.id,
      email: result.user.email,
      ip: req.ip
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register multiple users in batch
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const registerBatch = async (req, res, next) => {
  try {
    const { users: usersData } = req.body;

    if (!Array.isArray(usersData) || usersData.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body must contain a non-empty array of users'
        }
      });
    }

    if (usersData.length > 50) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Batch size cannot exceed 50 users'
        }
      });
    }

    const results = await authService.registerUsersBatch(usersData);
    const successCount = results.filter(r => r.success).length;

    logger.info('Batch user registration completed', {
      total: results.length,
      successful: successCount,
      failed: results.length - successCount,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: `Batch user registration processed successfully`,
      data: {
        total: results.length,
        successful: successCount,
        failed: results.length - successCount,
        results: results.map((result, index) => ({
          index,
          success: result.success,
          user: result.success ? {
            id: result.data.user.id,
            email: result.data.user.email,
            token_balance: result.data.user.token_balance,
            created_at: result.data.user.created_at
          } : null,
          token: result.success ? result.data.token : null,
          error: result.success ? null : result.error
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Login user
    const result = await authService.loginUser({ email, password });
    
    logger.info('User login successful', {
      userId: result.user.id,
      email: result.user.email,
      ip: req.ip
    });
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change user password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    // Change password
    await authService.changePassword(userId, { currentPassword, newPassword });
    
    logger.info('Password changed successfully', {
      userId,
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
 * Verify JWT token (for internal service use)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const verifyUserToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Get user data
    const user = await authService.verifyUserToken(token);
    
    logger.debug('Token verification successful', {
      userId: user.id,
      email: user.email,
      ip: req.ip
    });
    
    // Return success response
    res.status(200).json({
      success: true,
      data: {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          user_type: user.user_type
        }
      }
    });
  } catch (error) {
    logger.warn('Token verification failed', {
      error: error.message,
      ip: req.ip
    });
    
    // Return invalid token response
    res.status(200).json({
      success: true,
      data: {
        valid: false,
        error: error.message
      }
    });
  }
};

/**
 * Logout user (invalidate token on client side)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const logout = (req, res) => {
  const userId = req.user.id;
  
  logger.info('User logged out', {
    userId,
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
  registerBatch,
  login,
  changePassword,
  verifyUserToken,
  logout
};
