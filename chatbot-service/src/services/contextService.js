const axios = require('axios');
const { Conversation, Message } = require('../models');
const logger = require('../utils/logger');
const { SYSTEM_PROMPTS } = require('../config/systemPrompts');

/**
 * ContextService for managing conversation context with profile persona
 * Handles context building and optimization for career guidance conversations
 */
class ContextService {
  constructor() {
    this.maxContextTokens = parseInt(process.env.MAX_CONVERSATION_HISTORY_TOKENS || '6000');
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

      // Get conversation history
      const messages = await this.getConversationHistory(conversationId, options);

      // Build context array with reinforced system instruction
      const context = [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: this.getReinforceInstructions() },
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
   * Get reinforcement instructions to prevent role deviation
   * @returns {string} Reinforcement instructions
   */
  getReinforceInstructions() {
    return SYSTEM_PROMPTS.ROLE_REINFORCEMENT;
  }

  /**
   * Get system prompt based on context type
   * @param {string} contextType - Type of conversation context
   * @returns {string} System prompt
   */
  getSystemPrompt(contextType) {
    const prompts = {
      general: SYSTEM_PROMPTS.GENERAL_CAREER,
      career_guidance: SYSTEM_PROMPTS.CAREER_GUIDER
    };

    return prompts[contextType] || prompts.general;
  }

  /**
   * Get conversation history
   * @param {string} conversationId - Conversation ID
   * @param {Object} options - Options for history retrieval
   * @returns {Array} Array of message objects
   */
  async getConversationHistory(conversationId, options = {}) {
    try {
      const limit = options.limit || 50;

      const messages = await Message.findAll({
        where: { conversation_id: conversationId },
        order: [['created_at', 'ASC']],
        limit: limit
      });

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





}

module.exports = ContextService;
