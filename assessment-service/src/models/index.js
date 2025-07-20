/**
 * Models Index for Assessment Service
 * Exports all models and sets up associations
 */

const { sequelize } = require('../config/database');
const IdempotencyCache = require('./IdempotencyCache');

// Initialize models
const models = {
  IdempotencyCache,
  sequelize
};

// Set up associations if needed
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = models;
