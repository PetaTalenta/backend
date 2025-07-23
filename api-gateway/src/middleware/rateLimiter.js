const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Rate limiter umum untuk semua endpoint
 * Updated to handle 1000+ concurrent users
 */
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: Math.max(config.rateLimit.maxRequests, 5000), // Minimum 5000 requests to handle mass testing
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,

  // Skip internal services
  skip: (req) => {
    return req.isInternalService === true;
  },

  // Custom key generator (bisa berdasarkan IP + user ID)
  keyGenerator: (req) => {
    if (req.user && req.user.id) {
      return `${req.ip}-${req.user.id}`;
    }
    return req.ip;
  }
});

/**
 * Rate limiter khusus untuk authentication endpoints
 * Updated to handle 1000+ concurrent users (register + login)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2500, // Allow 2500 requests per 15 minutes (enough for 1000+ users with register+login+profile updates)
  message: {
    success: false,
    error: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts, please try again later.',
    retryAfter: 900 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,

  skip: (req) => {
    return req.isInternalService === true;
  }
});

/**
 * Rate limiter khusus untuk assessment submission
 * Updated to handle mass testing scenarios
 */
const assessmentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Allow 1000 assessment submissions per hour for mass testing
  message: {
    success: false,
    error: 'ASSESSMENT_RATE_LIMIT_EXCEEDED',
    message: 'Too many assessment submissions, please try again later.',
    retryAfter: 3600 // 1 hour in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,

  skip: (req) => {
    return req.isInternalService === true;
  },

  keyGenerator: (req) => {
    if (req.user && req.user.id) {
      return `assessment-${req.user.id}`;
    }
    return `assessment-${req.ip}`;
  }
});

/**
 * Rate limiter khusus untuk admin endpoints
 * Updated to handle high-volume admin operations
 */
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Higher limit for admin users and mass operations
  message: {
    success: false,
    error: 'ADMIN_RATE_LIMIT_EXCEEDED',
    message: 'Too many admin requests, please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,

  skip: (req) => {
    return req.isInternalService === true;
  }
});

/**
 * Rate limiter khusus untuk archive endpoints
 * User endpoints have rate limiting, service endpoints do not
 */
const archiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Allow 2000 requests per 15 minutes for archive operations
  message: {
    success: false,
    error: 'ARCHIVE_RATE_LIMIT_EXCEEDED',
    message: 'Too many archive requests, please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,

  skip: (req) => {
    return req.isInternalService === true;
  },

  keyGenerator: (req) => {
    if (req.user && req.user.id) {
      return `archive-${req.user.id}`;
    }
    return `archive-${req.ip}`;
  }
});

/**
 * Rate limiter khusus untuk chatbot endpoints
 * Allows reasonable conversation limits for users
 */
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Allow 500 requests per 15 minutes for chat operations
  message: {
    success: false,
    error: 'CHAT_RATE_LIMIT_EXCEEDED',
    message: 'Too many chat requests, please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,

  skip: (req) => {
    return req.isInternalService === true;
  },

  keyGenerator: (req) => {
    if (req.user && req.user.id) {
      return `chat-${req.user.id}`;
    }
    return `chat-${req.ip}`;
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  assessmentLimiter,
  adminLimiter,
  archiveLimiter,
  chatLimiter
};
