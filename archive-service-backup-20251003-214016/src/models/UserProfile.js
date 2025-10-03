/**
 * UserProfile Model for Archive Service
 * Sequelize model for auth.user_profiles table (read-only access)
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserProfile = sequelize.define('UserProfile', {
  user_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
    field: 'user_id'
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'full_name'
  },
  school_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'school_id',
    references: {
      model: 'schools',
      key: 'id'
    }
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'date_of_birth'
  },
  gender: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'created_at'
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'updated_at'
  }
}, {
  tableName: 'user_profiles',
  schema: 'auth', // UserProfile is in auth schema
  timestamps: false, // We don't want Sequelize to manage timestamps for read-only access
  underscored: true
});

// Instance methods
UserProfile.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  return values;
};

// Class methods
UserProfile.associate = function(models) {
  // UserProfile belongs to School
  UserProfile.belongsTo(models.School, {
    foreignKey: 'school_id',
    as: 'school',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  });
};

module.exports = UserProfile;
