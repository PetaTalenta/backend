// Archive Service Unit Tests
const request = require('supertest');

// Mock dependencies before importing app
jest.mock('../src/services/resultsService', () => ({
  storeResult: jest.fn(),
  getResultById: jest.fn(),
  getUserResults: jest.fn(),
  updateResult: jest.fn(),
  deleteResult: jest.fn()
}));

jest.mock('../src/services/statsService', () => ({
  getUserStats: jest.fn(),
  getSystemStats: jest.fn()
}));

jest.mock('../src/models/AnalysisResult', () => ({
  findByPk: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn()
}));

jest.mock('../src/middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { userId: 'user-123' };
    next();
  },
  handleAuthError: (err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }
    next(err);
  }
}));

jest.mock('../src/middleware/serviceAuth', () => ({
  authenticateService: (req, res, next) => {
    req.service = { name: 'test-service' };
    next();
  },
  requireServiceAuth: (req, res, next) => {
    req.service = { name: 'test-service' };
    next();
  }
}));

jest.mock('../src/middleware/validation', () => ({
  validateQuery: () => (req, res, next) => next(),
  validateBody: () => (req, res, next) => next(),
  validateParams: () => (req, res, next) => next()
}));

jest.mock('../src/middleware/errorHandler', () => ({
  errorHandler: (err, req, res, next) => {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  },
  notFoundHandler: (req, res) => {
    res.status(404).json({ success: false, error: { message: 'Route not found' } });
  }
}));

const app = require('../src/app');
const resultsService = require('../src/services/resultsService');
const statsService = require('../src/services/statsService');

describe('Archive Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('POST /results (Internal Service)', () => {
    it('should create analysis result successfully', async () => {
      // Arrange
      const resultData = {
        userId: 'user-123',
        jobId: 'job-456',
        assessmentData: {
          riasec: { realistic: [4, 5, 3] },
          ocean: { openness: [4, 5, 3] }
        },
        personaProfile: {
          personality_summary: 'Test summary',
          career_recommendations: ['Engineer', 'Analyst']
        }
      };

      const mockStoredResult = {
        id: 'result-789',
        user_id: resultData.userId,
        job_id: resultData.jobId,
        assessment_data: resultData.assessmentData,
        persona_profile: resultData.personaProfile,
        status: 'completed',
        created_at: new Date()
      };

      resultsService.storeResult.mockResolvedValue(mockStoredResult);

      // Act
      const response = await request(app)
        .post('/archive/results')
        .set('X-Service-Key', process.env.INTERNAL_SERVICE_KEY || 'test_internal_service_key_for_local_testing')
        .set('X-Internal-Service', 'true')
        .send(resultData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          result: mockStoredResult
        }
      });

      expect(resultsService.storeResult).toHaveBeenCalledWith(resultData);
    });

    it('should handle unauthorized access', async () => {
      // Act
      const response = await request(app)
        .post('/archive/results')
        .send({
          userId: 'user-123',
          jobId: 'job-456'
        });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Unauthorized')
        }
      });
    });
  });

  describe('GET /results/:id', () => {
    it('should get result by ID successfully', async () => {
      // Arrange
      const resultId = 'result-123';
      const mockResult = {
        id: resultId,
        user_id: 'user-456',
        job_id: 'job-789',
        assessment_data: { riasec: { realistic: [4, 5, 3] } },
        persona_profile: { personality_summary: 'Test summary' },
        status: 'completed',
        created_at: new Date()
      };

      resultsService.getResultById.mockResolvedValue(mockResult);

      // Act
      const response = await request(app)
        .get(`/archive/results/${resultId}`)
        .set('Authorization', 'Bearer valid.jwt.token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          result: mockResult
        }
      });

      expect(resultsService.getResultById).toHaveBeenCalledWith(resultId, 'user-123');
    });

    it('should handle result not found', async () => {
      // Arrange
      const resultId = 'nonexistent-result';
      resultsService.getResultById.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .get(`/archive/results/${resultId}`)
        .set('Authorization', 'Bearer valid.jwt.token');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('not found')
        }
      });
    });
  });

  describe('GET /results', () => {
    it('should get user results with pagination', async () => {
      // Arrange
      const mockResults = {
        results: [
          {
            id: 'result-1',
            user_id: 'user-123',
            status: 'completed',
            created_at: new Date()
          },
          {
            id: 'result-2',
            user_id: 'user-123',
            status: 'completed',
            created_at: new Date()
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1
        }
      };

      resultsService.getUserResults.mockResolvedValue(mockResults);

      // Act
      const response = await request(app)
        .get('/archive/results?page=1&limit=10')
        .set('Authorization', 'Bearer valid.jwt.token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: mockResults
      });

      expect(resultsService.getUserResults).toHaveBeenCalledWith('user-123', {
        page: 1,
        limit: 10,
        status: undefined
      });
    });
  });

  describe('GET /stats/user', () => {
    it('should get user statistics', async () => {
      // Arrange
      const mockStats = {
        totalAssessments: 5,
        completedAssessments: 4,
        pendingAssessments: 1,
        averageCompletionTime: 120000,
        lastAssessmentDate: new Date()
      };

      statsService.getUserStats.mockResolvedValue(mockStats);

      // Act
      const response = await request(app)
        .get('/archive/stats/user')
        .set('Authorization', 'Bearer valid.jwt.token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          stats: mockStats
        }
      });

      expect(statsService.getUserStats).toHaveBeenCalledWith('user-123');
    });
  });

  describe('PUT /results/:id', () => {
    it('should update result successfully', async () => {
      // Arrange
      const resultId = 'result-123';
      const updateData = {
        status: 'completed',
        personaProfile: {
          personality_summary: 'Updated summary'
        }
      };

      const mockUpdatedResult = {
        id: resultId,
        user_id: 'user-456',
        status: 'completed',
        persona_profile: updateData.personaProfile,
        updated_at: new Date()
      };

      resultsService.updateResult.mockResolvedValue(mockUpdatedResult);

      // Act
      const response = await request(app)
        .put(`/archive/results/${resultId}`)
        .set('Authorization', 'Bearer valid.jwt.token')
        .send(updateData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          result: mockUpdatedResult
        }
      });

      expect(resultsService.updateResult).toHaveBeenCalledWith(resultId, 'user-123', updateData);
    });
  });

  describe('Health Checks', () => {
    it('should return health status', async () => {
      // Act
      const response = await request(app)
        .get('/health/live');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'archive-service'
      });
    });
  });
});
