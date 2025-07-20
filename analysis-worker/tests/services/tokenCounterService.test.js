/**
 * TokenCounterService Unit Tests
 */

const TokenCounterService = require('../../src/services/tokenCounterService');

// Mock logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('TokenCounterService', () => {
  let tokenCounterService;
  let mockClient;

  beforeEach(() => {
    tokenCounterService = new TokenCounterService();
    
    // Mock Gemini client
    mockClient = {
      models: {
        countTokens: jest.fn()
      }
    };

    // Reset environment variables
    process.env.GEMINI_INPUT_TOKEN_PRICE = '0.00015';
    process.env.GEMINI_OUTPUT_TOKEN_PRICE = '0.0006';
    process.env.CHAR_TO_TOKEN_RATIO = '4';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default pricing configuration', () => {
      const service = new TokenCounterService();
      expect(service.pricing.input).toBe(0.00015);
      expect(service.pricing.output).toBe(0.0006);
      expect(service.charToTokenRatio).toBe(4);
    });

    it('should use environment variables for pricing configuration', () => {
      process.env.GEMINI_INPUT_TOKEN_PRICE = '0.0002';
      process.env.GEMINI_OUTPUT_TOKEN_PRICE = '0.0008';
      process.env.CHAR_TO_TOKEN_RATIO = '3.5';

      const service = new TokenCounterService();
      expect(service.pricing.input).toBe(0.0002);
      expect(service.pricing.output).toBe(0.0008);
      expect(service.charToTokenRatio).toBe(3.5);
    });
  });

  describe('countInputTokens', () => {
    it('should successfully count tokens using Gemini API', async () => {
      const mockResponse = { totalTokens: 150 };
      mockClient.models.countTokens.mockResolvedValue(mockResponse);

      const result = await tokenCounterService.countInputTokens(
        mockClient, 
        'gemini-2.5-flash', 
        'Test prompt content',
        'test-job-123'
      );

      expect(result.success).toBe(true);
      expect(result.totalTokens).toBe(150);
      expect(result.inputTokens).toBe(150);
      expect(result.outputTokens).toBe(0);
      expect(result.model).toBe('gemini-2.5-flash');
      expect(result.timestamp).toBeDefined();
    });

    it('should handle array content format', async () => {
      const mockResponse = { totalTokens: 200 };
      mockClient.models.countTokens.mockResolvedValue(mockResponse);

      const arrayContent = [
        { role: 'user', parts: [{ text: 'Hello' }] },
        { role: 'user', parts: [{ text: 'World' }] }
      ];

      const result = await tokenCounterService.countInputTokens(
        mockClient, 
        'gemini-2.5-flash', 
        arrayContent,
        'test-job-123'
      );

      expect(result.success).toBe(true);
      expect(result.totalTokens).toBe(200);
      expect(mockClient.models.countTokens).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        contents: arrayContent
      });
    });

    it('should use fallback estimation when API fails', async () => {
      mockClient.models.countTokens.mockRejectedValue(new Error('API Error'));

      const result = await tokenCounterService.countInputTokens(
        mockClient, 
        'gemini-2.5-flash', 
        'Test content for fallback estimation',
        'test-job-123'
      );

      expect(result.success).toBe(false);
      expect(result.fallbackUsed).toBe(true);
      expect(result.error).toBe('API Error');
      expect(result.totalTokens).toBeGreaterThan(0);
      expect(result.estimationMethod).toBe('character_count');
    });

    it('should format string content correctly for API', async () => {
      const mockResponse = { totalTokens: 100 };
      mockClient.models.countTokens.mockResolvedValue(mockResponse);

      await tokenCounterService.countInputTokens(
        mockClient, 
        'gemini-2.5-flash', 
        'Simple string content',
        'test-job-123'
      );

      expect(mockClient.models.countTokens).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: 'Simple string content' }] }]
      });
    });
  });

  describe('extractUsageMetadata', () => {
    it('should extract complete usage metadata from response', async () => {
      const mockResponse = {
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 50,
          totalTokenCount: 150,
          thoughtsTokenCount: 10
        }
      };

      const result = await tokenCounterService.extractUsageMetadata(mockResponse, 'test-job-123');

      expect(result.success).toBe(true);
      expect(result.promptTokenCount).toBe(100);
      expect(result.candidatesTokenCount).toBe(50);
      expect(result.totalTokenCount).toBe(150);
      expect(result.thoughtsTokenCount).toBe(10);
      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(50);
      expect(result.totalTokens).toBe(150);
      expect(result.estimatedCost).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
    });

    it('should handle response without usage metadata', async () => {
      const mockResponse = {};

      const result = await tokenCounterService.extractUsageMetadata(mockResponse, 'test-job-123');

      expect(result.success).toBe(true);
      expect(result.promptTokenCount).toBe(0);
      expect(result.candidatesTokenCount).toBe(0);
      expect(result.totalTokenCount).toBe(0);
      expect(result.inputTokens).toBe(0);
      expect(result.outputTokens).toBe(0);
      expect(result.totalTokens).toBe(0);
      expect(result.estimatedCost).toBe(0);
    });

    it('should handle partial usage metadata', async () => {
      const mockResponse = {
        usageMetadata: {
          promptTokenCount: 75,
          totalTokenCount: 125
          // Missing candidatesTokenCount and thoughtsTokenCount
        }
      };

      const result = await tokenCounterService.extractUsageMetadata(mockResponse, 'test-job-123');

      expect(result.success).toBe(true);
      expect(result.promptTokenCount).toBe(75);
      expect(result.candidatesTokenCount).toBe(0);
      expect(result.totalTokenCount).toBe(125);
      expect(result.thoughtsTokenCount).toBe(0);
    });

    it('should handle extraction errors gracefully', async () => {
      // Pass invalid response that will cause error
      const result = await tokenCounterService.extractUsageMetadata(null, 'test-job-123');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.inputTokens).toBe(0);
      expect(result.outputTokens).toBe(0);
      expect(result.totalTokens).toBe(0);
      expect(result.estimatedCost).toBe(0);
    });
  });

  describe('getMockTokenCount', () => {
    it('should generate realistic mock token counts', async () => {
      const result = await tokenCounterService.getMockTokenCount('Test content for mocking', 'test-job-123');

      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
      expect(result.inputTokens).toBeGreaterThan(0);
      expect(result.outputTokens).toBeGreaterThan(0);
      expect(result.totalTokens).toBe(result.inputTokens + result.outputTokens);
      expect(result.estimatedCost).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
    });

    it('should handle array content for mock counting', async () => {
      const arrayContent = [
        { role: 'user', parts: [{ text: 'Hello world' }] },
        { role: 'user', parts: [{ text: 'This is a test' }] }
      ];

      const result = await tokenCounterService.getMockTokenCount(arrayContent, 'test-job-123');

      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
      expect(result.inputTokens).toBeGreaterThan(0);
      expect(result.outputTokens).toBeGreaterThan(0);
    });

    it('should include all required metadata fields', async () => {
      const result = await tokenCounterService.getMockTokenCount('Test', 'test-job-123');

      expect(result).toHaveProperty('promptTokenCount');
      expect(result).toHaveProperty('candidatesTokenCount');
      expect(result).toHaveProperty('totalTokenCount');
      expect(result.promptTokenCount).toBe(result.inputTokens);
      expect(result.candidatesTokenCount).toBe(result.outputTokens);
      expect(result.totalTokenCount).toBe(result.totalTokens);
    });
  });

  describe('calculateEstimatedCost', () => {
    it('should calculate cost correctly with default pricing', () => {
      const cost = tokenCounterService.calculateEstimatedCost(1000, 500);
      
      // Expected: (1000/1000 * 0.00015) + (500/1000 * 0.0006) = 0.00015 + 0.0003 = 0.00045
      expect(cost).toBe(0.00045);
    });

    it('should handle zero tokens', () => {
      const cost = tokenCounterService.calculateEstimatedCost(0, 0);
      expect(cost).toBe(0);
    });

    it('should round to 6 decimal places', () => {
      const cost = tokenCounterService.calculateEstimatedCost(1, 1);
      expect(cost.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(6);
    });

    it('should handle calculation errors gracefully', () => {
      // Test with invalid inputs
      const cost = tokenCounterService.calculateEstimatedCost(null, undefined);
      expect(cost).toBe(0);
    });
  });

  describe('_formatContentsForCounting', () => {
    it('should return array content as-is', () => {
      const arrayContent = [{ role: 'user', parts: [{ text: 'test' }] }];
      const result = tokenCounterService._formatContentsForCounting(arrayContent);
      expect(result).toBe(arrayContent);
    });

    it('should format string content correctly', () => {
      const result = tokenCounterService._formatContentsForCounting('test string');
      expect(result).toEqual([{ role: 'user', parts: [{ text: 'test string' }] }]);
    });

    it('should handle object content', () => {
      const objectContent = { role: 'user', parts: [{ text: 'test' }] };
      const result = tokenCounterService._formatContentsForCounting(objectContent);
      expect(result).toEqual([objectContent]);
    });

    it('should handle empty or null content', () => {
      const result = tokenCounterService._formatContentsForCounting(null);
      expect(result).toEqual([{ role: 'user', parts: [{ text: '' }] }]);
    });
  });

  describe('_estimateTokensFromContent', () => {
    it('should estimate tokens from string content', () => {
      const content = 'This is a test string with some content';
      const result = tokenCounterService._estimateTokensFromContent(content, 'test-job-123');
      
      const expectedTokens = Math.ceil(content.length / 4); // Default ratio is 4
      expect(result.totalTokens).toBe(expectedTokens);
      expect(result.inputTokens).toBe(expectedTokens);
      expect(result.outputTokens).toBe(0);
      expect(result.estimationMethod).toBe('character_count');
    });

    it('should estimate tokens from array content', () => {
      const content = [
        { role: 'user', parts: [{ text: 'Hello' }] },
        { role: 'user', parts: [{ text: 'World' }] }
      ];
      const result = tokenCounterService._estimateTokensFromContent(content, 'test-job-123');
      
      expect(result.totalTokens).toBeGreaterThan(0);
      expect(result.estimationMethod).toBe('character_count');
    });

    it('should handle estimation errors', () => {
      // Create a content that will cause JSON.stringify to fail
      const circularContent = {};
      circularContent.self = circularContent;
      
      const result = tokenCounterService._estimateTokensFromContent(circularContent, 'test-job-123');
      
      expect(result.totalTokens).toBe(0);
      expect(result.estimationMethod).toBe('fallback_zero');
    });
  });

  describe('_generateMockTokenCount', () => {
    it('should generate consistent mock data structure', () => {
      const result = tokenCounterService._generateMockTokenCount('test content');
      
      expect(result).toHaveProperty('inputTokens');
      expect(result).toHaveProperty('outputTokens');
      expect(result).toHaveProperty('totalTokens');
      expect(result).toHaveProperty('estimatedCost');
      expect(result).toHaveProperty('promptTokenCount');
      expect(result).toHaveProperty('candidatesTokenCount');
      expect(result).toHaveProperty('totalTokenCount');
      
      expect(result.totalTokens).toBe(result.inputTokens + result.outputTokens);
      expect(result.promptTokenCount).toBe(result.inputTokens);
      expect(result.candidatesTokenCount).toBe(result.outputTokens);
      expect(result.totalTokenCount).toBe(result.totalTokens);
    });

    it('should generate different values for different content', () => {
      const result1 = tokenCounterService._generateMockTokenCount('short');
      const result2 = tokenCounterService._generateMockTokenCount('this is a much longer content string that should generate different token counts');
      
      expect(result1.inputTokens).not.toBe(result2.inputTokens);
      expect(result2.inputTokens).toBeGreaterThan(result1.inputTokens);
    });

    it('should handle mock generation errors', () => {
      // Mock the _estimateTokensFromContent to throw an error
      const originalMethod = tokenCounterService._estimateTokensFromContent;
      tokenCounterService._estimateTokensFromContent = jest.fn().mockImplementation(() => {
        throw new Error('Estimation error');
      });

      const result = tokenCounterService._generateMockTokenCount('test');
      
      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(50);
      expect(result.totalTokens).toBe(150);
      
      // Restore original method
      tokenCounterService._estimateTokensFromContent = originalMethod;
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete token counting workflow', async () => {
      const mockResponse = { totalTokens: 200 };
      mockClient.models.countTokens.mockResolvedValue(mockResponse);

      // Count input tokens
      const inputResult = await tokenCounterService.countInputTokens(
        mockClient, 
        'gemini-2.5-flash', 
        'Test prompt',
        'test-job-123'
      );

      expect(inputResult.success).toBe(true);
      expect(inputResult.totalTokens).toBe(200);

      // Extract usage metadata
      const apiResponse = {
        usageMetadata: {
          promptTokenCount: 200,
          candidatesTokenCount: 100,
          totalTokenCount: 300
        }
      };

      const usageResult = await tokenCounterService.extractUsageMetadata(apiResponse, 'test-job-123');

      expect(usageResult.success).toBe(true);
      expect(usageResult.totalTokens).toBe(300);
      expect(usageResult.estimatedCost).toBeGreaterThan(0);
    });

    it('should handle mock workflow consistently', async () => {
      const mockResult = await tokenCounterService.getMockTokenCount('Test content', 'test-job-123');

      expect(mockResult.success).toBe(true);
      expect(mockResult.mock).toBe(true);
      expect(mockResult.totalTokens).toBeGreaterThan(0);
      expect(mockResult.estimatedCost).toBeGreaterThan(0);
    });
  });
});