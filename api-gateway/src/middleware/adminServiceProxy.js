const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('../config');

const adminServiceProxy = createProxyMiddleware({
  target: process.env.ADMIN_SERVICE_URL || 'http://admin-service:3007',
  changeOrigin: true,
  pathRewrite: {
    '^/api/admin-service': '/admin-service'
  },
  onProxyReq: (proxyReq, req, res) => {
    // Forward internal service headers for internal calls
    proxyReq.setHeader('X-Internal-Service', 'true');
    proxyReq.setHeader('X-Service-Key', process.env.INTERNAL_SERVICE_KEY || config.internalServiceKey);
  }
});

module.exports = { adminServiceProxy };

