/**
 * Database Configuration for Archive Service
 * Connects to PostgreSQL database using Sequelize ORM
 */

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
  schema: process.env.DB_SCHEMA || 'archive',
  logging: process.env.NODE_ENV === 'development' ? 
    (msg) => logger.debug(msg) : false,
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '75'),     // Phase 2.3: Enhanced pool sizing
    min: parseInt(process.env.DB_POOL_MIN || '15'),     // Increased minimum connections
    acquire: parseInt(process.env.DB_POOL_ACQUIRE || '25000'), // Optimized timeout
    idle: parseInt(process.env.DB_POOL_IDLE || '15000'), // Reduced idle timeout for better turnover
    evict: parseInt(process.env.DB_POOL_EVICT || '3000'), // More frequent eviction for fresh connections
    handleDisconnects: true,
    retry: {
      max: 5  // Increased retry attempts
    }
  },
  define: {
    timestamps: true,
    underscored: true,
    schema: process.env.DB_SCHEMA || 'archive'
  }
};

// Create Sequelize instance
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
);

/**
 * Test database connection
 * @returns {Promise<boolean>} - Connection status
 */
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully', {
      host: config.host,
      port: config.port,
      database: config.database,
      schema: config.schema
    });
    return true;
  } catch (error) {
    logger.error('Unable to connect to database', {
      error: error.message,
      host: config.host,
      port: config.port,
      database: config.database
    });
    return false;
  }
};

/**
 * Initialize database connection
 * @returns {Promise<void>}
 */
const initialize = async () => {
  try {
    const isConnected = await testConnection();
    if (!isConnected) {
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Failed to connect to database, but continuing in development mode');
        logger.warn('Make sure to run the init-databases.sql script to set up the database');
        return;
      } else {
        throw new Error('Failed to connect to database');
      }
    }

    // Skip sync in development since we use init-databases.sql
    // Uncomment below if you want to use Sequelize migrations instead
    // if (process.env.NODE_ENV === 'development') {
    //   await sequelize.sync({ alter: false });
    //   logger.info('Database models synchronized');
    // }

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Database initialization failed', { error: error.message });
    if (process.env.NODE_ENV !== 'development') {
      throw error;
    } else {
      logger.warn('Continuing in development mode despite database error');
    }
  }
};

/**
 * Close database connection
 * @returns {Promise<void>}
 */
const close = async () => {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection', { error: error.message });
    throw error;
  }
};

module.exports = {
  sequelize,
  initialize,
  testConnection,
  close,
  config
};
