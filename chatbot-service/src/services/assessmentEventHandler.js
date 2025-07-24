const { Conversation, Message } = require('../models');
const QueueService = require('./queueService');
const ContextService = require('./contextService');
const OpenRouterService = require('./openrouterService');
const logger = require('../utils/logger');

/**
 * AssessmentEventHandler for processing assessment completion events
 * Handles auto-conversation creation and personalized welcome messages
 */
class AssessmentEventHandler {
  constructor() {
    this.queueService = new QueueService();
    this.contextService = new ContextService();
    this.openrouterService = new OpenRouterService();
    this.isInitialized = false;
  }

  /**
   * Initialize the event handler
   */
  async initialize() {
    try {
      if (!process.env.ENABLE_ASSESSMENT_INTEGRATION || process.env.ENABLE_ASSESSMENT_INTEGRATION !== 'true') {
        logger.info('Assessment integration disabled, skipping event handler initialization');
        return false;
      }

      logger.info('Initializing AssessmentEventHandler');

      // Initialize queue service
      await this.queueService.initialize();

      // Subscribe to analysis_complete events
      await this.queueService.subscribe('analysis_complete', this.handleAssessmentComplete.bind(this));

      this.isInitialized = true;
      logger.info('AssessmentEventHandler initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize AssessmentEventHandler', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Handle assessment completion event
   * @param {Object} eventData - Event data from RabbitMQ
   */
  async handleAssessmentComplete(eventData) {
    try {
      // Extract data from the new event structure from analysis worker
      const { userId, resultId, jobId, userEmail, metadata } = eventData;

      logger.info('Processing assessment completion event', {
        userId,
        resultId,
        jobId,
        userEmail,
        metadata
      });

      // Validate event data
      if (!userId || !resultId) {
        logger.error('Invalid event data: missing userId or resultId', {
          eventData
        });
        return;
      }

      // Fetch assessment data from archive service using result ID
      const assessmentData = await this.contextService.fetchAssessmentDataByResultId(resultId);

      if (!assessmentData) {
        logger.error('Failed to fetch assessment data from archive service', {
          userId,
          resultId
        });
        return;
      }

      // Check if assessment conversation already exists for this user
      const existingConversation = await this.findAssessmentConversationByUserId(userId);

      if (existingConversation) {
        logger.info('Assessment conversation already exists, updating context', {
          conversationId: existingConversation.id,
          userId,
          resultId
        });

        // Update existing conversation with new assessment data
        await this.updateConversationContextWithResultId(existingConversation.id, resultId, assessmentData);
      } else {
        logger.info('Creating new assessment conversation', {
          userId,
          resultId
        });

        // Create new assessment-based conversation
        await this.createAssessmentConversationWithResultId(userId, resultId, assessmentData);
      }

      logger.info('Assessment completion event processed successfully', {
        userId,
        resultId
      });

    } catch (error) {
      logger.error('Error handling assessment completion event', {
        eventData,
        error: error.message,
        stack: error.stack
      });
      
      // Don't throw error to avoid message requeue loops
      // Consider implementing dead letter queue for failed events
    }
  }

  /**
   * Find existing assessment conversation by user ID
   * @param {string} userId - User ID
   * @returns {Object|null} Existing conversation or null
   */
  async findAssessmentConversationByUserId(userId) {
    try {
      const conversation = await Conversation.findOne({
        where: {
          user_id: userId,
          context_type: 'assessment',
          status: 'active'
        },
        order: [['created_at', 'DESC']]
      });

      return conversation;
    } catch (error) {
      logger.error('Error finding assessment conversation by user ID', {
        userId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Find existing assessment conversation (legacy method for backward compatibility)
   * @param {string} userId - User ID
   * @param {string} assessmentId - Assessment ID
   * @returns {Object|null} Existing conversation or null
   * @deprecated Use findAssessmentConversationByUserId instead
   */
  async findAssessmentConversation(userId, assessmentId) {
    try {
      const conversation = await Conversation.findOne({
        where: {
          user_id: userId,
          context_type: 'assessment',
          status: 'active'
        },
        order: [['created_at', 'DESC']]
      });

      // Check if conversation is for this specific assessment
      if (conversation && conversation.context_data?.assessment_id === assessmentId) {
        return conversation;
      }

      return null;
    } catch (error) {
      logger.error('Error finding assessment conversation', {
        userId,
        assessmentId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Create new assessment-based conversation
   * @param {string} userId - User ID
   * @param {string} assessmentId - Assessment ID
   * @param {Object} analysisResults - Analysis results from event
   * @returns {Object} Created conversation and welcome message
   */
  async createAssessmentConversation(userId, assessmentId, analysisResults) {
    try {
      // Create conversation with assessment context
      const conversation = await Conversation.create({
        user_id: userId,
        title: 'Career Guidance - Assessment Results',
        context_type: 'assessment',
        context_data: {
          assessment_id: assessmentId,
          analysis_results: analysisResults,
          created_from_event: true,
          event_timestamp: new Date().toISOString()
        },
        metadata: {
          auto_generated: true,
          assessment_date: new Date().toISOString(),
          source: 'analysis_complete_event'
        }
      });

      logger.info('Assessment conversation created', {
        conversationId: conversation.id,
        userId,
        assessmentId
      });

      // Generate personalized welcome message if enabled
      let welcomeMessage = null;
      let suggestions = [];

      if (process.env.ENABLE_PERSONALIZED_WELCOME_MESSAGES === 'true') {
        try {
          welcomeMessage = await this.generateAssessmentWelcomeMessage(
            conversation.id, 
            analysisResults
          );

          // Save welcome message
          await Message.create({
            conversation_id: conversation.id,
            sender_type: 'assistant',
            content: welcomeMessage,
            metadata: {
              type: 'assessment_welcome',
              auto_generated: true,
              generated_at: new Date().toISOString()
            }
          });

          logger.info('Welcome message generated and saved', {
            conversationId: conversation.id,
            messageLength: welcomeMessage.length
          });
        } catch (error) {
          logger.error('Failed to generate welcome message', {
            conversationId: conversation.id,
            error: error.message
          });
        }
      }

      // Generate suggested questions if enabled
      if (process.env.ENABLE_SUGGESTED_QUESTIONS === 'true') {
        try {
          suggestions = await this.generateAssessmentSuggestions(analysisResults);
          
          logger.info('Suggested questions generated', {
            conversationId: conversation.id,
            suggestionCount: suggestions.length
          });
        } catch (error) {
          logger.error('Failed to generate suggestions', {
            conversationId: conversation.id,
            error: error.message
          });
        }
      }

      return { 
        conversation, 
        welcomeMessage, 
        suggestions 
      };
    } catch (error) {
      logger.error('Error creating assessment conversation', {
        userId,
        assessmentId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Update existing conversation context
   * @param {string} conversationId - Conversation ID
   * @param {Object} analysisResults - New analysis results
   */
  async updateConversationContext(conversationId, analysisResults) {
    try {
      const conversation = await Conversation.findByPk(conversationId);
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Update context data with new analysis results
      const updatedContextData = {
        ...conversation.context_data,
        analysis_results: analysisResults,
        updated_from_event: true,
        last_update_timestamp: new Date().toISOString()
      };

      await conversation.update({
        context_data: updatedContextData,
        updated_at: new Date()
      });

      logger.info('Conversation context updated', {
        conversationId,
        assessmentId: conversation.context_data.assessment_id
      });
    } catch (error) {
      logger.error('Error updating conversation context', {
        conversationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create new assessment-based conversation using result ID
   * @param {string} userId - User ID
   * @param {string} resultId - Analysis result ID
   * @param {Object} assessmentData - Assessment data from archive service
   * @returns {Object} Created conversation and welcome message
   */
  async createAssessmentConversationWithResultId(userId, resultId, assessmentData) {
    try {
      // Create conversation with assessment context using result ID
      const conversation = await Conversation.create({
        user_id: userId,
        title: 'Career Guidance - Assessment Results',
        context_type: 'assessment',
        context_data: {
          result_id: resultId,
          assessment_data: assessmentData,
          created_from_event: true,
          event_timestamp: new Date().toISOString()
        },
        metadata: {
          auto_generated: true,
          assessment_date: new Date().toISOString(),
          source: 'analysis_complete_event'
        }
      });

      logger.info('Assessment conversation created with result ID', {
        conversationId: conversation.id,
        userId,
        resultId
      });

      // Generate personalized welcome message if enabled
      let welcomeMessage = null;
      let suggestions = [];

      if (process.env.ENABLE_WELCOME_MESSAGES !== 'false') {
        try {
          welcomeMessage = await this.generateWelcomeMessage(assessmentData);
          suggestions = await this.generatePersonalizedSuggestions(assessmentData);
        } catch (messageError) {
          logger.warn('Failed to generate welcome message or suggestions', {
            conversationId: conversation.id,
            error: messageError.message
          });
        }
      }

      return {
        conversation,
        welcomeMessage,
        suggestions
      };
    } catch (error) {
      logger.error('Error creating assessment conversation with result ID', {
        userId,
        resultId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Update existing conversation context with result ID
   * @param {string} conversationId - Conversation ID
   * @param {string} resultId - Analysis result ID
   * @param {Object} assessmentData - Assessment data from archive service
   */
  async updateConversationContextWithResultId(conversationId, resultId, assessmentData) {
    try {
      const conversation = await Conversation.findByPk(conversationId);

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Update context data with new assessment data using result ID
      const updatedContextData = {
        ...conversation.context_data,
        result_id: resultId,
        assessment_data: assessmentData,
        updated_from_event: true,
        last_update_timestamp: new Date().toISOString()
      };

      await conversation.update({
        context_data: updatedContextData,
        updated_at: new Date()
      });

      logger.info('Conversation context updated with result ID', {
        conversationId,
        resultId
      });

    } catch (error) {
      logger.error('Error updating conversation context with result ID', {
        conversationId,
        resultId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate personalized welcome message
   * @param {string} conversationId - Conversation ID
   * @param {Object} analysisResults - Assessment analysis results
   * @returns {string} Generated welcome message
   */
  async generateAssessmentWelcomeMessage(conversationId, analysisResults) {
    try {
      const assessmentSummary = this.contextService.summarizeAssessmentData(analysisResults);
      
      const systemPrompt = `You are a career advisor AI. Generate a warm, personalized welcome message for a user who just completed their career assessment.

Assessment Summary: ${assessmentSummary}

Create a welcome message that:
1. Acknowledges their assessment completion
2. Highlights 2-3 key insights from their results
3. Expresses enthusiasm about helping with career guidance
4. Invites them to ask questions

Keep it conversational, encouraging, and under 150 words.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate my personalized welcome message based on my assessment results.' }
      ];

      const response = await this.openrouterService.generateResponse(messages, {
        maxTokens: 200,
        temperature: 0.8,
        userId: 'system',
        conversationId: conversationId
      });

      return response.content;
    } catch (error) {
      logger.error('Error generating welcome message', {
        conversationId,
        error: error.message
      });
      
      // Return fallback message
      return "Welcome! I've reviewed your career assessment results and I'm excited to help you explore career opportunities that align with your unique personality and interests. Feel free to ask me anything about your results or career guidance!";
    }
  }

  /**
   * Generate assessment-based suggested questions
   * @param {Object} analysisResults - Assessment analysis results
   * @returns {Array} Array of suggested questions
   */
  async generateAssessmentSuggestions(analysisResults) {
    try {
      const riasecTop = this.contextService.getTopRiasecTypes(analysisResults.riasec || {});
      const oceanTop = this.contextService.getTopOceanTraits(analysisResults.ocean || {});
      
      const suggestions = [
        `What career paths align with my ${riasecTop[0]} and ${riasecTop[1]} interests?`,
        `How can I leverage my high ${oceanTop[0]} trait in my career?`,
        `What are my strongest personality traits for leadership roles?`,
        `Based on my assessment, what skills should I develop?`,
        `What work environments would suit my personality best?`,
        `How do my values align with different career options?`,
        `What are some specific job roles that match my profile?`,
        `How can I use my character strengths in my career?`
      ];

      // Return top 4 suggestions
      return suggestions.slice(0, 4);
    } catch (error) {
      logger.error('Error generating suggestions', {
        error: error.message
      });
      
      // Return fallback suggestions
      return [
        "What career paths would be best for my personality?",
        "How can I use my strengths in my career?",
        "What skills should I focus on developing?",
        "What work environments suit me best?"
      ];
    }
  }

  /**
   * Close the event handler gracefully
   */
  async close() {
    try {
      if (this.queueService) {
        await this.queueService.close();
      }
      
      this.isInitialized = false;
      logger.info('AssessmentEventHandler closed successfully');
    } catch (error) {
      logger.error('Error closing AssessmentEventHandler', {
        error: error.message
      });
    }
  }

  /**
   * Get handler status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      queueStatus: this.queueService ? this.queueService.getStatus() : null
    };
  }
}

module.exports = AssessmentEventHandler;
