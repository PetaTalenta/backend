const { Conversation } = require('../models');
const ContextService = require('../services/contextService');
const AssessmentEventHandler = require('../services/assessmentEventHandler');
const archiveService = require('../services/archiveService');
const logger = require('../utils/logger');

/**
 * AssessmentIntegrationController for handling assessment-specific API endpoints
 * Manages assessment-to-chatbot integration and personalized features
 */
class AssessmentIntegrationController {
  constructor() {
    this.contextService = new ContextService();
    this.assessmentEventHandler = new AssessmentEventHandler();
  }

  /**
   * Create conversation from assessment
   * POST /api/chatbot/conversations/from-assessment
   */
  async createFromAssessment(req, res) {
    try {
      console.log('=== CONTROLLER REACHED ===');
      console.log('req.user:', req.user);
      console.log('req.headers.authorization:', req.headers.authorization);

      const { assessment_id, title, auto_start_message = true } = req.body;
      const userId = req.user.id;

      logger.info('Creating conversation from assessment', {
        userId,
        assessmentId: assessment_id,
        autoStartMessage: auto_start_message
      });

      // Validate required fields
      if (!assessment_id) {
        return res.status(400).json({ 
          error: 'Assessment ID is required',
          code: 'MISSING_ASSESSMENT_ID'
        });
      }

      // Check if assessment conversation already exists
      const existingConversation = await this.findAssessmentConversation(userId, assessment_id);
      
      if (existingConversation) {
        logger.info('Assessment conversation already exists', {
          conversationId: existingConversation.id,
          userId,
          assessmentId: assessment_id
        });

        // Get suggestions for existing conversation
        const suggestions = await this.generateSuggestionsForConversation(existingConversation);

        return res.json({
          conversation: existingConversation,
          initial_message: null,
          suggestions,
          message: 'Assessment conversation already exists'
        });
      }

      // Validate assessment exists and belongs to user
      const assessmentData = await this.validateAssessmentAccess(userId, assessment_id);
      
      if (!assessmentData) {
        return res.status(404).json({ 
          error: 'Assessment not found or access denied',
          code: 'ASSESSMENT_NOT_FOUND'
        });
      }

      // Create conversation with assessment context
      const result = await this.assessmentEventHandler.createAssessmentConversation(
        userId, 
        assessment_id, 
        assessmentData
      );

      logger.info('Assessment conversation created successfully', {
        conversationId: result.conversation.id,
        userId,
        assessmentId: assessment_id,
        hasWelcomeMessage: !!result.welcomeMessage
      });

      // Generate suggestions for the conversation
      const suggestions = await this.generateSuggestionsForConversation(result.conversation);

      res.status(201).json({
        success: true,
        data: {
          conversation: {
            id: result.conversation.id,
            title: result.conversation.title,
            context_type: result.conversation.context_type,
            context_data: result.conversation.context_data,
            status: result.conversation.status,
            created_at: result.conversation.created_at
          },
          welcome_message: result.welcomeMessage ? {
            id: result.welcomeMessage.id,
            content: result.welcomeMessage.content,
            sender_type: result.welcomeMessage.sender_type,
            created_at: result.welcomeMessage.created_at
          } : null,
          suggestions
        }
      });

    } catch (error) {
      logger.error('Error creating conversation from assessment', {
        userId: req.user?.id,
        assessmentId: req.body?.assessment_id,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({ 
        error: 'Failed to create assessment conversation',
        code: 'CONVERSATION_CREATION_ERROR'
      });
    }
  }

  /**
   * Check if user has assessment ready for chatbot
   * GET /api/chatbot/assessment-ready/:userId
   */
  async checkAssessmentReady(req, res) {
    try {
      const { userId } = req.params;
      
      // Verify user can access this endpoint (same user or admin)
      if (req.user.id !== userId && req.user.user_type !== 'admin') {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      logger.info('Checking assessment readiness', { userId });

      // Check if user has completed assessment
      const assessmentStatus = await this.getLatestAssessmentStatus(userId);

      if (!assessmentStatus.has_assessment) {
        return res.json({
          has_assessment: false,
          assessment_date: null,
          assessment_id: null,
          conversation_exists: false,
          conversation_id: null,
          ready_for_chatbot: false,
          message: 'No assessment found. Please complete your career assessment first.'
        });
      }

      // Check if conversation already exists
      const existingConversation = await this.findAssessmentConversation(
        userId,
        assessmentStatus.assessment_id
      );

      res.json({
        has_assessment: true,
        assessment_date: assessmentStatus.assessment_date,
        assessment_id: assessmentStatus.assessment_id,
        conversation_exists: !!existingConversation,
        conversation_id: existingConversation?.id || null,
        ready_for_chatbot: true
      });

    } catch (error) {
      logger.error('Error checking assessment readiness', {
        userId: req.params.userId,
        error: error.message
      });

      res.status(500).json({ 
        error: 'Failed to check assessment status',
        code: 'ASSESSMENT_CHECK_ERROR'
      });
    }
  }

  /**
   * Generate suggestions for conversation
   * GET /api/chatbot/conversations/:conversationId/suggestions
   */
  async generateSuggestions(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      logger.info('Generating suggestions for conversation', {
        conversationId,
        userId
      });

      const conversation = await Conversation.findOne({
        where: { id: conversationId, user_id: userId }
      });

      if (!conversation) {
        return res.status(404).json({ 
          error: 'Conversation not found',
          code: 'CONVERSATION_NOT_FOUND'
        });
      }

      if (conversation.context_type !== 'assessment') {
        return res.status(400).json({ 
          error: 'Suggestions only available for assessment conversations',
          code: 'INVALID_CONVERSATION_TYPE'
        });
      }

      const suggestions = await this.generateSuggestionsForConversation(conversation);

      // Get assessment data to determine user archetype
      let userArchetype = 'Unknown';
      if (conversation.context_data?.assessment_id) {
        try {
          const assessmentData = await archiveService.getAssessmentById(conversation.context_data.assessment_id);
          if (assessmentData?.persona_profile?.archetype) {
            userArchetype = assessmentData.persona_profile.archetype;
          }
        } catch (error) {
          logger.warn('Could not fetch assessment data for archetype', {
            conversationId,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        data: {
          suggestions,
          context: {
            assessment_based: true,
            conversation_stage: 'initial',
            user_archetype: userArchetype
          }
        }
      });

    } catch (error) {
      logger.error('Error generating suggestions', {
        conversationId: req.params.conversationId,
        userId: req.user?.id,
        error: error.message
      });

      res.status(500).json({ 
        error: 'Failed to generate suggestions',
        code: 'SUGGESTION_GENERATION_ERROR'
      });
    }
  }


  /**
   * Get conversation suggestions for assessment conversation
   * GET /assessment/conversations/:conversationId/suggestions
   */
  async getConversationSuggestions(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      logger.info('Getting conversation suggestions', {
        conversationId,
        userId
      });

      // Verify conversation exists and belongs to user
      const conversation = await Conversation.findOne({
        where: {
          id: conversationId,
          user_id: userId,
          context_type: 'assessment'
        }
      });

      if (!conversation) {
        return res.status(404).json({
          error: 'Assessment conversation not found',
          code: 'CONVERSATION_NOT_FOUND'
        });
      }

      // Generate suggestions based on conversation context
      const suggestions = await this.generateSuggestionsForConversation(conversation);

      // Get assessment data to determine user archetype
      let userArchetype = 'Unknown';
      if (conversation.context_data?.assessment_id) {
        try {
          const assessmentData = await archiveService.getAssessmentById(conversation.context_data.assessment_id);
          if (assessmentData?.persona_profile?.archetype) {
            userArchetype = assessmentData.persona_profile.archetype;
          }
        } catch (error) {
          logger.warn('Could not fetch assessment data for archetype', {
            conversationId,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        data: {
          suggestions,
          context: {
            assessment_based: true,
            conversation_stage: 'initial',
            user_archetype: userArchetype
          }
        }
      });

    } catch (error) {
      logger.error('Error getting conversation suggestions', {
        conversationId: req.params.conversationId,
        userId: req.user?.id,
        error: error.message
      });

      res.status(500).json({
        error: 'Failed to get conversation suggestions',
        code: 'SUGGESTIONS_ERROR'
      });
    }
  }

  /**
   * Find assessment conversation for user
   * @param {string} userId - User ID
   * @param {string} assessmentId - Assessment ID
   * @returns {Object|null} Conversation or null
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
   * Validate assessment access for user using result ID
   * @param {string} userId - User ID
   * @param {string} resultId - Analysis result ID
   * @returns {Object|null} Assessment data or null
   */
  async validateAssessmentAccessByResultId(userId, resultId) {
    try {
      // Use the archive service to validate user access
      const assessmentData = await archiveService.validateUserAssessmentAccess(userId, resultId);

      if (!assessmentData) {
        logger.warn('Assessment access validation failed', {
          userId,
          resultId
        });
        return null;
      }

      return assessmentData;
    } catch (error) {
      logger.error('Error validating assessment access by result ID', {
        userId,
        resultId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Validate assessment access for user (legacy method for backward compatibility)
   * @param {string} userId - User ID
   * @param {string} assessmentId - Assessment ID (will be treated as result ID)
   * @returns {Object|null} Assessment data or null
   * @deprecated Use validateAssessmentAccessByResultId instead
   */
  async validateAssessmentAccess(userId, assessmentId) {
    try {
      // Use the archive service to validate user access
      const assessmentData = await archiveService.validateUserAssessmentAccess(userId, assessmentId);

      if (!assessmentData) {
        logger.warn('Assessment access validation failed', {
          userId,
          assessmentId
        });
        return null;
      }

      return assessmentData;
    } catch (error) {
      logger.error('Error validating assessment access', {
        userId,
        assessmentId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get latest assessment status for user
   * @param {string} userId - User ID
   * @returns {Object} Assessment status
   */
  async getLatestAssessmentStatus(userId) {
    try {
      logger.info('Getting latest assessment status for user', { userId });

      // Get user's latest completed assessment from archive service
      const latestAssessment = await archiveService.getUserLatestAssessment(userId);

      if (!latestAssessment) {
        logger.info('No completed assessment found for user', { userId });
        return {
          has_assessment: false,
          assessment_id: null,
          assessment_date: null
        };
      }

      logger.info('Latest assessment found for user', {
        userId,
        assessmentId: latestAssessment.id,
        assessmentDate: latestAssessment.created_at
      });

      return {
        has_assessment: true,
        assessment_id: latestAssessment.id,
        assessment_date: latestAssessment.created_at
      };
    } catch (error) {
      logger.error('Error getting assessment status', {
        userId,
        error: error.message
      });

      return {
        has_assessment: false,
        assessment_id: null,
        assessment_date: null
      };
    }
  }

  /**
   * Generate suggestions for conversation
   * @param {Object} conversation - Conversation object
   * @returns {Array} Array of suggestions
   */
  async generateSuggestionsForConversation(conversation) {
    try {
      if (!conversation.context_data?.analysis_results) {
        return [
          "What career paths would be best for my personality?",
          "How can I use my strengths in my career?",
          "What skills should I focus on developing?",
          "What work environments suit me best?"
        ];
      }

      return await this.assessmentEventHandler.generateAssessmentSuggestions(
        conversation.context_data.analysis_results
      );
    } catch (error) {
      logger.error('Error generating suggestions for conversation', {
        conversationId: conversation.id,
        error: error.message
      });
      
      return [
        "Tell me about my career assessment results",
        "What are my strongest personality traits?",
        "What career options match my profile?",
        "How can I develop my skills further?"
      ];
    }
  }
}

module.exports = AssessmentIntegrationController;
