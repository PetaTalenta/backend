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
    max: parseInt(process.env.DB_POOL_MAX || '100'),     // Phase 1: Enhanced pool sizing (naik dari 75 → 100)
    min: parseInt(process.env.DB_POOL_MIN || '20'),      // Increased minimum connections (naik dari 15 → 20)
    acquire: parseInt(process.env.DB_POOL_ACQUIRE || '20000'), // Optimized timeout (turun dari 25000 → 20000)
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

// Get connection pool status with error handling
const getPoolStatus = () => {
  try {
    const pool = sequelize.connectionManager.pool;
    if (!pool) {
      return {
        size: 0,
        available: 0,
        using: 0,
        waiting: 0,
        error: 'Pool not available'
      };
    }

    return {
      size: pool.size || 0,
      available: pool.available || 0,
      using: pool.using || 0,
      waiting: pool.waiting || 0
    };
  } catch (error) {
    logger.warn('Failed to get pool status', {
      error: error.message
    });
    return {
      size: 0,
      available: 0,
      using: 0,
      waiting: 0,
      error: error.message
    };
  }
};

// Monitor connection pool health with error handling
const monitorPoolHealth = () => {
  setInterval(() => {
    try {
      const poolStatus = getPoolStatus();

      // Skip monitoring if pool status has error
      if (poolStatus.error) {
        logger.debug('Pool monitoring skipped', {
          reason: poolStatus.error
        });
        return;
      }

      const utilizationRate = config.pool.max > 0
        ? (poolStatus.using / config.pool.max) * 100
        : 0;

      if (utilizationRate > 80) {
        logger.warn('High database pool utilization', {
          ...poolStatus,
          utilizationRate: `${utilizationRate.toFixed(2)}%`,
          maxConnections: config.pool.max
        });
      } else {
        logger.debug('Database pool status', {
          ...poolStatus,
          utilizationRate: `${utilizationRate.toFixed(2)}%`
        });
      }
    } catch (error) {
      logger.warn('Pool health monitoring failed', {
        error: error.message
      });
    }
  }, 30000); // Check every 30 seconds
};

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

    // Start pool monitoring if enabled
    if (process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
      monitorPoolHealth();
      logger.info('Database pool monitoring enabled');
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
  config,
  getPoolStatus
};
