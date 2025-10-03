/**
 * UserActivityLog Model for Archive Service
 * Sequelize model for archive.user_activity_logs table
 * Tracks all admin actions performed on users for audit purposes
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserActivityLog = sequelize.define('UserActivityLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true, // Can be null for system-wide actions
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  admin_id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'admin_id'
  },
  activity_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'activity_type',
    validate: {
      isIn: [[
        'profile_update',
        'token_balance_update', 
        'user_delete',
        'user_view',
        'user_list_view',
        'profile_view',
        'system_stats_view',
        'job_monitor_view',
        'assessment_view',
        'assessment_export'
      ]]
    }
  },
  activity_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'activity_data'
  },
  ip_address: {
    type: DataTypes.INET,
    allowNull: true,
    field: 'ip_address'
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'user_activity_logs',
  schema: 'archive',
  timestamps: false, // We manage created_at manually
  underscored: true,
  indexes: [
    {
      name: 'idx_user_activity_logs_user_id',
      fields: ['user_id']
    },
    {
      name: 'idx_user_activity_logs_admin_id',
      fields: ['admin_id']
    },
    {
      name: 'idx_user_activity_logs_created_at',
      fields: ['created_at']
    },
    {
      name: 'idx_user_activity_logs_activity_type',
      fields: ['activity_type']
    },
    {
      name: 'idx_user_activity_logs_admin_date',
      fields: ['admin_id', 'created_at']
    },
    {
      name: 'idx_user_activity_logs_user_date',
      fields: ['user_id', 'created_at']
    }
  ]
});

// Instance methods
UserActivityLog.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  return values;
};

// Static methods for common operations
UserActivityLog.logActivity = async function(activityData) {
  const {
    userId,
    adminId,
    activityType,
    data,
    ipAddress,
    userAgent
  } = activityData;

  try {
    const log = await this.create({
      user_id: userId,
      admin_id: adminId,
      activity_type: activityType,
      activity_data: data,
      ip_address: ipAddress,
      user_agent: userAgent
    });
    
    return log;
  } catch (error) {
    // Log error but don't fail the main operation
    const logger = require('../utils/logger');
    logger.error('Failed to log user activity', {
      error: error.message,
      activityData
    });
    return null;
  }
};

// Get activity logs for a specific user
UserActivityLog.getUserActivityLogs = async function(userId, options = {}) {
  const {
    limit = 50,
    offset = 0,
    activityType = null,
    startDate = null,
    endDate = null
  } = options;

  const whereClause = { user_id: userId };
  
  if (activityType) {
    whereClause.activity_type = activityType;
  }
  
  if (startDate || endDate) {
    whereClause.created_at = {};
    if (startDate) whereClause.created_at[require('sequelize').Op.gte] = startDate;
    if (endDate) whereClause.created_at[require('sequelize').Op.lte] = endDate;
  }

  return await this.findAndCountAll({
    where: whereClause,
    order: [['created_at', 'DESC']],
    limit,
    offset
  });
};

// Get activity logs for a specific admin
UserActivityLog.getAdminActivityLogs = async function(adminId, options = {}) {
  const {
    limit = 50,
    offset = 0,
    activityType = null,
    startDate = null,
    endDate = null
  } = options;

  const whereClause = { admin_id: adminId };
  
  if (activityType) {
    whereClause.activity_type = activityType;
  }
  
  if (startDate || endDate) {
    whereClause.created_at = {};
    if (startDate) whereClause.created_at[require('sequelize').Op.gte] = startDate;
    if (endDate) whereClause.created_at[require('sequelize').Op.lte] = endDate;
  }

  return await this.findAndCountAll({
    where: whereClause,
    order: [['created_at', 'DESC']],
    limit,
    offset
  });
};

module.exports = UserActivityLog;
