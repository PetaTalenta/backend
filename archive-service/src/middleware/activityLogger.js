/**
 * Activity Logger Middleware
 * Logs admin activities for audit trail purposes
 */

const UserActivityLog = require('../models/UserActivityLog');
const logger = require('../utils/logger');

/**
 * Middleware to log admin activities
 * @param {string} activityType - Type of activity being performed
 * @param {Object} options - Additional options for logging
 * @returns {Function} Express middleware function
 */
const logActivity = (activityType, options = {}) => {
  return async (req, res, next) => {
    // Store activity info in request for later logging
    req.activityLog = {
      activityType,
      options,
      startTime: Date.now()
    };

    // Override res.json to capture response and log activity
    const originalJson = res.json;
    res.json = function(data) {
      // Log activity after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logActivityAsync(req, res, data);
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Async function to log activity without blocking response
 */
const logActivityAsync = async (req, res, responseData) => {
  try {
    const { activityType, options } = req.activityLog;
    
    // Extract admin info from request
    const adminId = req.admin?.id;
    if (!adminId) {
      logger.warn('Activity logging skipped: No admin ID found', {
        activityType,
        path: req.path
      });
      return;
    }

    // Extract user ID from params or body
    let userId = null;
    if (req.params?.userId) {
      userId = req.params.userId;
    } else if (options.extractUserIdFromBody && req.body?.user_id) {
      userId = req.body.user_id;
    }

    // Prepare activity data
    const activityData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: Date.now() - req.activityLog.startTime,
      ...options.additionalData
    };

    // Add request-specific data based on activity type
    switch (activityType) {
      case 'profile_update':
        if (req.body) {
          activityData.updatedFields = Object.keys(req.body);
          activityData.updateData = req.body;
        }
        break;
      
      case 'token_balance_update':
        if (req.body) {
          activityData.tokenBalanceChange = {
            action: req.body.action || 'set',
            amount: req.body.token_balance,
            previousBalance: options.previousBalance
          };
        }
        break;
      
      case 'user_delete':
        activityData.deletionInfo = {
          originalEmail: options.originalEmail,
          deletedAt: new Date().toISOString()
        };
        break;
      
      case 'user_view':
      case 'user_list_view':
        activityData.queryParams = req.query;
        if (responseData?.data?.pagination) {
          activityData.pagination = responseData.data.pagination;
        }
        break;
      
      default:
        // For other activity types, include basic request info
        if (req.query && Object.keys(req.query).length > 0) {
          activityData.queryParams = req.query;
        }
        break;
    }

    // Log the activity
    await UserActivityLog.logActivity({
      userId,
      adminId,
      activityType,
      data: activityData,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info('Admin activity logged', {
      adminId,
      userId,
      activityType,
      path: req.path,
      statusCode: res.statusCode
    });

  } catch (error) {
    logger.error('Failed to log admin activity', {
      error: error.message,
      activityType: req.activityLog?.activityType,
      path: req.path,
      adminId: req.admin?.id
    });
  }
};

/**
 * Middleware specifically for user profile updates
 */
const logProfileUpdate = () => {
  return logActivity('profile_update', {
    additionalData: {
      operation: 'profile_update'
    }
  });
};

/**
 * Middleware specifically for token balance updates
 */
const logTokenBalanceUpdate = (previousBalance = null) => {
  return logActivity('token_balance_update', {
    additionalData: {
      operation: 'token_balance_update'
    },
    previousBalance
  });
};

/**
 * Middleware specifically for user deletion
 */
const logUserDeletion = (originalEmail = null) => {
  return logActivity('user_delete', {
    additionalData: {
      operation: 'user_delete'
    },
    originalEmail
  });
};

/**
 * Middleware specifically for user viewing
 */
const logUserView = () => {
  return logActivity('user_view', {
    additionalData: {
      operation: 'user_view'
    }
  });
};

/**
 * Middleware specifically for user list viewing
 */
const logUserListView = () => {
  return logActivity('user_list_view', {
    additionalData: {
      operation: 'user_list_view'
    }
  });
};

/**
 * Middleware specifically for system stats viewing
 */
const logSystemStatsView = () => {
  return logActivity('system_stats_view', {
    additionalData: {
      operation: 'system_stats_view'
    }
  });
};

module.exports = {
  logActivity,
  logProfileUpdate,
  logTokenBalanceUpdate,
  logUserDeletion,
  logUserView,
  logUserListView,
  logSystemStatsView
};
