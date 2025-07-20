const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const School = sequelize.define('School', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 200]
    }
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      len: [1, 100]
    }
  },
  province: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      len: [1, 100]
    }
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'schools',
  schema: 'public', // Schools table is in public schema
  timestamps: false, // Only has created_at, no updated_at
  underscored: true,
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['city']
    },
    {
      fields: ['province']
    },
    {
      fields: ['created_at']
    },
    // Composite index untuk pencarian geografis
    {
      name: 'idx_schools_location',
      fields: ['province', 'city']
    },
    // Composite index untuk informasi lengkap
    {
      name: 'idx_schools_full_info',
      fields: ['name', 'city', 'province']
    }
  ]
});

// Instance methods
School.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  return values;
};

// Static methods untuk pencarian yang dioptimalkan
School.searchOptimized = async function(options = {}) {
  const { search, city, province, page = 1, limit = 20 } = options;
  const { Op } = require('sequelize');

  const offset = (page - 1) * limit;
  const where = {};

  // Gunakan LOWER() untuk case-insensitive search (memanfaatkan index)
  if (search) {
    where[Op.or] = [
      require('sequelize').where(
        require('sequelize').fn('LOWER', require('sequelize').col('name')),
        'LIKE',
        `%${search.toLowerCase()}%`
      )
    ];
  }

  if (city) {
    where.city = {
      [Op.iLike]: `%${city}%`
    };
  }

  if (province) {
    where.province = {
      [Op.iLike]: `%${province}%`
    };
  }

  return this.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['name', 'ASC']]
  });
};

School.searchByLocation = async function(province, city = null, limit = 50) {
  const where = { province };

  if (city) {
    where.city = city;
  }

  return this.findAll({
    where,
    limit: parseInt(limit),
    order: [['city', 'ASC'], ['name', 'ASC']]
  });
};

School.getLocationStats = async function() {
  const { QueryTypes } = require('sequelize');
  const sequelize = require('../config/database');

  return sequelize.query(`
    SELECT
      province,
      COUNT(DISTINCT city) as city_count,
      COUNT(*) as school_count
    FROM public.schools
    GROUP BY province
    ORDER BY school_count DESC
  `, {
    type: QueryTypes.SELECT
  });
};

// Full-text search menggunakan PostgreSQL
School.fullTextSearch = async function(searchTerm, limit = 20) {
  const { QueryTypes } = require('sequelize');
  const sequelize = require('../config/database');

  return sequelize.query(`
    SELECT
      id, name, city, province,
      ts_rank(to_tsvector('indonesian', name), plainto_tsquery('indonesian', :searchTerm)) as rank
    FROM public.schools
    WHERE to_tsvector('indonesian', name) @@ plainto_tsquery('indonesian', :searchTerm)
    ORDER BY rank DESC, name ASC
    LIMIT :limit
  `, {
    replacements: { searchTerm, limit },
    type: QueryTypes.SELECT
  });
};

// Class methods
School.associate = function(models) {
  // School has many UserProfiles
  School.hasMany(models.UserProfile, {
    foreignKey: 'school_id',
    as: 'userProfiles',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  });
};

module.exports = School;
