const jwt = require('jsonwebtoken');
const axios = require('axios');
const config = require('../config');

/**
 * Detect token type (JWT or Firebase)
 * @param {String} token - Token to detect
 * @returns {String} - 'jwt' or 'firebase'
 */
const detectTokenType = (token) => {
  try {
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded) {
      return 'firebase';
    }

    if (decoded.header && decoded.payload) {
      // Check if it's a Firebase token by looking at the issuer
      if (decoded.payload.iss && decoded.payload.iss.includes('securetoken.google.com')) {
        return 'firebase';
      }

      // Check if it has typical JWT fields from our auth-service
      if (decoded.payload.id || decoded.payload.userId) {
        return 'jwt';
      }
    }

    // Default to firebase for longer tokens
    if (token.length > 500) {
      return 'firebase';
    }

    return 'jwt';
  } catch (error) {
    return 'firebase';
  }
};

/**
 * Middleware untuk verifikasi token (supports both JWT and Firebase)
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
    const tokenType = detectTokenType(token);

    console.log(`Token type detected: ${tokenType}`);

    // Try Firebase token verification first (auth-v2-service)
    try {
      const authV2Url = config.services.authV2 || process.env.AUTH_V2_SERVICE_URL || 'http://auth-v2-service:3008';
      const response = await axios.post(`${authV2Url}/v1/token/verify`, {
        token: token
      }, {
        timeout: config.healthCheck.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success && response.data.data.valid && response.data.data.user) {
        req.user = response.data.data.user;
        req.tokenType = 'firebase';
        console.log(`Firebase token verified for user: ${req.user.email}`);
        return next();
      }
    } catch (firebaseError) {
      console.log('Firebase token verification failed, trying JWT fallback:', firebaseError.message);
    }

    // Fallback to JWT token verification (old auth-service)
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
        req.tokenType = 'jwt';
        console.log(`JWT token verified for user: ${req.user.email}`);
        return next();
      }
    } catch (jwtError) {
      console.error('JWT token verification also failed:', jwtError.message);
    }

    // Both verifications failed
    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Invalid or expired token'
    });
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

  // Accept admin, superadmin, and moderator roles as admin access
  const adminRoles = ['admin', 'superadmin', 'moderator'];
  if (!adminRoles.includes(req.user.user_type)) {
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
