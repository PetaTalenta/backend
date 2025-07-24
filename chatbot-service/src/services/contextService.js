const axios = require('axios');
const { Conversation, Message } = require('../models');
const logger = require('../utils/logger');

/**
 * ContextService for managing conversation context and assessment integration
 * Handles assessment data retrieval, context building, and optimization
 */
class ContextService {
  constructor() {
    this.archiveServiceUrl = process.env.ARCHIVE_SERVICE_URL || 'http://localhost:3002';
    this.internalServiceKey = process.env.INTERNAL_SERVICE_KEY;
    this.maxContextTokens = parseInt(process.env.MAX_CONVERSATION_HISTORY_TOKENS || '6000');

    // Assessment context cache
    this.assessmentCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Build complete conversation context for AI
   * @param {string} conversationId - Conversation ID
   * @param {Object} options - Context building options
   * @returns {Array} Array of message objects for AI
   */
  async buildConversationContext(conversationId, options = {}) {
    try {
      const conversation = await Conversation.findByPk(conversationId);
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      logger.info('Building conversation context', {
        conversationId,
        contextType: conversation.context_type,
        hasContextData: !!conversation.context_data
      });

      // Get system prompt based on context type
      let systemPrompt = this.getSystemPrompt(conversation.context_type);
      
      // Add assessment context if available
      if (conversation.context_type === 'assessment' && conversation.context_data) {
        let assessmentContext = '';

        // Use result_id if available (new method), otherwise fall back to assessment_id (legacy)
        if (conversation.context_data.result_id) {
          assessmentContext = await this.getAssessmentContextByResultId(conversation.context_data);
        } else if (conversation.context_data.assessment_id) {
          assessmentContext = await this.getAssessmentContext(conversation.context_data);
        }

        if (assessmentContext) {
          systemPrompt += `\n\nUser Assessment Context:\n${assessmentContext}`;
        }
      }

      // Get conversation history
      const messages = await this.getConversationHistory(conversationId, options);

      // Build context array
      const context = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];

      logger.info('Context built successfully', {
        conversationId,
        systemPromptLength: systemPrompt.length,
        messageCount: messages.length,
        totalContextItems: context.length
      });

      return context;
    } catch (error) {
      logger.error('Error building conversation context', {
        conversationId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get system prompt based on context type
   * @param {string} contextType - Type of conversation context
   * @returns {string} System prompt
   */
  getSystemPrompt(contextType) {
    const prompts = {
      general: `You are a helpful career counseling AI assistant. Provide thoughtful, actionable career guidance based on the user's questions and context. Be supportive, professional, and focus on practical advice.`,
      
      assessment: `You are an expert career advisor AI with access to the user's comprehensive personality and career assessment results.

Your role:
- Provide personalized career guidance based on their RIASEC interests, Big Five personality traits, and VIA Character Strengths
- Explain how their traits translate to career opportunities and work environments
- Suggest specific career paths, development areas, and actionable next steps
- Help them understand their unique strengths and how to leverage them
- Reference their specific assessment results when relevant and helpful
- Be encouraging, insightful, and provide concrete, actionable recommendations

Always be supportive, professional, and focus on helping them make informed career decisions based on their unique personality profile.`,
      
      career_guidance: `You are a specialized career guidance AI focused on helping users make informed career decisions through detailed analysis and personalized recommendations. Provide strategic career advice and actionable insights.`
    };

    return prompts[contextType] || prompts.general;
  }

  /**
   * Get assessment context from assessment data using result ID
   * @param {Object} contextData - Context data containing result_id
   * @returns {string} Formatted assessment context
   */
  async getAssessmentContextByResultId(contextData) {
    if (!contextData.result_id) {
      return '';
    }

    try {
      // Check cache first
      const cacheKey = `assessment_result_${contextData.result_id}`;
      const cached = this.assessmentCache.get(cacheKey);

      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        logger.info('Using cached assessment data', {
          resultId: contextData.result_id
        });
        return cached.context;
      }

      // Fetch assessment data from archive service using result ID
      const assessmentData = await this.fetchAssessmentDataByResultId(contextData.result_id);

      if (!assessmentData) {
        return '';
      }

      // Summarize assessment data for context
      const context = this.summarizeAssessmentData(assessmentData);

      // Cache the result
      this.assessmentCache.set(cacheKey, {
        context,
        timestamp: Date.now()
      });

      logger.info('Assessment context generated', {
        resultId: contextData.result_id,
        contextLength: context.length
      });

      return context;
    } catch (error) {
      logger.error('Error getting assessment context', {
        resultId: contextData.result_id,
        error: error.message
      });
      return '';
    }
  }

  /**
   * Get assessment context from assessment data (legacy method for backward compatibility)
   * @param {Object} contextData - Context data containing assessment information
   * @returns {string} Formatted assessment context
   * @deprecated Use getAssessmentContextByResultId instead
   */
  async getAssessmentContext(contextData) {
    if (!contextData.assessment_id) {
      return '';
    }

    try {
      // Check cache first
      const cacheKey = `assessment_${contextData.assessment_id}`;
      const cached = this.assessmentCache.get(cacheKey);

      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        logger.info('Using cached assessment data', {
          assessmentId: contextData.assessment_id
        });
        return cached.context;
      }

      // Fetch assessment data from archive service
      const assessmentData = await this.fetchAssessmentData(contextData.assessment_id);

      if (!assessmentData) {
        return '';
      }

      // Summarize assessment data for context
      const context = this.summarizeAssessmentData(assessmentData);

      // Cache the result
      this.assessmentCache.set(cacheKey, {
        context,
        timestamp: Date.now()
      });

      logger.info('Assessment context generated', {
        assessmentId: contextData.assessment_id,
        contextLength: context.length
      });

      return context;
    } catch (error) {
      logger.error('Error getting assessment context', {
        assessmentId: contextData.assessment_id,
        error: error.message
      });
      return '';
    }
  }

  /**
   * Fetch assessment data from archive service using result ID
   * @param {string} resultId - Analysis result ID
   * @returns {Object} Assessment data
   */
  async fetchAssessmentDataByResultId(resultId) {
    try {
      const response = await axios.get(
        `${this.archiveServiceUrl}/archive/results/${resultId}`,
        {
          headers: {
            'X-Internal-Service': 'true',
            'X-Service-Key': this.internalServiceKey,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      logger.warn('Assessment data not found or invalid response', {
        resultId,
        success: response.data.success
      });
      return null;
    } catch (error) {
      logger.error('Failed to fetch assessment data', {
        resultId,
        error: error.message,
        status: error.response?.status
      });
      return null;
    }
  }

  /**
   * Fetch assessment data from archive service (legacy method for backward compatibility)
   * @param {string} assessmentId - Assessment ID (will be treated as result ID)
   * @returns {Object} Assessment data
   * @deprecated Use fetchAssessmentDataByResultId instead
   */
  async fetchAssessmentData(assessmentId) {
    logger.warn('fetchAssessmentData is deprecated, use fetchAssessmentDataByResultId instead', {
      assessmentId
    });
    return this.fetchAssessmentDataByResultId(assessmentId);
  }

  /**
   * Get user's latest assessment from archive service
   * @param {string} userId - User ID
   * @returns {Object|null} Latest assessment data or null
   */
  async getUserLatestAssessment(userId) {
    try {
      const response = await axios.get(
        `${this.archiveServiceUrl}/archive/results`,
        {
          params: {
            page: 1,
            limit: 1,
            status: 'completed',
            sort: 'created_at',
            order: 'desc'
          },
          headers: {
            'X-Internal-Service': 'true',
            'X-Service-Key': this.internalServiceKey,
            'Content-Type': 'application/json',
            'Authorization': `Bearer internal-service-token`, // For internal service access
            'X-User-ID': userId // Pass user ID for filtering
          },
          timeout: 10000
        }
      );

      if (response.data.success && response.data.data.results && response.data.data.results.length > 0) {
        const latestResult = response.data.data.results[0];

        // Verify the result belongs to the user (double check)
        if (latestResult.user_id === userId) {
          logger.info('Latest assessment found for user', {
            userId,
            resultId: latestResult.id,
            assessmentName: latestResult.assessment_name,
            createdAt: latestResult.created_at
          });
          return latestResult;
        } else {
          logger.warn('Latest assessment does not belong to user', {
            userId,
            assessmentUserId: latestResult.user_id
          });
          return null;
        }
      }

      logger.info('No completed assessments found for user', { userId });
      return null;
    } catch (error) {
      logger.error('Failed to fetch user latest assessment', {
        userId,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      return null;
    }
  }

  /**
   * Validate user access to specific assessment result
   * @param {string} userId - User ID
   * @param {string} resultId - Assessment result ID
   * @returns {Object|null} Assessment data if user has access, null otherwise
   */
  async validateUserAssessmentAccess(userId, resultId) {
    try {
      const assessmentData = await this.fetchAssessmentDataByResultId(resultId);

      if (!assessmentData) {
        logger.warn('Assessment not found', { userId, resultId });
        return null;
      }

      // Verify user owns this assessment
      if (assessmentData.user_id !== userId) {
        logger.warn('Assessment access denied: user does not own this result', {
          userId,
          resultId,
          assessmentUserId: assessmentData.user_id
        });
        return null;
      }

      return assessmentData;
    } catch (error) {
      logger.error('Error validating user assessment access', {
        userId,
        resultId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Summarize assessment data for AI context
   * @param {Object} assessmentData - Complete assessment data
   * @returns {string} Summarized context
   */
  summarizeAssessmentData(assessmentData) {
    try {
      const { riasec, ocean, viaIs, personaProfile } = assessmentData;
      
      if (!riasec || !ocean || !viaIs) {
        return 'Assessment data incomplete.';
      }

      // Get top RIASEC interests (top 3)
      const topRiasec = Object.entries(riasec)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([type, score]) => `${type}: ${score.toFixed(1)}`)
        .join(', ');

      // Get top Big Five traits (top 3)
      const topOcean = Object.entries(ocean)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([trait, score]) => `${trait}: ${score.toFixed(1)}`)
        .join(', ');

      // Get top VIA strengths (top 3)
      const topVia = Object.entries(viaIs)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([strength, score]) => `${strength}: ${score.toFixed(1)}`)
        .join(', ');

      // Build context summary
      let summary = `RIASEC Career Interests: ${topRiasec}\n`;
      summary += `Big Five Personality Traits: ${topOcean}\n`;
      summary += `Top Character Strengths: ${topVia}`;

      // Add persona profile summary if available
      if (personaProfile?.summary) {
        summary += `\n\nPersonality Summary: ${personaProfile.summary}`;
      }

      // Add career recommendations if available
      if (personaProfile?.careerRecommendations?.length > 0) {
        const topCareers = personaProfile.careerRecommendations
          .slice(0, 5)
          .map(career => career.title || career.name)
          .join(', ');
        summary += `\n\nTop Career Matches: ${topCareers}`;
      }

      return summary;
    } catch (error) {
      logger.error('Error summarizing assessment data', {
        error: error.message
      });
      return 'Error processing assessment data.';
    }
  }

  /**
   * Get conversation history with token optimization
   * @param {string} conversationId - Conversation ID
   * @param {Object} options - History options
   * @returns {Array} Array of message objects
   */
  async getConversationHistory(conversationId, options = {}) {
    try {
      const limit = options.limit || 20;
      const upToMessageId = options.upToMessageId;

      const whereClause = { conversation_id: conversationId };
      
      if (upToMessageId) {
        const targetMessage = await Message.findByPk(upToMessageId);
        if (targetMessage) {
          whereClause.created_at = {
            [require('sequelize').Op.lte]: targetMessage.created_at
          };
        }
      }

      const messages = await Message.findAll({
        where: whereClause,
        order: [['created_at', 'ASC']],
        limit
      });

      // Convert to AI format
      return messages.map(message => ({
        role: message.sender_type === 'user' ? 'user' : 'assistant',
        content: message.content
      }));
    } catch (error) {
      logger.error('Error getting conversation history', {
        conversationId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get top RIASEC types from assessment data
   * @param {Object} riasec - RIASEC scores
   * @returns {Array} Top RIASEC types
   */
  getTopRiasecTypes(riasec) {
    return Object.entries(riasec)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);
  }

  /**
   * Get top Big Five traits from assessment data
   * @param {Object} ocean - Big Five scores
   * @returns {Array} Top traits
   */
  getTopOceanTraits(ocean) {
    return Object.entries(ocean)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([trait]) => trait);
  }

  /**
   * Clear assessment cache
   */
  clearCache() {
    this.assessmentCache.clear();
    logger.info('Assessment cache cleared');
  }

  /**
   * Get cache status
   */
  getCacheStatus() {
    return {
      size: this.assessmentCache.size,
      timeout: this.cacheTimeout
    };
  }
}

module.exports = ContextService;
