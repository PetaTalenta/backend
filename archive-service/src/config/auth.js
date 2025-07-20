/**
 * Authentication Configuration for Archive Service
 */

// JWT configuration
const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_in_production',
  algorithms: ['HS256'],
  credentialsRequired: true,
  requestProperty: 'user'
};

// Internal service authentication configuration
const serviceAuthConfig = {
  serviceKey: process.env.INTERNAL_SERVICE_KEY || 'internal_service_secret_key_change_in_production',
  headerName: 'X-Service-Key',
  internalServiceHeader: 'X-Internal-Service'
};

// Auth service configuration
const authServiceConfig = {
  url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  timeout: 5000 // 5 seconds
};

module.exports = {
  jwtConfig,
  serviceAuthConfig,
  authServiceConfig
};
