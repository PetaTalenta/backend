# Phase 4: Real-time Notifications & Advanced Features

## 🎯 Tujuan Fase

**Mengimplementasikan real-time notifications dan advanced chatbot features** dengan fokus pada:
- WebSocket integration untuk real-time progress updates
- Advanced API endpoints untuk enhanced user experience
- Notification system untuk assessment-to-chatbot flow
- Enhanced message features (regenerate, threading, streaming)

**Mengapa Fase Ini Penting:**
- Memberikan user experience yang responsive dan engaging
- Membangun real-time feedback loop untuk assessment progress
- Mengoptimalkan user engagement dengan instant notifications
- Menyediakan advanced features yang meningkatkan chatbot utility

## 🏗️ Komponen Utama

### 1. Real-time Notification System
- **WebSocket Integration**: Real-time communication dengan notification service
- **Progress Notifications**: Multi-stage progress updates untuk assessment flow
- **Chatbot Ready Notifications**: Instant notification ketika chatbot siap
- **Error Handling**: Graceful fallback untuk notification failures

### 2. Advanced Message Features
- **Message Regeneration**: Regenerate AI responses dengan different parameters
- **Message Threading**: Support untuk conversation branching
- **Streaming Responses**: Real-time streaming untuk better UX
- **Message Reactions**: User feedback untuk response quality

### 3. Enhanced API Endpoints
- **Conversation Management**: Advanced conversation operations
- **Usage Analytics**: Detailed usage reporting dan insights
- **Export Features**: Conversation export untuk user records
- **Search Functionality**: Search dalam conversation history

## 📋 Implementasi Detail

### Real-time Notification Service
```javascript
// src/services/notificationService.js
class NotificationService {
  constructor() {
    this.notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL;
    this.queueService = require('./queueService');
  }

  async sendAssessmentProgressNotification(userId, stage, data = {}) {
    const notificationStages = {
      assessment_submitted: {
        title: "📝 Assessment Received",
        message: "Your career assessment has been submitted and is being processed.",
        progress: 25
      },
      analysis_started: {
        title: "🧠 AI Analysis in Progress",
        message: "Our AI is analyzing your personality profile and career preferences.",
        progress: 50
      },
      analysis_complete: {
        title: "✅ Analysis Complete",
        message: "Your personality analysis is ready! Preparing your personalized chatbot...",
        progress: 75
      },
      chatbot_ready: {
        title: "🤖 Career Advisor Ready",
        message: "Your personalized AI career advisor is ready to help you explore your results!",
        progress: 100,
        action: {
          type: "redirect",
          url: `/assessment/${data.assessmentId}/results`
        }
      }
    };

    const notification = {
      userId: userId,
      type: 'assessment_progress',
      stage: stage,
      ...notificationStages[stage],
      assessmentId: data.assessmentId,
      timestamp: new Date().toISOString(),
      metadata: data
    };

    try {
      // Send via WebSocket through notification service
      await this.sendWebSocketNotification(userId, notification);
      
      // Also publish to queue for reliability
      await this.queueService.publish('notification_events', {
        type: 'assessment_progress',
        userId: userId,
        notification: notification
      });

      logger.info('Assessment progress notification sent', {
        userId: userId,
        stage: stage,
        assessmentId: data.assessmentId
      });

    } catch (error) {
      logger.error('Failed to send assessment progress notification:', error);
      // Implement fallback notification method
    }
  }

  async sendWebSocketNotification(userId, notification) {
    try {
      const response = await axios.post(
        `${this.notificationServiceUrl}/api/notifications/send`,
        {
          userId: userId,
          notification: notification
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.INTERNAL_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('WebSocket notification failed:', error);
      throw error;
    }
  }

  async notifyChatbotReady(userId, assessmentId, conversationId) {
    await this.sendAssessmentProgressNotification(userId, 'chatbot_ready', {
      assessmentId: assessmentId,
      conversationId: conversationId,
      readyAt: new Date().toISOString()
    });
  }

  async sendChatMessageNotification(userId, conversationId, messageData) {
    const notification = {
      userId: userId,
      type: 'chat_message',
      title: "💬 New Message",
      message: "You have a new message in your conversation",
      conversationId: conversationId,
      messagePreview: messageData.content.substring(0, 100),
      timestamp: new Date().toISOString()
    };

    await this.sendWebSocketNotification(userId, notification);
  }
}
```

### Enhanced Message Controller
```javascript
// src/controllers/enhancedMessageController.js
class EnhancedMessageController extends MessageController {
  async regenerateMessage(req, res) {
    try {
      const { conversationId, messageId } = req.params;
      const { temperature, max_tokens, model } = req.body;
      const userId = req.user.id;

      // Validate access
      const message = await Message.findOne({
        where: { id: messageId },
        include: [{
          model: Conversation,
          where: { user_id: userId }
        }]
      });

      if (!message || message.sender_type !== 'assistant') {
        return res.status(404).json({ error: 'Assistant message not found' });
      }

      // Get conversation history up to this message
      const conversationHistory = await this.buildConversationHistoryUpTo(
        conversationId, 
        messageId
      );

      // Generate new response with different parameters
      const aiResponse = await openrouterService.generateResponse(
        conversationHistory,
        {
          userId: userId,
          temperature: temperature || 0.8,
          maxTokens: max_tokens || 1000,
          model: model
        }
      );

      // Create new message
      const newMessage = await Message.create({
        conversation_id: conversationId,
        sender_type: 'assistant',
        content: aiResponse.content,
        parent_message_id: message.parent_message_id,
        metadata: {
          model: aiResponse.model,
          finish_reason: aiResponse.finishReason,
          processing_time: aiResponse.processingTime,
          regenerated_from: messageId,
          generation_params: { temperature, max_tokens, model }
        }
      });

      // Track usage
      await UsageTracking.create({
        conversation_id: conversationId,
        message_id: newMessage.id,
        model_used: aiResponse.model,
        prompt_tokens: aiResponse.usage.prompt_tokens,
        completion_tokens: aiResponse.usage.completion_tokens,
        total_tokens: aiResponse.usage.total_tokens,
        cost_credits: aiResponse.usage.cost,
        is_free_model: aiResponse.usage.isFreeModel,
        processing_time_ms: aiResponse.processingTime
      });

      res.json({
        new_message: newMessage,
        usage: aiResponse.usage,
        original_message_id: messageId
      });

    } catch (error) {
      logger.error('Error regenerating message:', error);
      res.status(500).json({ error: 'Failed to regenerate message' });
    }
  }

  async streamMessage(req, res) {
    try {
      const { conversationId } = req.params;
      const { content } = req.body;
      const userId = req.user.id;

      // Set up SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      // Save user message
      const userMessage = await Message.create({
        conversation_id: conversationId,
        sender_type: 'user',
        content: content
      });

      // Send user message confirmation
      res.write(`data: ${JSON.stringify({
        type: 'user_message',
        message: userMessage
      })}\n\n`);

      // Build context and stream AI response
      const conversationHistory = await this.buildConversationHistory(conversationId);
      
      // Stream response from OpenRouter
      await openrouterService.streamResponse(
        conversationHistory,
        {
          userId: userId,
          onChunk: (chunk) => {
            res.write(`data: ${JSON.stringify({
              type: 'assistant_chunk',
              content: chunk
            })}\n\n`);
          },
          onComplete: async (fullResponse, usage) => {
            // Save complete assistant message
            const assistantMessage = await Message.create({
              conversation_id: conversationId,
              sender_type: 'assistant',
              content: fullResponse.content,
              metadata: {
                model: fullResponse.model,
                streaming: true
              }
            });

            // Send completion
            res.write(`data: ${JSON.stringify({
              type: 'complete',
              message: assistantMessage,
              usage: usage
            })}\n\n`);

            res.end();
          }
        }
      );

    } catch (error) {
      logger.error('Error streaming message:', error);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: 'Failed to stream message'
      })}\n\n`);
      res.end();
    }
  }

  async addMessageReaction(req, res) {
    try {
      const { messageId } = req.params;
      const { reaction, feedback } = req.body; // reaction: 'like', 'dislike', 'helpful', etc.
      const userId = req.user.id;

      // Validate message access
      const message = await Message.findOne({
        where: { id: messageId },
        include: [{
          model: Conversation,
          where: { user_id: userId }
        }]
      });

      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Update message metadata with reaction
      const currentMetadata = message.metadata || {};
      const reactions = currentMetadata.reactions || {};
      
      reactions[userId] = {
        reaction: reaction,
        feedback: feedback,
        timestamp: new Date().toISOString()
      };

      await message.update({
        metadata: {
          ...currentMetadata,
          reactions: reactions
        }
      });

      res.json({
        success: true,
        message: 'Reaction added successfully'
      });

    } catch (error) {
      logger.error('Error adding message reaction:', error);
      res.status(500).json({ error: 'Failed to add reaction' });
    }
  }
}
```

### Advanced Conversation Controller
```javascript
// src/controllers/advancedConversationController.js
class AdvancedConversationController {
  async exportConversation(req, res) {
    try {
      const { conversationId } = req.params;
      const { format = 'json' } = req.query; // json, txt, pdf
      const userId = req.user.id;

      const conversation = await Conversation.findOne({
        where: { id: conversationId, user_id: userId },
        include: [{
          model: Message,
          order: [['created_at', 'ASC']]
        }]
      });

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      let exportData;
      let contentType;
      let filename;

      switch (format) {
        case 'txt':
          exportData = this.formatConversationAsText(conversation);
          contentType = 'text/plain';
          filename = `conversation-${conversationId}.txt`;
          break;
        case 'json':
        default:
          exportData = JSON.stringify(conversation, null, 2);
          contentType = 'application/json';
          filename = `conversation-${conversationId}.json`;
          break;
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(exportData);

    } catch (error) {
      logger.error('Error exporting conversation:', error);
      res.status(500).json({ error: 'Failed to export conversation' });
    }
  }

  async searchConversations(req, res) {
    try {
      const { query, limit = 20, offset = 0 } = req.query;
      const userId = req.user.id;

      const searchResults = await Message.findAndCountAll({
        where: {
          content: {
            [Op.iLike]: `%${query}%`
          }
        },
        include: [{
          model: Conversation,
          where: { user_id: userId },
          attributes: ['id', 'title', 'created_at']
        }],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      res.json({
        results: searchResults.rows,
        total: searchResults.count,
        query: query,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: searchResults.count > (parseInt(offset) + parseInt(limit))
        }
      });

    } catch (error) {
      logger.error('Error searching conversations:', error);
      res.status(500).json({ error: 'Failed to search conversations' });
    }
  }

  async getConversationAnalytics(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      const conversation = await Conversation.findOne({
        where: { id: conversationId, user_id: userId }
      });

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Get message statistics
      const messageStats = await Message.findAll({
        where: { conversation_id: conversationId },
        attributes: [
          'sender_type',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('AVG', sequelize.fn('LENGTH', sequelize.col('content'))), 'avg_length']
        ],
        group: ['sender_type']
      });

      // Get usage statistics
      const usageStats = await UsageTracking.findAll({
        where: { conversation_id: conversationId },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('total_tokens')), 'total_tokens'],
          [sequelize.fn('SUM', sequelize.col('cost_credits')), 'total_cost'],
          [sequelize.fn('AVG', sequelize.col('processing_time_ms')), 'avg_processing_time'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'total_requests']
        ]
      });

      res.json({
        conversation_id: conversationId,
        message_statistics: messageStats,
        usage_statistics: usageStats[0],
        conversation_duration: this.calculateConversationDuration(conversation),
        last_activity: conversation.updated_at
      });

    } catch (error) {
      logger.error('Error getting conversation analytics:', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  }
}
```

## 🔗 Dependencies

**Prerequisites dari Phase 3:**
- Assessment integration working
- Context management dengan assessment data
- Event-driven architecture
- Personalized conversation creation

**External Services:**
- **Notification Service**: Untuk WebSocket real-time notifications
- **RabbitMQ**: Untuk reliable notification delivery
- **Archive Service**: Untuk conversation export features

## 📦 Deliverables

### ✅ Yang Harus Diselesaikan:

1. **Real-time Notification System**
   - WebSocket integration dengan notification service
   - Multi-stage progress notifications untuk assessment flow
   - Chatbot ready notifications dengan action buttons
   - Error handling dan fallback mechanisms

2. **Advanced Message Features**
   - Message regeneration dengan custom parameters
   - Streaming responses untuk better UX
   - Message reactions dan feedback system
   - Message threading support

3. **Enhanced API Endpoints**
   - Conversation export (JSON, TXT formats)
   - Search functionality dalam conversations
   - Conversation analytics dan usage insights
   - Advanced conversation management

4. **User Experience Enhancements**
   - Real-time progress indicators
   - Instant feedback untuk user actions
   - Enhanced error messages dan recovery
   - Performance optimizations

5. **Testing & Monitoring**
   - WebSocket connection testing
   - Real-time notification delivery tests
   - Advanced feature integration tests
   - Performance monitoring untuk streaming

## 🚀 Pengembangan Selanjutnya

**Persiapan untuk Phase 5:**
- Real-time infrastructure ready untuk performance optimization
- Advanced features foundation untuk scaling
- Monitoring hooks ready untuk comprehensive analytics
- User experience baseline established untuk optimization

**Foundation yang Dibangun:**
- **Real-time Communication**: WebSocket infrastructure untuk instant updates
- **Advanced Chatbot Features**: Professional-grade conversation capabilities
- **User Engagement**: Interactive features yang meningkatkan retention
- **Analytics Ready**: Data collection untuk optimization insights

## ⏱️ Timeline & Resources

**Estimasi Waktu:** 2-3 minggu
**Team Requirements:**
- 1 Backend Developer (senior level untuk WebSocket integration)
- 1 Frontend Developer (untuk real-time UI integration)
- 1 QA Engineer (untuk real-time testing)

**Milestones:**
- **Week 1**: WebSocket integration dan notification system
- **Week 2**: Advanced message features dan streaming
- **Week 3**: Analytics, export features, testing

**Success Criteria:**
- Real-time notifications working dengan <1s latency
- Streaming responses providing smooth UX
- Advanced features increasing user engagement >20%
- System reliability >99.5% untuk real-time features
- Ready untuk production optimization di Phase 5

---

**🎯 Outcome:** Professional-grade chatbot dengan real-time capabilities, advanced features, dan comprehensive user experience yang siap untuk production scaling.
