// Test setup file
process.env.NODE_ENV = 'test';
process.env.PORT = '3099';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.INTERNAL_SERVICE_KEY = 'test_internal_key';
process.env.AUTH_SERVICE_URL = 'http://localhost:3001';
process.env.ARCHIVE_SERVICE_URL = 'http://localhost:3002';
process.env.ASSESSMENT_SERVICE_URL = 'http://localhost:3003';

// Increase timeout for integration tests
jest.setTimeout(30000);
