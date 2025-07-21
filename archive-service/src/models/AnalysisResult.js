/**
 * AnalysisResult Model
 * Sequelize model for archive.analysis_results table
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AnalysisResult = sequelize.define('AnalysisResult', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id'
  },
  assessment_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'assessment_data'
  },
  persona_profile: {
    type: DataTypes.JSONB,
    allowNull: true, // Allow null for failed analyses
    field: 'persona_profile'
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'completed',
    validate: {
      isIn: [['completed', 'processing', 'failed']]
    }
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  },
  assessment_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'AI-Driven Talent Mapping',
    field: 'assessment_name',
    validate: {
      isIn: [['AI-Driven Talent Mapping', 'AI-Based IQ Test', 'Custom Assessment']]
    }
  }
}, {
  tableName: 'analysis_results',
  schema: 'archive',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    {
      name: 'idx_analysis_results_user_id',
      fields: ['user_id']
    },
    {
      name: 'idx_analysis_results_status',
      fields: ['status']
    },
    {
      name: 'idx_analysis_results_created_at',
      fields: ['created_at']
    },
    {
      name: 'idx_analysis_results_user_created',
      fields: ['user_id', 'created_at']
    },
    {
      name: 'idx_analysis_results_assessment_name',
      fields: ['assessment_name']
    }
  ]
});

/**
 * Instance methods
 */

/**
 * Get formatted result for API response
 * @returns {Object} - Formatted result
 */
AnalysisResult.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());

  // Format dates
  if (values.created_at) {
    values.created_at = values.created_at.toISOString();
  }
  if (values.updated_at) {
    values.updated_at = values.updated_at.toISOString();
  }

  return values;
};

/**
 * Class methods for associations
 */
AnalysisResult.associate = function(models) {
  // Association with UserProfile
  if (models.UserProfile) {
    AnalysisResult.belongsTo(models.UserProfile, {
      foreignKey: 'user_id',
      targetKey: 'user_id',
      as: 'userProfile'
    });
  }

  // Association with AnalysisJob (one-to-many)
  AnalysisResult.hasMany(models.AnalysisJob, {
    foreignKey: 'result_id',
    as: 'jobs'
  });
};

/**
 * Static methods
 */

/**
 * Find results by user ID with pagination (legacy)
 * @param {String} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Results with pagination
 */
AnalysisResult.findByUserWithPagination = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 10,
    status,
    assessment_name,
    sort = 'created_at',
    order = 'DESC'
  } = options;

  const offset = (page - 1) * limit;

  const whereClause = { user_id: userId };
  if (status) {
    whereClause.status = status;
  }
  if (assessment_name) {
    whereClause.assessment_name = assessment_name;
  }

  const { count, rows } = await this.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [[sort, order.toUpperCase()]],
    raw: false
  });

  const totalPages = Math.ceil(count / limit);

  return {
    results: rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };

/**
 * Find results by user ID with cursor-based pagination
 * Phase 2.1: Cursor-based pagination for 70-90% faster performance
 * @param {String} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Results with cursor pagination
 */
AnalysisResult.findByUserWithCursor = async function(userId, options = {}) {
  const { CursorPagination } = require('../utils/pagination');

  const {
    cursor,
    limit = 10,
    status,
    assessment_name,
    orderBy = 'created_at',
    orderDirection = 'DESC'
  } = options;

  const whereClause = { user_id: userId };
  if (status) {
    whereClause.status = status;
  }
  if (assessment_name) {
    whereClause.assessment_name = assessment_name;
  }

  return await CursorPagination.paginate(this, {
    where: whereClause,
    cursor,
    limit: parseInt(limit),
    orderBy,
    orderDirection
  });
};
};

/**
 * Get user statistics
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - User statistics
 */
AnalysisResult.getUserStats = async function(userId) {
  const { executeUserStatsQuery } = require('../utils/queryBuilder');
  return await executeUserStatsQuery(userId);
};

/**
 * Get demographic analysis with optimized queries
 * @param {Object} filters - Demographic filters
 * @returns {Promise<Object>} - Demographic analysis results
 */
AnalysisResult.getDemographicAnalysis = async function(filters = {}) {
  const { executeDemographicAnalysis } = require('../utils/queryBuilder');
  return await executeDemographicAnalysis(filters);
};

/**
 * Get archetype distribution with demographic breakdown
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Archetype distribution
 */
AnalysisResult.getArchetypeDistribution = async function(options = {}) {
  const { executeArchetypeDistribution } = require('../utils/queryBuilder');
  return await executeArchetypeDistribution(options);
};

/**
 * Get performance metrics for optimized queries
 * @returns {Promise<Object>} - Performance metrics
 */
AnalysisResult.getQueryPerformanceMetrics = async function() {
  // Query untuk mengecek penggunaan index
  const indexUsage = await sequelize.query(`
    SELECT
      schemaname,
      tablename,
      indexname,
      idx_scan as index_scans,
      idx_tup_read as tuples_read,
      idx_tup_fetch as tuples_fetched
    FROM pg_stat_user_indexes
    WHERE schemaname IN ('archive', 'auth')
      AND tablename IN ('analysis_results', 'user_profiles')
    ORDER BY idx_scan DESC
  `, {
    type: sequelize.QueryTypes.SELECT
  });

  // Query untuk mengecek performa table
  const tableStats = await sequelize.query(`
    SELECT
      schemaname,
      tablename,
      seq_scan as sequential_scans,
      seq_tup_read as sequential_tuples_read,
      idx_scan as index_scans,
      idx_tup_fetch as index_tuples_fetched,
      n_tup_ins as inserts,
      n_tup_upd as updates,
      n_tup_del as deletes
    FROM pg_stat_user_tables
    WHERE schemaname IN ('archive', 'auth')
      AND tablename IN ('analysis_results', 'user_profiles')
  `, {
    type: sequelize.QueryTypes.SELECT
  });

  return {
    indexUsage,
    tableStats,
    timestamp: new Date()
  };
};



module.exports = AnalysisResult;
