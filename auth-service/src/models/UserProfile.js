const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserProfile = sequelize.define('UserProfile', {
  user_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'full_name',
    validate: {
      len: {
        args: [1, 100],
        msg: 'Full name must be between 1 and 100 characters'
      },
      isNotEmptyString(value) {
        if (value !== null && value !== undefined && typeof value === 'string' && value.trim() === '') {
          throw new Error('Full name cannot be empty');
        }
      }
    }
  },

  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'date_of_birth',
    validate: {
      isDate: true,
      isBefore: new Date().toISOString().split('T')[0] // Must be before today
    }
  },
  gender: {
    type: DataTypes.STRING(10),
    allowNull: true,
    validate: {
      isIn: [['male', 'female']]
    }
  },
  school_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'school_id',
    references: {
      model: 'schools',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
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
  }
}, {
  tableName: 'user_profiles',
  schema: process.env.DB_SCHEMA || 'auth',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['school_id']
    },
    // Optimized composite index untuk query demografis dan analytics
    {
      name: 'idx_user_profiles_demographics_optimized',
      fields: ['gender', 'date_of_birth']
    },
    // Index untuk school_id queries
    {
      name: 'idx_user_profiles_school_id',
      fields: ['school_id']
    }
  ]
});

// Instance methods
UserProfile.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  return values;
};

// Static methods untuk query yang dioptimalkan
UserProfile.findByDemographics = async function(options = {}) {
  const { gender, ageRange, limit = 100, offset = 0 } = options;
  const where = {};

  if (gender) {
    where.gender = gender;
  }

  if (ageRange && ageRange.min && ageRange.max) {
    const currentYear = new Date().getFullYear();
    const maxBirthYear = currentYear - ageRange.min;
    const minBirthYear = currentYear - ageRange.max;

    where.date_of_birth = {
      [require('sequelize').Op.between]: [
        `${minBirthYear}-01-01`,
        `${maxBirthYear}-12-31`
      ]
    };
  }

  // school_origin column removed - no longer exists in database

  return this.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['created_at', 'DESC']]
  });
};

UserProfile.getGenderDistribution = async function() {
  const { QueryTypes } = require('sequelize');
  const sequelize = require('../config/database');

  return sequelize.query(`
    SELECT
      gender,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
    FROM auth.user_profiles
    WHERE gender IS NOT NULL
    GROUP BY gender
    ORDER BY count DESC
  `, {
    type: QueryTypes.SELECT
  });
};

UserProfile.getAgeDistribution = async function() {
  const { QueryTypes } = require('sequelize');
  const sequelize = require('../config/database');

  return sequelize.query(`
    SELECT
      CASE
        WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 18 THEN 'Under 18'
        WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 18 AND 22 THEN '18-22'
        WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 23 AND 27 THEN '23-27'
        WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 28 AND 35 THEN '28-35'
        WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) > 35 THEN 'Over 35'
        ELSE 'Unknown'
      END as age_group,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
    FROM auth.user_profiles
    WHERE date_of_birth IS NOT NULL
    GROUP BY age_group
    ORDER BY count DESC
  `, {
    type: QueryTypes.SELECT
  });
};

UserProfile.getTopSchools = async function(limit = 10) {
  const { QueryTypes } = require('sequelize');
  const sequelize = require('../config/database');

  return sequelize.query(`
    SELECT
      s.name as school_name,
      s.city,
      s.province,
      COUNT(up.user_id) as count,
      ROUND(COUNT(up.user_id) * 100.0 / SUM(COUNT(up.user_id)) OVER (), 2) as percentage
    FROM public.schools s
    INNER JOIN auth.user_profiles up ON s.id = up.school_id
    GROUP BY s.id, s.name, s.city, s.province
    ORDER BY count DESC
    LIMIT :limit
  `, {
    replacements: { limit },
    type: QueryTypes.SELECT
  });
};

UserProfile.findBySchoolId = async function(schoolId, options = {}) {
  const { limit = 100, offset = 0 } = options;

  return this.findAndCountAll({
    where: {
      school_id: schoolId
    },
    include: [{
      model: require('./User'),
      as: 'user',
      attributes: ['id', 'email', 'username', 'user_type', 'is_active', 'created_at']
    }, {
      model: require('./School'),
      as: 'school',
      attributes: ['id', 'name', 'city', 'province']
    }],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['created_at', 'DESC']]
  });
};

UserProfile.getSchoolDistribution = async function() {
  const { QueryTypes } = require('sequelize');
  const sequelize = require('../config/database');

  return sequelize.query(`
    SELECT
      s.id as school_id,
      s.name as school_name,
      s.city,
      s.province,
      COUNT(up.user_id) as user_count,
      ROUND(COUNT(up.user_id) * 100.0 / SUM(COUNT(up.user_id)) OVER (), 2) as percentage
    FROM public.schools s
    LEFT JOIN auth.user_profiles up ON s.id = up.school_id
    GROUP BY s.id, s.name, s.city, s.province
    HAVING COUNT(up.user_id) > 0
    ORDER BY user_count DESC
  `, {
    type: QueryTypes.SELECT
  });
};

// Class methods
UserProfile.associate = function(models) {
  // UserProfile belongs to User
  UserProfile.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });

  // UserProfile belongs to School
  UserProfile.belongsTo(models.School, {
    foreignKey: 'school_id',
    as: 'school',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  });
};

module.exports = UserProfile;
