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
      .send({ jobId: 'job-123' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should validate body (missing jobId)', async () => {
    authService.verifyUser = jest.fn().mockResolvedValue({ id: userId, email: 'user@example.com', token_balance: 5 });
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', authHeader)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 404 if job not found', async () => {
    // Mock authService.verifyUser inside auth middleware chain
    authService.verifyUser = jest.fn().mockResolvedValue({ id: userId, email: 'user@example.com', token_balance: 5 });
    authService.deductTokens = jest.fn().mockResolvedValue({ token_balance: 4 });
    archiveService.getJobStatus.mockResolvedValue(null);

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', authHeader)
      .send({ jobId: 'job-123' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(archiveService.getJobStatus).toHaveBeenCalled();
  });

  it('should reject if job belongs to another user', async () => {
    authService.verifyUser = jest.fn().mockResolvedValue({ id: userId, email: 'user@example.com', token_balance: 5 });
    authService.deductTokens = jest.fn().mockResolvedValue({ token_balance: 4 });
    archiveService.getJobStatus.mockResolvedValue({
      job_id: 'job-123',
      user_id: 'other-user',
      result_id: 'result-123',
      status: 'failed'
    });

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', authHeader)
      .send({ jobId: 'job-123' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should reject if job has no result_id', async () => {
    authService.verifyUser = jest.fn().mockResolvedValue({ id: userId, email: 'user@example.com', token_balance: 5 });
    authService.deductTokens = jest.fn().mockResolvedValue({ token_balance: 4 });
    archiveService.getJobStatus.mockResolvedValue({
      job_id: 'job-123',
      user_id: userId,
      result_id: null,
      status: 'failed'
    });

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', authHeader)
      .send({ jobId: 'job-123' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NO_RESULT_DATA');
  });

  it('should reject if result has no test_data', async () => {
    authService.verifyUser = jest.fn().mockResolvedValue({ id: userId, email: 'user@example.com', token_balance: 5 });
    authService.deductTokens = jest.fn().mockResolvedValue({ token_balance: 4 });
    archiveService.getJobStatus.mockResolvedValue({
      job_id: 'job-123',
      user_id: userId,
      result_id: 'result-123',
      status: 'failed'
    });
    archiveService.getAnalysisResult.mockResolvedValue({
      id: 'result-123',
      user_id: userId,
      test_data: {},
      assessment_name: 'AI-Driven Talent Mapping'
    });

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', authHeader)
      .send({ jobId: 'job-123' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NO_ASSESSMENT_DATA');
  });

  it('should queue a retry successfully', async () => {
    authService.verifyUser = jest.fn().mockResolvedValue({ id: userId, email: 'user@example.com', token_balance: 5 });
    authService.deductTokens = jest.fn().mockResolvedValue({ token_balance: 4 });
    authService.refundTokens = jest.fn();

    // Mock job status
    archiveService.getJobStatus.mockResolvedValue({
      job_id: 'job-123',
      user_id: userId,
      result_id: 'result-123',
      status: 'failed'
    });

    // Mock existing result
    archiveService.getAnalysisResult.mockResolvedValue({
      id: 'result-123',
      user_id: userId,
      test_data: { riasec: { realistic: 3.2 }},
      assessment_name: 'AI-Driven Talent Mapping',
      chatbot_id: null,
      is_public: false
    });

    // Mock result update (clear test_result and set status to processing)
    archiveService.updateAnalysisResult.mockResolvedValue({
      id: 'result-123',
      user_id: userId,
      status: 'processing',
      test_result: null
    });

    // Mock job status update
    archiveService.updateJobStatus.mockResolvedValue({
      job_id: 'job-123',
      status: 'processing',
      result_id: 'result-123'
    });

    queueService.publishAssessmentJob.mockResolvedValue('job-123');
    queueService.getQueueStats.mockResolvedValue({ messageCount: 1, consumerCount: 0 });

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', authHeader)
      .send({ jobId: 'job-123' });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('jobId', 'job-123'); // same job ID
    expect(res.body.data).toHaveProperty('resultId', 'result-123'); // same result ID
    expect(archiveService.updateAnalysisResult).toHaveBeenCalledTimes(1);
    expect(archiveService.updateJobStatus).toHaveBeenCalledTimes(1);
    expect(queueService.publishAssessmentJob).toHaveBeenCalledTimes(1);

    // Verify that updateAnalysisResult was called with correct parameters
    expect(archiveService.updateAnalysisResult).toHaveBeenCalledWith('result-123', {
      status: 'processing',
      test_result: null,
      error_message: null
    });
  });
});
