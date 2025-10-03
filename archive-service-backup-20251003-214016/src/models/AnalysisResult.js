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
  test_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'test_data' // Updated field name after database refactoring
  },
  test_result: {
    type: DataTypes.JSONB,
    allowNull: true, // Allow null for failed analyses
    field: 'test_result' // Updated field name after database refactoring
  },
  raw_responses: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'raw_responses'
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

  is_public: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_public'
  },
  chatbot_id: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'chatbot_id',
    validate: {
      isUUID: 4
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
      name: 'idx_analysis_results_created_at',
      fields: ['created_at']
    },
    {
      name: 'idx_analysis_results_user_created',
      fields: ['user_id', 'created_at']
    },

    {
      name: 'idx_analysis_results_chatbot_id',
      fields: ['chatbot_id'],
      where: {
        chatbot_id: {
          [require('sequelize').Op.ne]: null
        }
      }
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
 * Find results by user ID with pagination (updated for post-migration)
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

  // Build where clause for analysis_results
  const whereClause = { user_id: userId };

  // Build include clause for analysis_jobs with filtering
  const includeClause = {
    model: this.sequelize.models.AnalysisJob,
    as: 'jobs',
    required: false, // LEFT JOIN to include results even without jobs
    where: {}
  };

  // Apply filters on analysis_jobs
  if (status) {
    includeClause.where.status = status;
    includeClause.required = true; // INNER JOIN when filtering by status
  } else {
    // Always exclude deleted jobs even when no specific status filter is applied
    includeClause.where.status = { [this.sequelize.Sequelize.Op.ne]: 'deleted' };
  }
  if (assessment_name) {
    includeClause.where.assessment_name = assessment_name;
    includeClause.required = true; // INNER JOIN when filtering by assessment_name
  }

  // If no filters on jobs, remove empty where clause
  if (Object.keys(includeClause.where).length === 0) {
    delete includeClause.where;
  }

  const { count, rows } = await this.findAndCountAll({
    where: whereClause,
    include: [includeClause],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [[sort, order.toUpperCase()]],
    raw: false,
    distinct: true // Prevent duplicate counting when joining
  });

  // Transform results to include job data at the result level
  const transformedRows = rows.map(result => {
    const resultData = result.toJSON();
    const job = resultData.jobs && resultData.jobs.length > 0 ? resultData.jobs[0] : null;

    return {
      ...resultData,
      // Add job fields to result level for backward compatibility
      status: job ? job.status : null,
      error_message: job ? job.error_message : null,
      assessment_name: job ? job.assessment_name : null,
      // Keep jobs array for detailed access if needed
      jobs: resultData.jobs
    };
  });

  const totalPages = Math.ceil(count / limit);

  return {
    results: transformedRows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };

};

/**
 * Find results by user ID with cursor-based pagination (updated for post-migration)
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

  // Build where clause for analysis_results
  const whereClause = { user_id: userId };

  // Build include clause for analysis_jobs with filtering
  const includeClause = {
    model: this.sequelize.models.AnalysisJob,
    as: 'jobs',
    required: false, // LEFT JOIN to include results even without jobs
    where: {}
  };

  // Apply filters on analysis_jobs
  if (status) {
    includeClause.where.status = status;
    includeClause.required = true; // INNER JOIN when filtering by status
  } else {
    // Always exclude deleted jobs even when no specific status filter is applied
    includeClause.where.status = { [this.sequelize.Sequelize.Op.ne]: 'deleted' };
  }
  if (assessment_name) {
    includeClause.where.assessment_name = assessment_name;
    includeClause.required = true; // INNER JOIN when filtering by assessment_name
  }

  // If no filters on jobs, remove empty where clause
  if (Object.keys(includeClause.where).length === 0) {
    delete includeClause.where;
  }

  return await CursorPagination.paginate(this, {
    where: whereClause,
    include: [includeClause],
    cursor,
    limit: parseInt(limit),
    orderBy,
    orderDirection
  });
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
