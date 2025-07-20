/**
 * Models Index for Archive Service
 * Exports all models and sets up associations
 */

const { sequelize } = require('../config/database');
const AnalysisResult = require('./AnalysisResult');
const AnalysisJob = require('./AnalysisJob');
const UserProfile = require('./UserProfile');
const School = require('./School');

// Initialize models
const models = {
  AnalysisResult,
  AnalysisJob,
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
