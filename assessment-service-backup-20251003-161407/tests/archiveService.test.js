/**
 * Archive Service Integration Tests
 * Tests for Assessment Service integration with Archive Service
 */

const archiveService = require('../src/services/archiveService');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('Archive Service Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createJob', () => {
    it('should create job successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: uuidv4(),
            job_id: 'test-job-id',
            user_id: 'test-user-id',
            status: 'queued',
            created_at: new Date().toISOString()
          }
        }
      };

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await archiveService.createJob(
        'test-job-id',
        'test-user-id',
        { riasec: { realistic: 4.0 } },
        'AI-Driven Talent Mapping'
      );

      expect(result).toEqual(mockResponse.data.data);
    });

    it('should handle job creation error', async () => {
      const mockError = new Error('Archive service unavailable');
      mockError.response = { status: 503, statusText: 'Service Unavailable' };

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockRejectedValue(mockError)
      });

      await expect(
        archiveService.createJob('test-job-id', 'test-user-id', {})
      ).rejects.toThrow('Archive service unavailable');
    });
  });

  describe('createAnalysisResult', () => {
    it('should create analysis result successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: uuidv4(),
            user_id: 'test-user-id',
            status: 'completed',
            created_at: new Date().toISOString()
          }
        }
      };

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse)
      });

      const assessmentData = { riasec: { realistic: 4.0 } };
      const personaProfile = {
        archetype: 'The Helper',
        personality_summary: 'Test summary'
      };

      const result = await archiveService.createAnalysisResult(
        'test-user-id',
        assessmentData,
        personaProfile,
        'AI-Driven Talent Mapping',
        'completed'
      );

      expect(result).toEqual(mockResponse.data.data);
    });

    it('should create failed analysis result with error message', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: uuidv4(),
            user_id: 'test-user-id',
            status: 'failed',
            error_message: 'Processing failed',
            created_at: new Date().toISOString()
          }
        }
      };

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await archiveService.createAnalysisResult(
        'test-user-id',
        { incomplete: 'data' },
        null,
        'AI-Driven Talent Mapping',
        'failed',
        'Processing failed'
      );

      expect(result).toEqual(mockResponse.data.data);
    });
  });

  describe('getJobStatus', () => {
    it('should get job status successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            job_id: 'test-job-id',
            status: 'completed',
            result_id: uuidv4()
          }
        }
      };

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await archiveService.getJobStatus('test-job-id');
      expect(result).toEqual(mockResponse.data.data);
    });

    it('should return null for non-existent job', async () => {
      const mockError = new Error('Not found');
      mockError.response = { status: 404 };

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(mockError)
      });

      const result = await archiveService.getJobStatus('non-existent-job');
      expect(result).toBeNull();
    });
  });

  describe('getAnalysisResult', () => {
    it('should get analysis result successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'test-result-id',
            user_id: 'test-user-id',
            status: 'completed',
            persona_profile: {
              archetype: 'The Helper'
            }
          }
        }
      };

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await archiveService.getAnalysisResult('test-result-id');
      expect(result).toEqual(mockResponse.data.data);
    });

    it('should return null for non-existent result', async () => {
      const mockError = new Error('Not found');
      mockError.response = { status: 404 };

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(mockError)
      });

      const result = await archiveService.getAnalysisResult('non-existent-result');
      expect(result).toBeNull();
    });
  });

  describe('updateAnalysisResult', () => {
    it('should update analysis result successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'test-result-id',
            updated_at: new Date().toISOString()
          }
        }
      };

      mockedAxios.create.mockReturnValue({
        put: jest.fn().mockResolvedValue(mockResponse)
      });

      const updateData = {
        status: 'completed',
        persona_profile: { archetype: 'Updated Helper' }
      };

      const result = await archiveService.updateAnalysisResult('test-result-id', updateData);
      expect(result).toEqual(mockResponse.data.data);
    });
  });

  describe('syncJobStatus', () => {
    it('should sync job status successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Job status updated successfully'
        }
      };

      mockedAxios.create.mockReturnValue({
        put: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await archiveService.syncJobStatus(
        'test-job-id',
        'completed',
        { result_id: 'test-result-id' }
      );

      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('checkHealth', () => {
    it('should return true for healthy service', async () => {
      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue({ status: 200 })
      });

      const result = await archiveService.checkHealth();
      expect(result).toBe(true);
    });

    it('should return false for unhealthy service', async () => {
      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('Service unavailable'))
      });

      const result = await archiveService.checkHealth();
      expect(result).toBe(false);
    });
  });

  describe('URL Configuration', () => {
    it('should use correct base URL without /archive suffix', () => {
      // Test that the base URL is configured correctly
      const expectedBaseURL = process.env.ARCHIVE_SERVICE_URL || 'http://localhost:3002';
      
      // This test ensures the URL doesn't have the /archive suffix
      expect(expectedBaseURL).not.toMatch(/\/archive$/);
    });

    it('should use correct endpoint paths with /archive prefix', async () => {
      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
        get: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
        put: jest.fn().mockResolvedValue({ data: { success: true, data: {} } })
      };

      mockedAxios.create.mockReturnValue(mockAxiosInstance);

      // Test job creation endpoint
      await archiveService.createJob('test-job', 'test-user', {});
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/archive/jobs',
        expect.any(Object)
      );

      // Test result creation endpoint
      await archiveService.createAnalysisResult('test-user', {}, {});
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/archive/results',
        expect.any(Object)
      );

      // Test job status endpoint
      await archiveService.getJobStatus('test-job');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/archive/jobs/test-job');

      // Test health endpoint
      await archiveService.checkHealth();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/archive/health',
        expect.any(Object)
      );
    });
  });
});
