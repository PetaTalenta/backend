require('dotenv').config();
const APIClient = require('./lib/api-client');
const WebSocketClient = require('./lib/websocket-client');
const TestDataGenerator = require('./lib/test-data');
const TestLogger = require('./lib/test-logger');

class ChatbotTest {
  constructor() {
    this.logger = TestLogger.create('chatbot-test');
    this.dataGenerator = new TestDataGenerator();
    this.apiClient = new APIClient();
    this.wsClient = new WebSocketClient();
    this.testData = null;
    this.resultId = null;
    this.conversationId = null;
  }

  async run() {
    try {
      this.logger.info('Starting Chatbot-focused E2E Test');
      
      // Setup
      await this.setup();
      
      // Test conversation creation
      await this.testConversationCreation();
      
      // Test message exchange
      await this.testMessageExchange();
      
      // Test assessment integration
      await this.testAssessmentIntegration();
      
      // Test conversation management
      await this.testConversationManagement();
      
      // Test error scenarios
      await this.testErrorScenarios();
      
      this.logger.success('Chatbot E2E Test completed successfully');
      
    } catch (error) {
      this.logger.error('Chatbot E2E Test failed', error);
      throw error;
    } finally {
      await this.cleanup();
      await this.logger.saveReport();
    }
  }

  async setup() {
    this.logger.step('Setup Test Environment', 1);
    
    // Generate test data
    this.testData = this.dataGenerator.generateTestSuite(1)[0];
    
    // Register and login user
    await this.apiClient.register(this.testData.user);
    await this.apiClient.login({
      email: this.testData.user.email,
      password: this.testData.user.password
    });
    
    // Connect WebSocket
    await this.wsClient.connect();
    await this.wsClient.authenticate(this.apiClient.token);
    
    // Submit assessment to get results for chatbot integration
    const assessmentResponse = await this.apiClient.submitAssessment(this.testData.assessment);
    const jobId = assessmentResponse.data.jobId;
    
    // Wait for assessment completion
    const notification = await this.wsClient.waitForAssessmentComplete(jobId, 300000);
    this.resultId = notification.resultId;
    
    this.logger.success('Test environment setup completed', {
      resultId: this.resultId
    });
  }

  async testConversationCreation() {
    this.logger.step('Test Conversation Creation', 2);
    
    try {
      // Test basic conversation creation
      const basicConversation = await this.apiClient.createConversation(this.testData.conversation);
      
      if (basicConversation.success && basicConversation.data.id) {
        this.logger.success('Basic conversation created successfully', {
          conversationId: basicConversation.data.id
        });
      } else {
        throw new Error('Basic conversation creation failed');
      }
      
      // Test conversation creation from assessment
      const assessmentConversation = await this.apiClient.createConversationFromAssessment({
        assessment_id: this.resultId,
        title: 'Assessment-based Chat Test',
        auto_start_message: true
      });
      
      if (assessmentConversation.success && assessmentConversation.data.conversation) {
        this.conversationId = assessmentConversation.data.conversation.id;
        this.logger.success('Assessment-based conversation created successfully', {
          conversationId: this.conversationId,
          hasWelcomeMessage: !!assessmentConversation.data.welcome_message
        });
      } else {
        throw new Error('Assessment-based conversation creation failed');
      }
      
      // Test auto-initialize
      const autoConversation = await this.apiClient.autoInitializeChatbot();
      
      if (autoConversation.success && autoConversation.data.conversation) {
        this.logger.success('Auto-initialized conversation created successfully', {
          conversationId: autoConversation.data.conversation.id
        });
      } else {
        throw new Error('Auto-initialize conversation creation failed');
      }
      
    } catch (error) {
      this.logger.error('Conversation creation test failed', error);
      throw error;
    }
  }

  async testMessageExchange() {
    this.logger.step('Test Message Exchange', 3);
    
    try {
      if (!this.conversationId) {
        throw new Error('No conversation ID available for message testing');
      }
      
      // Send multiple messages and verify responses
      for (let i = 0; i < this.testData.messages.length; i++) {
        const message = this.testData.messages[i];
        
        this.logger.info(`Sending message ${i + 1}/${this.testData.messages.length}: "${message.content.substring(0, 50)}..."`);
        
        const response = await this.apiClient.sendMessage(this.conversationId, message);
        
        if (response.success && response.data.user_message && response.data.assistant_message) {
          this.logger.success(`Message ${i + 1} exchange successful`, {
            userMessageId: response.data.user_message.id,
            assistantMessageId: response.data.assistant_message.id,
            tokensUsed: response.data.usage?.tokens_used || 'unknown'
          });
        } else {
          throw new Error(`Message ${i + 1} exchange failed`);
        }
        
        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Test message retrieval
      const messagesResponse = await this.apiClient.getMessages(this.conversationId, {
        include_usage: true
      });
      
      if (messagesResponse.success && messagesResponse.data.messages) {
        const messageCount = messagesResponse.data.messages.length;
        this.logger.success('Message retrieval successful', {
          messageCount,
          conversationId: this.conversationId
        });
      } else {
        throw new Error('Message retrieval failed');
      }
      
    } catch (error) {
      this.logger.error('Message exchange test failed', error);
      throw error;
    }
  }

  async testAssessmentIntegration() {
    this.logger.step('Test Assessment Integration', 4);
    
    try {
      // Test assessment readiness check
      const readinessResponse = await this.apiClient.client.get(`/chatbot/assessment-ready/${this.apiClient.userId}`);
      
      if (readinessResponse.data.has_assessment && readinessResponse.data.ready_for_chatbot) {
        this.logger.success('Assessment readiness check successful', {
          hasAssessment: readinessResponse.data.has_assessment,
          assessmentId: readinessResponse.data.assessment_id
        });
      } else {
        throw new Error('Assessment not ready for chatbot integration');
      }
      
      // Test conversation suggestions
      const suggestionsResponse = await this.apiClient.client.get(`/chatbot/conversations/${this.conversationId}/suggestions`);
      
      if (suggestionsResponse.data.success && suggestionsResponse.data.data.suggestions) {
        const suggestions = suggestionsResponse.data.data.suggestions;
        this.logger.success('Conversation suggestions retrieved', {
          suggestionCount: suggestions.length,
          assessmentBased: suggestionsResponse.data.data.context?.assessment_based
        });
        
        // Test sending a suggested message
        if (suggestions.length > 0) {
          const suggestionMessage = {
            content: suggestions[0],
            content_type: 'text'
          };
          
          const suggestionResponse = await this.apiClient.sendMessage(this.conversationId, suggestionMessage);
          
          if (suggestionResponse.success) {
            this.logger.success('Suggested message sent successfully');
          } else {
            throw new Error('Failed to send suggested message');
          }
        }
      } else {
        throw new Error('Failed to retrieve conversation suggestions');
      }
      
    } catch (error) {
      this.logger.error('Assessment integration test failed', error);
      throw error;
    }
  }

  async testConversationManagement() {
    this.logger.step('Test Conversation Management', 5);
    
    try {
      // Test conversation listing
      const conversationsResponse = await this.apiClient.getConversations({
        include_archived: false
      });
      
      if (conversationsResponse.success && conversationsResponse.data.conversations) {
        this.logger.success('Conversation listing successful', {
          conversationCount: conversationsResponse.data.conversations.length
        });
      } else {
        throw new Error('Conversation listing failed');
      }
      
      // Test conversation details
      const conversationResponse = await this.apiClient.getConversation(this.conversationId, {
        include_messages: true,
        message_limit: 10
      });
      
      if (conversationResponse.success && conversationResponse.data.id) {
        this.logger.success('Conversation details retrieved', {
          conversationId: conversationResponse.data.id,
          messageCount: conversationResponse.data.messages?.length || 0
        });
      } else {
        throw new Error('Failed to retrieve conversation details');
      }
      
      // Test conversation update
      const updateResponse = await this.apiClient.client.put(`/chatbot/conversations/${this.conversationId}`, {
        title: 'Updated Test Conversation',
        metadata: {
          updated_by_test: true
        }
      });
      
      if (updateResponse.data.success) {
        this.logger.success('Conversation updated successfully');
      } else {
        throw new Error('Conversation update failed');
      }
      
    } catch (error) {
      this.logger.error('Conversation management test failed', error);
      throw error;
    }
  }

  async testErrorScenarios() {
    this.logger.step('Test Error Scenarios', 6);
    
    try {
      // Test invalid conversation ID
      try {
        await this.apiClient.sendMessage('invalid-conversation-id', {
          content: 'Test message',
          content_type: 'text'
        });
        throw new Error('Invalid conversation ID should have failed');
      } catch (error) {
        if (error.response?.status === 404 || error.message.includes('not found')) {
          this.logger.success('Invalid conversation ID properly rejected');
        } else {
          throw error;
        }
      }
      
      // Test empty message
      try {
        await this.apiClient.sendMessage(this.conversationId, {
          content: '',
          content_type: 'text'
        });
        throw new Error('Empty message should have failed');
      } catch (error) {
        if (error.response?.status === 400 || error.message.includes('validation')) {
          this.logger.success('Empty message properly rejected');
        } else {
          throw error;
        }
      }
      
      // Test unauthorized access (clear token temporarily)
      const originalToken = this.apiClient.token;
      this.apiClient.clearAuth();
      
      try {
        await this.apiClient.getConversations();
        throw new Error('Unauthorized access should have failed');
      } catch (error) {
        if (error.response?.status === 401 || error.message.includes('unauthorized')) {
          this.logger.success('Unauthorized access properly rejected');
        } else {
          throw error;
        }
      }
      
      // Restore token
      this.apiClient.setToken(originalToken);
      
    } catch (error) {
      this.logger.error('Error scenarios test failed', error);
      throw error;
    }
  }

  async cleanup() {
    this.logger.step('Cleanup', 7);
    
    try {
      // Delete conversation if created
      if (this.conversationId) {
        try {
          await this.apiClient.client.delete(`/chatbot/conversations/${this.conversationId}`);
          this.logger.success('Test conversation deleted');
        } catch (error) {
          this.logger.warning('Failed to delete conversation (non-critical)', error);
        }
      }
      
      // Disconnect WebSocket
      if (this.wsClient) {
        this.wsClient.disconnect();
      }
      
      // Cleanup account if enabled
      if (process.env.ENABLE_CLEANUP === 'true') {
        await this.apiClient.deleteAccount();
        this.logger.success('Test account cleaned up');
      } else {
        this.logger.skip('Account cleanup', 'ENABLE_CLEANUP is not true');
      }
      
    } catch (error) {
      this.logger.warning('Cleanup error (non-critical)', error);
    }
  }
}

// Run test if called directly
if (require.main === module) {
  const test = new ChatbotTest();
  test.run()
    .then(() => {
      console.log('\n✅ Chatbot Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Chatbot Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = ChatbotTest;
