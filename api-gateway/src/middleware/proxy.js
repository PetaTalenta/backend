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
  timeout: 5000,         // Socket timeout
  freeSocketTimeout: 30000 // Idle socket timeout
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 5000,
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
    timeout: 5000,          // Reduced from 30s to 5s
    proxyTimeout: 5000,     // Reduced from 30s to 5s
    agent: serviceUrl.startsWith('https') ? httpsAgent : httpAgent,

    // Additional timeout settings
    followRedirects: true,
    secure: false,

    // Optimize body handling - avoid double parsing
    parseReqBody: false,
    buffer: require('stream').PassThrough,

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
    '^/api/archive/health': '/health', // Health endpoint langsung ke /health
    '^/api/archive': '/archive' // Keep /archive prefix
  }
});

/**
 * Proxy untuk Assessment Service
 */
const assessmentServiceProxy = createServiceProxy(config.services.assessment, {
  pathRewrite: {
    '^/api/assessment/health': '/health', // Health endpoint langsung ke /health
    '^/api/assessment': '/assessments' // Rewrite to /assessments (plural) sesuai dokumentasi
  }
});

module.exports = {
  createServiceProxy,
  authServiceProxy,
  archiveServiceProxy,
  assessmentServiceProxy
};
