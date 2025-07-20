const sequelize = require('../config/database');
const User = require('./User');
const UserProfile = require('./UserProfile');
const School = require('./School');

// Initialize models
const models = {
  User,
  UserProfile,
  School,
  sequelize
};

// Set up associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = models;
