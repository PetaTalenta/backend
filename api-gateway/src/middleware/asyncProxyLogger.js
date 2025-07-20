const { logger } = require('./asyncLogger');

/**
 * Async proxy logging functions
 * Non-blocking logging for proxy operations
 */

/**
 * Log proxy request (async)
 */
const logProxyRequest = (serviceUrl, req) => {
  setImmediate(() => {
    logger.info({
      type: 'proxy_request',
      service: serviceUrl,
      method: req.method,
      url: req.url,
      userId: req.user?.id,
      userType: req.user?.user_type,
      isInternal: req.isInternalService,
      timestamp: new Date().toISOString()
    });
  });
};

/**
 * Log proxy response (async)
 */
const logProxyResponse = (serviceUrl, req, proxyRes, duration) => {
  setImmediate(() => {
    logger.info({
      type: 'proxy_response',
      service: serviceUrl,
      method: req.method,
      url: req.url,
      statusCode: proxyRes.statusCode,
      duration: duration,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
  });
};

/**
 * Log proxy error (async)
 */
const logProxyError = (serviceUrl, req, error) => {
  setImmediate(() => {
    logger.error({
      type: 'proxy_error',
      service: serviceUrl,
      method: req.method,
      url: req.url,
      error: error.message,
      code: error.code,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
  });
};

/**
 * Create enhanced proxy middleware with async logging
 */
const withAsyncLogging = (serviceUrl) => {
  return {
    onProxyReq: (proxyReq, req, res) => {
      // Log request asynchronously
      logProxyRequest(serviceUrl, req);
      
      // Store start time for duration calculation
      req._proxyStartTime = Date.now();
    },
    
    onProxyRes: (proxyRes, req, res) => {
      // Calculate duration
      const duration = req._proxyStartTime ? Date.now() - req._proxyStartTime : 0;
      
      // Log response asynchronously
      logProxyResponse(serviceUrl, req, proxyRes, duration);
    },
    
    onError: (err, req, res) => {
      // Log error asynchronously
      logProxyError(serviceUrl, req, err);
    }
  };
};

module.exports = {
  logProxyRequest,
  logProxyResponse,
  logProxyError,
  withAsyncLogging
};
