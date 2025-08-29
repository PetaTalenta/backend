const request = require('supertest');
const app = require('../src/app');

// Mocks
jest.mock('../src/services/archiveService');
jest.mock('../src/services/authService');
jest.mock('../src/services/queueService');

const archiveService = require('../src/services/archiveService');
const authService = require('../src/services/authService');
const queueService = require('../src/services/queueService');
const jwt = require('jsonwebtoken');

// Helper to create auth header
const signToken = (userId = 'user-123') => {
  const secret = process.env.JWT_SECRET || 'test_jwt_secret';
  return jwt.sign({ id: userId }, secret, { expiresIn: '1h' });
};

describe('POST /assessment/retry', () => {
  const endpoint = '/assessment/retry';
  const token = signToken();
  const authHeader = `Bearer ${token}`;
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANALYSIS_TOKEN_COST = '1';
  });

  it('should require authentication', async () => {
    const res = await request(app)
      .post(endpoint)
      .send({ resultId: 'b3f1d5b3-4b5d-4e4d-8c2d-9f8b7a6c5d4e' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should validate body (missing resultId)', async () => {
    authService.verifyUser = jest.fn().mockResolvedValue({ id: userId, email: 'user@example.com', token_balance: 5 });
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', authHeader)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 404 if result not found', async () => {
    // Mock authService.verifyUser inside auth middleware chain
    authService.verifyUser = jest.fn().mockResolvedValue({ id: userId, email: 'user@example.com', token_balance: 5 });
    authService.deductTokens = jest.fn().mockResolvedValue({ token_balance: 4 });
    archiveService.getAnalysisResult.mockResolvedValue(null);

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', authHeader)
      .send({ resultId: 'b3f1d5b3-4b5d-4e4d-8c2d-9f8b7a6c5d4e' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(archiveService.getAnalysisResult).toHaveBeenCalled();
  });

  it('should reject if result belongs to another user', async () => {
    authService.verifyUser = jest.fn().mockResolvedValue({ id: userId, email: 'user@example.com', token_balance: 5 });
    authService.deductTokens = jest.fn().mockResolvedValue({ token_balance: 4 });
    archiveService.getAnalysisResult.mockResolvedValue({ id: 'res1', user_id: 'other-user', assessment_data: { riasec: {} }, assessment_name: 'AI-Driven Talent Mapping' });

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', authHeader)
      .send({ resultId: 'b3f1d5b3-4b5d-4e4d-8c2d-9f8b7a6c5d4e' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should reject if result has no assessment_data', async () => {
    authService.verifyUser = jest.fn().mockResolvedValue({ id: userId, email: 'user@example.com', token_balance: 5 });
    authService.deductTokens = jest.fn().mockResolvedValue({ token_balance: 4 });
    archiveService.getAnalysisResult.mockResolvedValue({ id: 'res1', user_id: userId, assessment_data: {}, assessment_name: 'AI-Driven Talent Mapping' });

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', authHeader)
      .send({ resultId: 'b3f1d5b3-4b5d-4e4d-8c2d-9f8b7a6c5d4e' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NO_ASSESSMENT_DATA');
  });

  it('should queue a retry successfully', async () => {
    authService.verifyUser = jest.fn().mockResolvedValue({ id: userId, email: 'user@example.com', token_balance: 5 });
    authService.deductTokens = jest.fn().mockResolvedValue({ token_balance: 4 });
    authService.refundTokens = jest.fn();
    archiveService.getAnalysisResult.mockResolvedValue({ id: 'res1', user_id: userId, assessment_data: { riasec: { realistic: 3.2 }}, assessment_name: 'AI-Driven Talent Mapping' });
    archiveService.createJob.mockResolvedValue({ job_id: 'new-job' });
    queueService.publishAssessmentJob.mockResolvedValue('new-job');
    queueService.getQueueStats.mockResolvedValue({ messageCount: 1, consumerCount: 0 });

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', authHeader)
      .send({ resultId: 'b3f1d5b3-4b5d-4e4d-8c2d-9f8b7a6c5d4e' });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('jobId');
    expect(res.body.data).toHaveProperty('originalResultId');
    expect(queueService.publishAssessmentJob).toHaveBeenCalledTimes(1);
  });
});
