const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('../config');

/**
 * Membuat proxy middleware untuk service tertentu
 */
const createServiceProxy = (serviceUrl, options = {}) => {
  return createProxyMiddleware({
    target: serviceUrl,
    changeOrigin: true,
    timeout: config.healthCheck.timeout,
    proxyTimeout: config.healthCheck.timeout,

    // Additional timeout settings
    followRedirects: true,
    secure: false,

    // Parse body as buffer to avoid conflicts
    parseReqBody: false,

    // Logging
    logLevel: config.nodeEnv === 'development' ? 'debug' : 'warn',
    
    // Error handling
    onError: (err, req, res) => {
      console.error(`Proxy error for ${req.url}:`, {
        error: err.message,
        code: err.code,
        service: serviceUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });

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
    
    // Request modification
    onProxyReq: (proxyReq, req, res) => {
      // Log request
      console.log(`Proxying ${req.method} ${req.url} to ${serviceUrl}`);

      // Add original IP
      proxyReq.setHeader('X-Forwarded-For', req.ip);
      proxyReq.setHeader('X-Original-Host', req.get('host'));

      // Forward user info if available
      if (req.user) {
        proxyReq.setHeader('X-User-ID', req.user.id);
        proxyReq.setHeader('X-User-Type', req.user.user_type || 'user');
      }

      // Forward internal service flag
      if (req.isInternalService) {
        proxyReq.setHeader('X-Internal-Service', 'true');
      }

      // Handle body forwarding for POST/PUT/PATCH requests
      if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') && req.body) {
        const bodyData = JSON.stringify(req.body);

        // Update headers
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));

        // Write the body data
        proxyReq.write(bodyData);
        proxyReq.end();

        console.log(`Forwarding body data: ${bodyData}`);
      }
    },
    
    // Response modification
    onProxyRes: (proxyRes, req, res) => {
      // Add gateway headers
      proxyRes.headers['X-Gateway'] = 'ATMA-API-Gateway';
      proxyRes.headers['X-Gateway-Version'] = '1.0.0';
      
      // Log response
      console.log(`Response from ${serviceUrl}: ${proxyRes.statusCode}`);
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
