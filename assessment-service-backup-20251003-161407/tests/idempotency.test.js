/**
 * Idempotency Feature Tests
 * Tests for idempotency middleware and service
 */

const request = require('supertest');
const app = require('../src/app');
const { generateIdempotencyKey, generateRequestHash, validateIdempotencyKey } = require('../src/utils/hashGenerator');
const idempotencyService = require('../src/services/idempotencyService');
const jwt = require('jsonwebtoken');

// Mock auth service
jest.mock('../src/services/authService', () => ({
  verifyToken: jest.fn().mockResolvedValue({
    id: 'test-user-123',
    email: 'test@example.com',
    tokenBalance: 10
  }),
  checkHealth: jest.fn().mockResolvedValue(true),
  refundTokens: jest.fn().mockResolvedValue(true)
}));

// Helper function to create valid JWT token for testing
const createTestToken = () => {
  return jwt.sign(
    {
      id: 'test-user-123',
      email: 'test@example.com',
      tokenBalance: 10
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

describe('Idempotency Feature', () => {
  
  describe('Hash Generator', () => {
    test('should generate consistent idempotency keys', () => {
      const userId = 'test-user-123';
      const assessmentData = { riasec: { realistic: 50 }, ocean: { openness: 60 } };
      const timestamp = '2024-01-01T10';
      
      const key1 = generateIdempotencyKey(userId, assessmentData, timestamp);
      const key2 = generateIdempotencyKey(userId, assessmentData, timestamp);
      
      expect(key1).toBe(key2);
      expect(key1).toHaveLength(64); // SHA256 hex length
    });

    test('should generate different keys for different data', () => {
      const userId = 'test-user-123';
      const data1 = { riasec: { realistic: 50 } };
      const data2 = { riasec: { realistic: 60 } };
      
      const key1 = generateIdempotencyKey(userId, data1);
      const key2 = generateIdempotencyKey(userId, data2);
      
      expect(key1).not.toBe(key2);
    });

    test('should generate consistent request hashes', () => {
      const requestData = { 
        riasec: { realistic: 50, investigative: 40 },
        ocean: { openness: 60, conscientiousness: 70 }
      };
      
      const hash1 = generateRequestHash(requestData);
      const hash2 = generateRequestHash(requestData);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    test('should validate idempotency keys correctly', () => {
      expect(validateIdempotencyKey('valid-key-123')).toBe(true);
      expect(validateIdempotencyKey('valid_key_456')).toBe(true);
      expect(validateIdempotencyKey('validkey789')).toBe(true);
      
      expect(validateIdempotencyKey('')).toBe(false);
      expect(validateIdempotencyKey(null)).toBe(false);
      expect(validateIdempotencyKey('invalid key with spaces')).toBe(false);
      expect(validateIdempotencyKey('invalid@key#with$symbols')).toBe(false);
      expect(validateIdempotencyKey('a'.repeat(256))).toBe(false); // Too long
    });
  });

  describe('Idempotency Service', () => {
    test('should extract client-provided idempotency key', () => {
      const req = {
        headers: {
          'idempotency-key': 'client-provided-key-123'
        }
      };
      const userId = 'test-user';
      const assessmentData = { test: 'data' };
      
      const key = idempotencyService.extractIdempotencyKey(req, userId, assessmentData);
      expect(key).toBe('client-provided-key-123');
    });

    test('should generate fallback key when no client key provided', () => {
      const req = { headers: {} };
      const userId = 'test-user';
      const assessmentData = { test: 'data' };
      
      const key = idempotencyService.extractIdempotencyKey(req, userId, assessmentData);
      expect(key).toBeDefined();
      expect(key).toHaveLength(64);
    });

    test('should handle invalid client keys gracefully', () => {
      const req = {
        headers: {
          'idempotency-key': 'invalid key with spaces!'
        }
      };
      const userId = 'test-user';
      const assessmentData = { test: 'data' };
      
      const key = idempotencyService.extractIdempotencyKey(req, userId, assessmentData);
      expect(key).toBeDefined();
      expect(key).toHaveLength(64); // Should fallback to generated key
    });
  });

  describe('API Integration', () => {
    const validAssessmentData = {
      riasec: {
        realistic: 50, investigative: 60, artistic: 40,
        social: 70, enterprising: 30, conventional: 45
      },
      ocean: {
        openness: 65, conscientiousness: 75, extraversion: 55,
        agreeableness: 80, neuroticism: 35
      },
      viaIs: {
        creativity: 70, curiosity: 80, judgment: 75, loveOfLearning: 85,
        perspective: 65, bravery: 60, perseverance: 90, honesty: 95,
        zest: 55, love: 85, kindness: 90, socialIntelligence: 75,
        teamwork: 80, fairness: 85, leadership: 60, forgiveness: 70,
        humility: 75, prudence: 65, selfRegulation: 70, appreciationOfBeauty: 60,
        gratitude: 85, hope: 75, humor: 65, spirituality: 50
      }
    };

    test('should add idempotency headers to responses', async () => {
      const response = await request(app)
        .post('/assessment/submit')
        .send(validAssessmentData)
        .expect(401); // Will fail auth but should still have headers

      expect(response.headers['x-idempotency-supported']).toBe('true');
      expect(response.headers['x-idempotency-ttl-hours']).toBeDefined();
    });

    test('should handle requests without authentication gracefully', async () => {
      const response = await request(app)
        .post('/assessment/submit')
        .send(validAssessmentData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should check idempotency health endpoint', async () => {
      const token = createTestToken();
      const response = await request(app)
        .get('/assessment/idempotency/health')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBeDefined();
    });

    test('should handle cleanup endpoint', async () => {
      const token = createTestToken();
      const response = await request(app)
        .post('/assessment/idempotency/cleanup')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.removedEntries).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty assessment data', () => {
      expect(() => {
        generateIdempotencyKey('user-123', {});
      }).not.toThrow();
    });

    test('should handle very large assessment data', () => {
      const largeData = {
        riasec: Object.fromEntries(Array.from({length: 100}, (_, i) => [`key${i}`, i])),
        ocean: Object.fromEntries(Array.from({length: 100}, (_, i) => [`key${i}`, i])),
        viaIs: Object.fromEntries(Array.from({length: 100}, (_, i) => [`key${i}`, i]))
      };
      
      expect(() => {
        generateIdempotencyKey('user-123', largeData);
      }).not.toThrow();
    });

    test('should handle special characters in user ID', () => {
      const userId = 'user-123-special@domain.com';
      const assessmentData = { test: 'data' };
      
      expect(() => {
        generateIdempotencyKey(userId, assessmentData);
      }).not.toThrow();
    });
  });
});

describe('Idempotency Middleware', () => {
  test('should process requests when idempotency is disabled', async () => {
    // Mock idempotency service to be disabled
    const originalIsEnabled = idempotencyService.isEnabled;
    idempotencyService.isEnabled = jest.fn().mockReturnValue(false);

    const response = await request(app)
      .post('/assessment/submit')
      .send({
        riasec: { realistic: 75, investigative: 85, artistic: 60, social: 50, enterprising: 70, conventional: 55 },
        ocean: { openness: 80, conscientiousness: 65, extraversion: 55, agreeableness: 45, neuroticism: 30 },
        viaIs: { creativity: 85, curiosity: 78, judgment: 70, loveOfLearning: 65, perspective: 75, bravery: 60, perseverance: 80, honesty: 90, zest: 70, love: 85, kindness: 88, socialIntelligence: 75, teamwork: 82, fairness: 85, leadership: 70, forgiveness: 75, humility: 65, prudence: 70, selfRegulation: 75, appreciationOfBeauty: 80, gratitude: 85, hope: 80, humor: 75, spirituality: 60 }
      })
      .expect(401); // Will fail auth but should still have headers

    expect(response.headers['x-idempotency-supported']).toBe('true');

    // Restore original method
    idempotencyService.isEnabled = originalIsEnabled;
  });
});
