const jwt = require('jsonwebtoken');
const axios = require('axios');
const config = require('../config');

/**
 * Middleware untuk verifikasi JWT token
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Access token is required'
      });
    }
    
    const token = authHeader.substring(7);
    
    // Verifikasi token melalui auth service
    try {
      const response = await axios.post(`${config.services.auth}/auth/verify-token`, {
        token: token
      }, {
        timeout: config.healthCheck.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success && response.data.data.valid) {
        req.user = response.data.data.user;
        next();
      } else {
        return res.status(401).json({
          success: false,
          error: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        });
      }
    } catch (authError) {
      console.error('Token verification failed:', authError.message);
      return res.status(401).json({
        success: false,
        error: 'TOKEN_VERIFICATION_FAILED',
        message: 'Unable to verify token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Authentication service error'
    });
  }
};

/**
 * Middleware untuk verifikasi internal service key
 */
const verifyInternalService = (req, res, next) => {
  const serviceKey = req.headers['x-service-key'];
  const isInternalService = req.headers['x-internal-service'];
  
  if (!serviceKey || !isInternalService) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Internal service authentication required'
    });
  }
  
  if (serviceKey !== config.internalServiceKey) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_SERVICE_KEY',
      message: 'Invalid internal service key'
    });
  }
  
  req.isInternalService = true;
  next();
};

/**
 * Middleware untuk verifikasi admin role
 */
const verifyAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication required'
    });
  }
  
  if (req.user.user_type !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Admin access required'
    });
  }
  
  next();
};

/**
 * Optional auth middleware - tidak wajib ada token
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      await verifyToken(req, res, next);
    } catch (error) {
      // Jika token ada tapi invalid, tetap lanjut tanpa user
      req.user = null;
      next();
    }
  } else {
    req.user = null;
    next();
  }
};

module.exports = {
  verifyToken,
  verifyInternalService,
  verifyAdmin,
  optionalAuth
};
