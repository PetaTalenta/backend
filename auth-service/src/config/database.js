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
    max: parseInt(process.env.DB_POOL_MAX || '25'),     // Reduced from 50 for stability
    min: parseInt(process.env.DB_POOL_MIN || '5'),      // Reduced minimum connections
    acquire: parseInt(process.env.DB_POOL_ACQUIRE || '60000'), // Increased timeout
    idle: parseInt(process.env.DB_POOL_IDLE || '30000'), // Increased idle timeout
    evict: parseInt(process.env.DB_POOL_EVICT || '10000'), // Increased eviction time
    handleDisconnects: true
    // Removed validate and retry as they may cause compatibility issues
  },
  define: {
    timestamps: true,
    underscored: true,
    schema: process.env.DB_SCHEMA || 'auth'
  }
};

// Create Sequelize instance
const sequelize = new Sequelize(config);

// Test database connection with health monitoring
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully', {
      host: config.host,
      database: config.database,
      schema: config.schema,
      poolConfig: {
        max: config.pool.max,
        min: config.pool.min,
        acquire: config.pool.acquire,
        idle: config.pool.idle
      }
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

// Initialize database connection but don't throw error
// This allows the service to start even if the database is not available
testConnection().then(connected => {
  if (connected && process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
    monitorPoolHealth();
  }
});

module.exports = sequelize;
module.exports.testConnection = testConnection;
module.exports.getPoolStatus = getPoolStatus;
