/**
 * IdempotencyCache Model
 * Handles idempotency cache for preventing duplicate assessment submissions
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const IdempotencyCache = sequelize.define('IdempotencyCache', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  idempotency_key: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    field: 'idempotency_key'
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id'
  },
  request_hash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    field: 'request_hash'
  },
  response_data: {
    type: DataTypes.JSONB,
    allowNull: false,
    field: 'response_data'
  },
  status_code: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'status_code'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at'
  }
}, {
  tableName: 'idempotency_cache',
  schema: 'assessment',
  timestamps: false, // We handle timestamps manually
  indexes: [
    {
      unique: true,
      fields: ['idempotency_key']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['expires_at']
    }
  ]
});

/**
 * Find cached response by idempotency key
 * @param {string} idempotencyKey - The idempotency key
 * @returns {Promise<Object|null>} - Cached response or null
 */
IdempotencyCache.findByKey = async function(idempotencyKey) {
  return await this.findOne({
    where: {
      idempotency_key: idempotencyKey,
      expires_at: {
        [sequelize.Sequelize.Op.gt]: new Date()
      }
    }
  });
};

/**
 * Store response in cache
 * @param {string} idempotencyKey - The idempotency key
 * @param {string} userId - User ID
 * @param {string} requestHash - Hash of request data
 * @param {Object} responseData - Response data to cache
 * @param {number} statusCode - HTTP status code
 * @param {number} ttlHours - TTL in hours
 * @returns {Promise<Object>} - Created cache entry
 */
IdempotencyCache.storeResponse = async function(idempotencyKey, userId, requestHash, responseData, statusCode, ttlHours = 24) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + ttlHours);

  return await this.create({
    idempotency_key: idempotencyKey,
    user_id: userId,
    request_hash: requestHash,
    response_data: responseData,
    status_code: statusCode,
    expires_at: expiresAt
  });
};

/**
 * Clean up expired cache entries
 * @returns {Promise<number>} - Number of deleted entries
 */
IdempotencyCache.cleanupExpired = async function() {
  const result = await this.destroy({
    where: {
      expires_at: {
        [sequelize.Sequelize.Op.lt]: new Date()
      }
    }
  });
  return result;
};

/**
 * Clean up cache entries for a specific user (for cache size management)
 * @param {string} userId - User ID
 * @param {number} maxEntries - Maximum entries to keep
 * @returns {Promise<number>} - Number of deleted entries
 */
IdempotencyCache.cleanupUserCache = async function(userId, maxEntries = 10000) {
  // Get count of user's cache entries
  const count = await this.count({
    where: { user_id: userId }
  });

  if (count <= maxEntries) {
    return 0;
  }

  // Find oldest entries to delete
  const entriesToDelete = await this.findAll({
    where: { user_id: userId },
    order: [['created_at', 'ASC']],
    limit: count - maxEntries,
    attributes: ['id']
  });

  if (entriesToDelete.length === 0) {
    return 0;
  }

  const idsToDelete = entriesToDelete.map(entry => entry.id);
  const result = await this.destroy({
    where: {
      id: {
        [sequelize.Sequelize.Op.in]: idsToDelete
      }
    }
  });

  return result;
};

module.exports = IdempotencyCache;
