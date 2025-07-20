/**
 * Token Counter Service
 * Provides token counting functionality using Gemini's countTokens API
 */

const logger = require('../utils/logger');

/**
 * TokenCounterService class for counting tokens and extracting usage metadata
 */
class TokenCounterService {
  constructor() {
    // Token pricing configuration (per 1K tokens)
    this.pricing = {
      input: parseFloat(process.env.GEMINI_INPUT_TOKEN_PRICE || '0.00015'), // $0.00015 per 1K input tokens
      output: parseFloat(process.env.GEMINI_OUTPUT_TOKEN_PRICE || '0.0006') // $0.0006 per 1K output tokens
    };

    // Character to token estimation ratio (approximate)
    this.charToTokenRatio = parseFloat(process.env.CHAR_TO_TOKEN_RATIO || '4'); // ~4 characters per token
  }

  /**
   * Count input tokens using Gemini's countTokens API
   * @param {Object} client - Gemini AI client
   * @param {String} model - Model name
   * @param {Array|String} contents - Content to count tokens for
   * @param {String} jobId - Job ID for logging
   * @returns {Promise<Object>} - Token count result
   */
  async countInputTokens(client, model, contents, jobId = null) {
    try {
      logger.debug('Counting input tokens', { 
        jobId, 
        model,
        contentType: Array.isArray(contents) ? 'array' : typeof contents,
        contentLength: Array.isArray(contents) ? contents.length : contents?.length || 0
      });

      // Prepare contents for token counting
      const formattedContents = this._formatContentsForCounting(contents);

      // Use Gemini's countTokens API
      const tokenCountResult = await client.models.countTokens({
        model: model,
        contents: formattedContents
      });

      const tokenCount = tokenCountResult.totalTokens || 0;

      logger.debug('Input token counting completed', {
        jobId,
        model,
        totalTokens: tokenCount
      });

      return {
        success: true,
        totalTokens: tokenCount,
        inputTokens: tokenCount,
        outputTokens: 0,
        model: model,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.warn('Failed to count input tokens using Gemini API', {
        jobId,
        model,
        error: error.message
      });

      // Fallback to character-based estimation
      const fallbackResult = this._estimateTokensFromContent(contents, jobId);
      return {
        success: false,
        error: error.message,
        fallbackUsed: true,
        ...fallbackResult,
        model: model,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Extract usage metadata from Gemini API response
   * @param {Object} response - Gemini API response
   * @param {String} jobId - Job ID for logging
   * @returns {Object} - Extracted usage metadata
   */
  async extractUsageMetadata(response, jobId = null) {
    try {
      logger.debug('Extracting usage metadata from API response', { jobId });

      // Extract usage metadata from response
      const usageMetadata = response.usageMetadata || {};
      
      const metadata = {
        success: true,
        promptTokenCount: usageMetadata.promptTokenCount || 0,
        candidatesTokenCount: usageMetadata.candidatesTokenCount || 0,
        totalTokenCount: usageMetadata.totalTokenCount || 0,
        thoughtsTokenCount: usageMetadata.thoughtsTokenCount || 0,
        inputTokens: usageMetadata.promptTokenCount || 0,
        outputTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0,
        timestamp: new Date().toISOString()
      };

      // Calculate estimated cost
      metadata.estimatedCost = this.calculateEstimatedCost(
        metadata.inputTokens, 
        metadata.outputTokens
      );

      logger.debug('Usage metadata extracted successfully', {
        jobId,
        inputTokens: metadata.inputTokens,
        outputTokens: metadata.outputTokens,
        totalTokens: metadata.totalTokens,
        estimatedCost: metadata.estimatedCost
      });

      return metadata;

    } catch (error) {
      logger.warn('Failed to extract usage metadata', {
        jobId,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get mock token count for testing scenarios
   * @param {Array|String} contents - Content to generate mock count for
   * @param {String} jobId - Job ID for logging
   * @returns {Promise<Object>} - Mock token count result
   */
  async getMockTokenCount(contents, jobId = null) {
    try {
      logger.debug('Generating mock token count', { jobId });

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate realistic mock token counts based on content
      const mockResult = this._generateMockTokenCount(contents);

      logger.debug('Mock token count generated', {
        jobId,
        inputTokens: mockResult.inputTokens,
        outputTokens: mockResult.outputTokens,
        totalTokens: mockResult.totalTokens
      });

      return {
        success: true,
        mock: true,
        ...mockResult,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to generate mock token count', {
        jobId,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Calculate estimated cost based on token usage
   * @param {Number} inputTokens - Number of input tokens
   * @param {Number} outputTokens - Number of output tokens
   * @returns {Number} - Estimated cost in USD
   */
  calculateEstimatedCost(inputTokens, outputTokens) {
    try {
      // Ensure inputs are valid numbers
      const validInputTokens = Number(inputTokens) || 0;
      const validOutputTokens = Number(outputTokens) || 0;

      const inputCost = (validInputTokens / 1000) * this.pricing.input;
      const outputCost = (validOutputTokens / 1000) * this.pricing.output;
      const totalCost = inputCost + outputCost;

      // Check for NaN or invalid results
      if (isNaN(totalCost) || !isFinite(totalCost)) {
        return 0;
      }

      return Math.round(totalCost * 1000000) / 1000000; // Round to 6 decimal places
    } catch (error) {
      logger.warn('Failed to calculate estimated cost', { error: error.message });
      return 0;
    }
  }

  /**
   * Format contents for token counting API
   * @param {Array|String} contents - Contents to format
   * @returns {Array} - Formatted contents array
   * @private
   */
  _formatContentsForCounting(contents) {
    if (Array.isArray(contents)) {
      return contents;
    }

    if (typeof contents === 'string') {
      return [{ role: 'user', parts: [{ text: contents }] }];
    }

    if (contents && typeof contents === 'object') {
      return [contents];
    }

    return [{ role: 'user', parts: [{ text: '' }] }];
  }

  /**
   * Estimate tokens from content using character count fallback
   * @param {Array|String} contents - Content to estimate
   * @param {String} jobId - Job ID for logging
   * @returns {Object} - Estimated token count
   * @private
   */
  _estimateTokensFromContent(contents, jobId = null) {
    try {
      let totalChars = 0;

      if (Array.isArray(contents)) {
        totalChars = contents.reduce((acc, content) => {
          if (typeof content === 'string') {
            return acc + content.length;
          }
          if (content && content.parts) {
            return acc + content.parts.reduce((partAcc, part) => {
              return partAcc + (part.text ? part.text.length : 0);
            }, 0);
          }
          return acc + JSON.stringify(content).length;
        }, 0);
      } else if (typeof contents === 'string') {
        totalChars = contents.length;
      } else {
        totalChars = JSON.stringify(contents).length;
      }

      const estimatedTokens = Math.ceil(totalChars / this.charToTokenRatio);

      logger.debug('Token estimation from character count', {
        jobId,
        totalChars,
        estimatedTokens,
        charToTokenRatio: this.charToTokenRatio
      });

      return {
        totalTokens: estimatedTokens,
        inputTokens: estimatedTokens,
        outputTokens: 0,
        estimatedCost: this.calculateEstimatedCost(estimatedTokens, 0),
        estimationMethod: 'character_count'
      };

    } catch (error) {
      logger.error('Failed to estimate tokens from content', {
        jobId,
        error: error.message
      });

      return {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCost: 0,
        estimationMethod: 'fallback_zero'
      };
    }
  }

  /**
   * Generate realistic mock token counts for testing
   * @param {Array|String} contents - Content to generate mock count for
   * @returns {Object} - Mock token count data
   * @private
   */
  _generateMockTokenCount(contents) {
    try {
      // Base estimation on content length
      const baseEstimate = this._estimateTokensFromContent(contents);
      
      // Add some realistic variation for mock data
      const variation = 0.1; // 10% variation
      const randomFactor = 1 + (Math.random() - 0.5) * variation;
      
      const inputTokens = Math.ceil(baseEstimate.inputTokens * randomFactor);
      
      // Mock output tokens (typical response size)
      const outputTokens = Math.ceil(inputTokens * 0.3 + Math.random() * 200); // 30% of input + random
      
      const totalTokens = inputTokens + outputTokens;
      const estimatedCost = this.calculateEstimatedCost(inputTokens, outputTokens);

      return {
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCost,
        promptTokenCount: inputTokens,
        candidatesTokenCount: outputTokens,
        totalTokenCount: totalTokens
      };

    } catch (error) {
      logger.error('Failed to generate mock token count', { error: error.message });
      
      return {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        estimatedCost: this.calculateEstimatedCost(100, 50),
        promptTokenCount: 100,
        candidatesTokenCount: 50,
        totalTokenCount: 150
      };
    }
  }
}

module.exports = TokenCounterService;