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
  schema: process.env.DB_SCHEMA || 'assessment',
  logging: process.env.NODE_ENV === 'development' ?
    (msg) => logger.debug(msg) : false,
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '25'),
    min: parseInt(process.env.DB_POOL_MIN || '5'),
    acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000'),
    idle: parseInt(process.env.DB_POOL_IDLE || '20000'),
    evict: parseInt(process.env.DB_POOL_EVICT || '5000'),
    handleDisconnects: true,
    retry: {
      max: 3
    }
  },
  define: {
    timestamps: true,
    underscored: true,
    schema: process.env.DB_SCHEMA || 'assessment'
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
 */
const initialize = async() => {
  try {
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    logger.info('Database initialized successfully');
    return true;
  } catch (error) {
    logger.error('Database initialization failed', { error: error.message });
    throw error;
  }
};

/**
 * Close database connection
 */
const close = async() => {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection', { error: error.message });
    throw error;
  }
};

/**
 * Check database health
 */
const checkHealth = async() => {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    return false;
  }
};

module.exports = {
  sequelize,
  config,
  initialize,
  close,
  checkHealth,
  testConnection
};
