/**
 * Hash Generator Utility
 * Generates consistent hashes for idempotency keys and request data
 */

const crypto = require('crypto');
const logger = require('./logger');

/**
 * Generate SHA256 hash from string
 * @param {string} data - Data to hash
 * @returns {string} - SHA256 hash
 */
const generateSHA256 = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Generate idempotency key from request data
 * @param {string} userId - User ID
 * @param {Object} assessmentData - Assessment data
 * @param {string} timestamp - Optional timestamp (defaults to current hour)
 * @returns {string} - Generated idempotency key
 */
const generateIdempotencyKey = (userId, assessmentData, timestamp = null) => {
  try {
    // Use current hour as timestamp if not provided (for hourly uniqueness)
    const hourTimestamp = timestamp || new Date().toISOString().slice(0, 13);
    
    // Create consistent string representation of assessment data
    const dataString = JSON.stringify(assessmentData, Object.keys(assessmentData).sort());
    
    // Combine userId, data, and timestamp
    const combinedData = `${userId}:${dataString}:${hourTimestamp}`;
    
    // Generate hash
    const hash = generateSHA256(combinedData);
    
    logger.debug('Generated idempotency key', {
      userId,
      hourTimestamp,
      hashLength: hash.length,
      hash: hash.substring(0, 8) + '...' // Log only first 8 chars for security
    });
    
    return hash;
  } catch (error) {
    logger.error('Failed to generate idempotency key', {
      userId,
      error: error.message
    });
    throw new Error('Failed to generate idempotency key');
  }
};

/**
 * Generate request hash for caching
 * @param {Object} requestData - Complete request data
 * @returns {string} - Request hash
 */
const generateRequestHash = (requestData) => {
  try {
    // Create consistent string representation
    const dataString = JSON.stringify(requestData, Object.keys(requestData).sort());
    
    // Generate hash
    const hash = generateSHA256(dataString);
    
    logger.debug('Generated request hash', {
      hashLength: hash.length,
      hash: hash.substring(0, 8) + '...' // Log only first 8 chars
    });
    
    return hash;
  } catch (error) {
    logger.error('Failed to generate request hash', {
      error: error.message
    });
    throw new Error('Failed to generate request hash');
  }
};

/**
 * Validate idempotency key format
 * @param {string} key - Idempotency key to validate
 * @returns {boolean} - True if valid
 */
const validateIdempotencyKey = (key) => {
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  // Check length (max 255 characters as per database schema)
  if (key.length > 255) {
    return false;
  }
  
  // Check allowed characters (alphanumeric, hyphens, underscores)
  const allowedPattern = /^[a-zA-Z0-9\-_]+$/;
  return allowedPattern.test(key);
};

/**
 * Sanitize client-provided idempotency key
 * @param {string} key - Client-provided key
 * @returns {string|null} - Sanitized key or null if invalid
 */
const sanitizeIdempotencyKey = (key) => {
  if (!key || typeof key !== 'string') {
    return null;
  }
  
  // Trim whitespace
  const trimmed = key.trim();
  
  // Check if valid after trimming
  if (!validateIdempotencyKey(trimmed)) {
    return null;
  }
  
  return trimmed;
};

/**
 * Generate fallback idempotency key when client doesn't provide one
 * @param {string} userId - User ID
 * @param {Object} assessmentData - Assessment data
 * @returns {string} - Fallback idempotency key
 */
const generateFallbackKey = (userId, assessmentData) => {
  // Use a longer time window for fallback keys (daily instead of hourly)
  const dayTimestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return generateIdempotencyKey(userId, assessmentData, dayTimestamp);
};

module.exports = {
  generateSHA256,
  generateIdempotencyKey,
  generateRequestHash,
  validateIdempotencyKey,
  sanitizeIdempotencyKey,
  generateFallbackKey
};
