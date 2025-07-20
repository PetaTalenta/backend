const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'atma_db',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  dialect: process.env.DB_DIALECT || 'postgres',
  schema: process.env.DB_SCHEMA || 'auth',
  logging: process.env.NODE_ENV === 'development' ?
    (msg) => logger.debug(msg) : false,
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '50'),     // Increased from 25 to 50 for higher concurrency
    min: parseInt(process.env.DB_POOL_MIN || '10'),     // Increased minimum connections
    acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000'), // Reduced timeout for faster failure
    idle: parseInt(process.env.DB_POOL_IDLE || '20000'), // Reduced idle timeout for better turnover
    evict: parseInt(process.env.DB_POOL_EVICT || '5000'), // More frequent eviction for fresh connections
    handleDisconnects: true,
    retry: {
      max: 3
    }
  },
  define: {
    timestamps: true,
    underscored: true,
    schema: process.env.DB_SCHEMA || 'auth'
  }
};

// Create Sequelize instance
const sequelize = new Sequelize(config);

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully', {
      host: config.host,
      database: config.database,
      schema: config.schema
    });
    return true;
  } catch (error) {
    logger.error('Unable to connect to the database', {
      error: error.message,
      host: config.host,
      database: config.database
    });
    return false;
  }
};

// Initialize database connection but don't throw error
// This allows the service to start even if the database is not available
testConnection();

module.exports = sequelize;
module.exports.testConnection = testConnection;
