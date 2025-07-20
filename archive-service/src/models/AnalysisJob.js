/**
 * AnalysisJob Model for Archive Service
 * Sequelize model for archive.analysis_jobs table
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AnalysisJob = sequelize.define('AnalysisJob', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  job_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    field: 'job_id'
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id'
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'queued',
    validate: {
      isIn: [['queued', 'processing', 'completed', 'failed']]
    }
  },
  result_id: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'result_id'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message'
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  },
  processing_started_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'processing_started_at'
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'priority'
  },
  retry_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'retry_count'
  },
  max_retries: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
    field: 'max_retries'
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
  tableName: 'analysis_jobs',
  schema: 'archive',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['job_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['user_id', 'status']
    },
    {
      name: 'idx_analysis_jobs_queue_processing',
      fields: ['status', 'priority', 'created_at']
    },
    {
      name: 'idx_analysis_jobs_retry_logic',
      fields: ['status', 'retry_count', 'max_retries']
    },
    {
      name: 'idx_analysis_jobs_user_status_created',
      fields: ['user_id', 'status', 'created_at']
    },
    {
      name: 'idx_analysis_jobs_assessment_name',
      fields: ['assessment_name']
    }
  ]
});

/**
 * Define associations
 */
AnalysisJob.associate = (models) => {
  // Association with AnalysisResult
  AnalysisJob.belongsTo(models.AnalysisResult, {
    foreignKey: 'result_id',
    as: 'result',
    onDelete: 'SET NULL'
  });

  // Association with User (if UserProfile model exists)
  if (models.UserProfile) {
    AnalysisJob.belongsTo(models.UserProfile, {
      foreignKey: 'user_id',
      targetKey: 'user_id',
      as: 'userProfile'
    });
  }
};

/**
 * Instance methods
 */
AnalysisJob.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  
  // Convert timestamps to ISO strings for consistency
  if (values.created_at) {
    values.created_at = values.created_at.toISOString();
  }
  if (values.updated_at) {
    values.updated_at = values.updated_at.toISOString();
  }
  if (values.completed_at) {
    values.completed_at = values.completed_at.toISOString();
  }
  
  return values;
};

/**
 * Class methods
 */
AnalysisJob.findByJobId = async function(jobId, includeAssociations = false) {
  const options = {
    where: { job_id: jobId }
  };

  if (includeAssociations) {
    options.include = [
      {
        model: this.sequelize.models.AnalysisResult,
        as: 'result',
        required: false
      }
    ];
  }

  return await this.findOne(options);
};

AnalysisJob.getJobsByUser = async function(userId, options = {}) {
  const { limit = 10, offset = 0, status, assessment_name, includeAssociations = false } = options;

  const whereClause = { user_id: userId };
  if (status) {
    whereClause.status = status;
  }
  if (assessment_name) {
    whereClause.assessment_name = assessment_name;
  }

  const queryOptions = {
    where: whereClause,
    order: [['created_at', 'DESC']],
    limit,
    offset
  };

  if (includeAssociations) {
    queryOptions.include = [
      {
        model: this.sequelize.models.AnalysisResult,
        as: 'result',
        required: false
      }
    ];
  }

  return await this.findAndCountAll(queryOptions);
};

AnalysisJob.getJobStats = async function(userId = null) {
  const whereClause = userId ? { user_id: userId } : {};
  
  const [results] = await sequelize.query(`
    SELECT
      COUNT(*) as total_jobs,
      COUNT(CASE WHEN status = 'queued' THEN 1 END) as queued,
      COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
      AVG(CASE 
        WHEN status IN ('completed', 'failed') AND completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (completed_at - created_at))
        ELSE NULL 
      END) as avg_processing_time_seconds
    FROM archive.analysis_jobs
    ${userId ? 'WHERE user_id = :userId' : ''}
  `, {
    replacements: { userId },
    type: sequelize.QueryTypes.SELECT
  });
  
  return {
    total_jobs: parseInt(results.total_jobs) || 0,
    queued: parseInt(results.queued) || 0,
    processing: parseInt(results.processing) || 0,
    completed: parseInt(results.completed) || 0,
    failed: parseInt(results.failed) || 0,
    avg_processing_time_seconds: results.avg_processing_time_seconds ? 
      parseFloat(results.avg_processing_time_seconds) : null
  };
};

module.exports = AnalysisJob;
