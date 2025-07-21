const cacheService = require('../../src/services/cacheService');

// Mock Redis to avoid actual Redis dependency in tests
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    ping: jest.fn(),
    info: jest.fn(),
    dbsize: jest.fn(),
    quit: jest.fn()
  }));
});

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('graceful fallback when Redis is unavailable', () => {
    test('should return null when cache is not connected', async () => {
      // Simulate Redis not connected
      cacheService.isConnected = false;
      
      const result = await cacheService.get('test-key');
      expect(result).toBeNull();
    });

    test('should return false when setting cache while not connected', async () => {
      // Simulate Redis not connected
      cacheService.isConnected = false;
      
      const result = await cacheService.set('test-key', 'test-value');
      expect(result).toBe(false);
    });

    test('should return false when deleting cache while not connected', async () => {
      // Simulate Redis not connected
      cacheService.isConnected = false;
      
      const result = await cacheService.del('test-key');
      expect(result).toBe(false);
    });

    test('should return false for isAvailable when not connected', () => {
      cacheService.isConnected = false;
      cacheService.redis = null;
      
      const result = cacheService.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe('health check', () => {
    test('should return disabled status when Redis is not initialized', async () => {
      cacheService.redis = null;
      
      const health = await cacheService.healthCheck();
      expect(health.status).toBe('disabled');
      expect(health.connected).toBe(false);
    });

    test('should handle connection errors gracefully', async () => {
      const error = new Error('ECONNREFUSED');
      error.code = 'ECONNREFUSED';

      cacheService.redis = {
        ping: jest.fn().mockRejectedValue(error)
      };

      const health = await cacheService.healthCheck();
      expect(health.status).toBe('unhealthy');
      expect(health.connected).toBe(false);
      expect(health.error).toBe('ECONNREFUSED');
    });
  });

  describe('connection error detection', () => {
    test('should detect connection errors correctly', () => {
      const connectionError = new Error('ECONNREFUSED');
      connectionError.code = 'ECONNREFUSED';
      
      const isConnectionError = cacheService.isConnectionError(connectionError);
      expect(isConnectionError).toBe(true);
    });

    test('should not detect non-connection errors as connection errors', () => {
      const otherError = new Error('Some other error');
      
      const isConnectionError = cacheService.isConnectionError(otherError);
      expect(isConnectionError).toBe(false);
    });
  });

  describe('key generation', () => {
    test('should generate keys with prefix', () => {
      const key = cacheService.generateKey('test');
      expect(key).toMatch(/^atma:auth:test$/);
    });
  });

  describe('cache operations with graceful error handling', () => {
    beforeEach(() => {
      cacheService.isConnected = true;
      cacheService.redis = {
        get: jest.fn(),
        setex: jest.fn(),
        set: jest.fn(),
        del: jest.fn()
      };
    });

    test('should handle get operation errors gracefully', async () => {
      cacheService.redis.get.mockRejectedValue(new Error('Connection lost'));
      
      const result = await cacheService.get('test-key');
      expect(result).toBeNull();
    });

    test('should handle set operation errors gracefully', async () => {
      cacheService.redis.setex.mockRejectedValue(new Error('Connection lost'));
      
      const result = await cacheService.set('test-key', 'test-value');
      expect(result).toBe(false);
    });

    test('should handle successful get operation', async () => {
      const testData = { test: 'data' };
      cacheService.redis.get.mockResolvedValue(JSON.stringify(testData));
      
      const result = await cacheService.get('test-key');
      expect(result).toEqual(testData);
    });

    test('should handle successful set operation', async () => {
      cacheService.redis.setex.mockResolvedValue('OK');
      
      const result = await cacheService.set('test-key', { test: 'data' }, 3600);
      expect(result).toBe(true);
    });
  });
});
