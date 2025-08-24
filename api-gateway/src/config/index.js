require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Service URLs
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    archive: process.env.ARCHIVE_SERVICE_URL || 'http://localhost:3002',
    assessment: process.env.ASSESSMENT_SERVICE_URL || 'http://localhost:3003',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
    chatbot: process.env.CHATBOT_SERVICE_URL || 'http://localhost:3006',
    admin: process.env.ADMIN_SERVICE_URL || 'http://localhost:3007'
  },

  // Security
  jwt: {
    secret: process.env.JWT_SECRET || 'atma_secure_jwt_secret_key_f8a5b3c7d9e1f2a3b5c7d9e1f2a3b5c7'
  },

  internalServiceKey: process.env.INTERNAL_SERVICE_KEY || 'internal_service_secret_key_change_in_production',

  // Rate Limiting - Updated for high-volume testing
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 10 * 60 * 1000, // 10 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5000 // Increased from 1000 to 5000
  },

  // CORS - Allow all origins
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS === '*' ?
      '*' :
      (process.env.ALLOWED_ORIGINS ?
        process.env.ALLOWED_ORIGINS.split(',') :
        ['*']) // Default to allow all origins
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  },

  // Health Check
  healthCheck: {
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
    timeout: parseInt(process.env.SERVICE_TIMEOUT) || 30000
  }
};

module.exports = config;
