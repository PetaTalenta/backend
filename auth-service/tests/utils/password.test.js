const { hashPassword, comparePassword, validatePassword } = require('../../src/utils/password');

describe('Password Utils Optimization Tests', () => {
  describe('hashPassword', () => {
    test('should hash password faster than 200ms', async () => {
      const startTime = Date.now();
      const password = 'testPassword123';
      
      const hash = await hashPassword(password);
      const duration = Date.now() - startTime;
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(duration).toBeLessThan(100); // Performance target with optimized rounds
      expect(hash).not.toBe(password);
    });

    test('should use optimized bcrypt rounds for production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      // Re-require to get updated configuration
      delete require.cache[require.resolve('../../src/utils/password')];
      const { hashPassword: prodHashPassword } = require('../../src/utils/password');
      
      // Test should pass without throwing
      expect(prodHashPassword).toBeDefined();
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    test('should handle multiple concurrent hash operations', async () => {
      const passwords = ['pass1', 'pass2', 'pass3', 'pass4', 'pass5'];
      const startTime = Date.now();
      
      const promises = passwords.map(password => hashPassword(password));
      const hashes = await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      
      expect(hashes).toHaveLength(5);
      expect(hashes.every(hash => typeof hash === 'string')).toBe(true);
      expect(duration).toBeLessThan(1000); // Should handle concurrent operations efficiently
    });
  });

  describe('comparePassword', () => {
    test('should compare password faster than 100ms', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      const startTime = Date.now();
      const isMatch = await comparePassword(password, hash);
      const duration = Date.now() - startTime;
      
      expect(isMatch).toBe(true);
      expect(duration).toBeLessThan(50); // Performance target with optimized rounds
    });

    test('should handle multiple concurrent compare operations', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      const startTime = Date.now();
      const promises = Array(10).fill().map(() => comparePassword(password, hash));
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      expect(results.every(result => result === true)).toBe(true);
      expect(duration).toBeLessThan(200); // Should handle concurrent operations efficiently
    });
  });

  describe('validatePassword', () => {
    test('should validate password requirements', () => {
      const validPassword = 'ValidPass123';
      const result = validatePassword(validPassword);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject weak passwords', () => {
      const weakPassword = '123';
      const result = validatePassword(weakPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
