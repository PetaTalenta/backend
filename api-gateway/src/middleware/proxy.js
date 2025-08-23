const { createProxyMiddleware } = require('http-proxy-middleware');
const http = require('http');
const https = require('https');
const config = require('../config');
const { withAsyncLogging } = require('./asyncProxyLogger');

// HTTP Agent dengan connection pooling untuk optimisasi performa
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,        // Max concurrent connections per host
  maxFreeSockets: 10,    // Max idle connections per host
  timeout: 60000,         // Socket timeout increased for AI processing
  freeSocketTimeout: 30000 // Idle socket timeout
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  freeSocketTimeout: 30000
});

/**
 * Membuat proxy middleware untuk service tertentu dengan async logging
 */
const createServiceProxy = (serviceUrl, options = {}) => {
  // Get async logging handlers
  const asyncLogging = withAsyncLogging(serviceUrl);

  return createProxyMiddleware({
    target: serviceUrl,
    changeOrigin: true,
    timeout: 60000,          // Increased to 60s for AI processing
    proxyTimeout: 60000,     // Increased to 60s for AI processing
    agent: serviceUrl.startsWith('https') ? httpsAgent : httpAgent,

    // Additional timeout settings
    followRedirects: true,
    secure: false,

    // Optimize body handling - avoid double parsing
    parseReqBody: false,

    // Logging
    logLevel: config.nodeEnv === 'development' ? 'debug' : 'warn',

    // Error handling with async logging
    onError: (err, req, res) => {
      // Async error logging
      asyncLogging.onError(err, req, res);

      if (!res.headersSent) {
        let statusCode = 503;
        let errorCode = 'SERVICE_UNAVAILABLE';
        let message = 'Service temporarily unavailable';

        // Handle specific error types
        if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') {
          statusCode = 503;
          errorCode = 'SERVICE_UNAVAILABLE';
          message = 'Service connection failed';
        } else if (err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
          statusCode = 504;
          errorCode = 'GATEWAY_TIMEOUT';
          message = 'Service request timeout';
        }

        res.status(statusCode).json({
          success: false,
          error: errorCode,
          message: message,
          service: serviceUrl,
          timestamp: new Date().toISOString()
        });
      }
    },

    // Request modification with async logging
    onProxyReq: (proxyReq, req, res) => {
      // Async request logging
      asyncLogging.onProxyReq(proxyReq, req, res);

      // Essential headers only
      proxyReq.setHeader('X-Forwarded-For', req.ip);
      proxyReq.setHeader('X-Original-Host', req.get('host'));

      // User info (if available)
      if (req.user?.id) {
        proxyReq.setHeader('X-User-ID', req.user.id);
        proxyReq.setHeader('X-User-Email', req.user.email || 'unknown');
        proxyReq.setHeader('X-User-Type', req.user.user_type || 'user');
      }

      // Internal service flag
      if (req.isInternalService) {
        proxyReq.setHeader('X-Internal-Service', 'true');
      }

      // Let proxy handle body forwarding directly (avoid double parsing)
      // The parseReqBody: false setting handles this automatically
    },

    // Response modification with async logging
    onProxyRes: (proxyRes, req, res) => {
      // Async response logging
      asyncLogging.onProxyRes(proxyRes, req, res);

      // Minimal response headers
      proxyRes.headers['X-Gateway'] = 'ATMA-API-Gateway';
      proxyRes.headers['X-Gateway-Version'] = '1.0.0';
    },

    ...options
  });
};

/**
 * Proxy untuk Auth Service
 */
const authServiceProxy = createServiceProxy(config.services.auth, {
  pathRewrite: {
    '^/api/auth/health': '/health', // Health endpoint langsung ke /health
    '^/api/auth': '/auth', // Rewrite /api/auth to /auth
    '^/api/admin': '/admin' // Keep /admin prefix
  }
});

/**
 * Proxy untuk Archive Service
 */
const archiveServiceProxy = createServiceProxy(config.services.archive, {
  pathRewrite: {
    '^/api/archive/health': '/archive/health', // Health endpoint with archive prefix
    '^/api/archive/metrics': '/archive/metrics', // Metrics endpoints with archive prefix
    '^/api/archive/admin': '/archive/admin', // Admin endpoints with archive prefix
    '^/api/archive': '/archive' // Keep /archive prefix for all endpoints
  }
});

/**
 * Proxy untuk Assessment Service
 */
const assessmentServiceProxy = createServiceProxy(config.services.assessment, {
  pathRewrite: {
    '^/api/assessment/health/ready': '/health/ready', // Readiness probe
    '^/api/assessment/health/live': '/health/live',   // Liveness probe
    '^/api/assessment/health/queue': '/health/queue', // Queue health check
    '^/api/assessment/health': '/health',             // Main health endpoint
    '^/api/assessment/test/submit': '/test/submit',   // Development test submit
    '^/api/assessment/test/status': '/test/status',   // Development test status
    '^/api/assessment$': '/',                         // Root endpoint (exact match)
    '^/api/assessment': '/assessment'                 // Other assessment endpoints
  }
});

/**
 * Proxy untuk Notification Service dengan WebSocket Support
 */
const notificationServiceProxy = createServiceProxy(config.services.notification, {
  ws: true, // Enable WebSocket proxying
  pathRewrite: {
    '^/api/notifications/health': '/health',           // Health endpoint
    '^/api/notifications/debug': '/debug',             // Debug endpoints
    '^/api/notifications': '/notifications'           // Other notification endpoints
  }
});

/**
 * Proxy khusus untuk Socket.IO (tanpa path rewrite)
 */
const socketIOProxy = createServiceProxy(config.services.notification, {
  ws: true, // Enable WebSocket proxying
  // No path rewrite for Socket.IO - proxy langsung
});

/**
 * Proxy untuk Chatbot Service
 */
const chatbotServiceProxy = createServiceProxy(config.services.chatbot, {
  pathRewrite: {
    '^/api/chatbot/health': '/health',                                    // Health endpoint
    '^/api/chatbot/assessment/from-assessment': '/assessment/from-assessment',  // Assessment integration endpoint
    '^/api/chatbot/conversations/([^/]+)/suggestions': '/assessment/conversations/$1/suggestions', // Conversation suggestions
    '^/api/chatbot/auto-initialize': '/assessment/auto-initialize',       // Auto-initialize endpoint
    '^/api/chatbot/assessment-ready': '/assessment/assessment-ready',     // Assessment ready check
    '^/api/chatbot/conversations': '/conversations',                      // General conversations endpoint
    '^/api/chatbot$': '/',                                               // Root endpoint (exact match)
    '^/api/chatbot': ''                                                  // Remove /api/chatbot prefix for other endpoints
  }
});

module.exports = {
  createServiceProxy,
  authServiceProxy,
  archiveServiceProxy,
  assessmentServiceProxy,
  notificationServiceProxy,
  socketIOProxy,
  chatbotServiceProxy
};
