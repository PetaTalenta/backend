/**
 * School Model for Archive Service
 * Sequelize model for public.schools table (read-only access)
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const School = sequelize.define('School', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  province: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'created_at'
  }
}, {
  tableName: 'schools',
  schema: 'public', // Schools table is in public schema
  timestamps: false, // We don't want Sequelize to manage timestamps for read-only access
  underscored: true
});

// Instance methods
School.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  return values;
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
