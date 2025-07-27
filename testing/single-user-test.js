require('dotenv').config();
const APIClient = require('./lib/api-client');
const WebSocketClient = require('./lib/websocket-client');
const TestDataGenerator = require('./lib/test-data');
const TestLogger = require('./lib/test-logger');

class SingleUserTest {
  constructor() {
    this.logger = TestLogger.create('single-user-test');
    this.dataGenerator = new TestDataGenerator();
    this.apiClient = new APIClient();
    this.wsClient = new WebSocketClient();
    this.testData = null;
    this.jobId = null;
    this.resultId = null;
    this.conversationId = null;
    this.personaProfile = null;
  }

  async run() {
    try {
      this.logger.info('Starting Single User E2E Test');
      
      // Generate test data
      await this.generateTestData();
      
      // Execute test flow
      await this.registerUser();
      await this.loginUser();
      await this.connectWebSocket();
      await this.updateProfile();
      await this.submitAssessment();
      await this.waitForNotification();
      await this.getProfilePersona();
      await this.testChatbot();
      await this.cleanup();
      
      this.logger.success('Single User E2E Test completed successfully');
      
    } catch (error) {
      this.logger.error('Single User E2E Test failed', error);
      throw error;
    } finally {
      await this.disconnect();
      await this.logger.saveReport();
    }
  }

  async generateTestData() {
    this.logger.step('Generate Test Data', 1);
    
    this.testData = {
      user: this.dataGenerator.generateRandomUser(),
      profileUpdate: this.dataGenerator.generateProfileUpdate(),
      assessment: this.dataGenerator.generateAssessmentData(),
      conversation: this.dataGenerator.generateChatbotConversation(),
      messages: this.dataGenerator.generateChatMessages()
    };
    
    this.logger.success('Test data generated', {
      email: this.testData.user.email,
      username: this.testData.user.username
    });
  }

  async registerUser() {
    this.logger.step('Register User', 2);
    
    try {
      const response = await this.apiClient.register(this.testData.user);
      
      if (response.success && response.data.user && response.data.token) {
        this.logger.success('User registered successfully', {
          userId: response.data.user.id,
          email: response.data.user.email
        });
      } else {
        throw new Error('Registration response missing required data');
      }
    } catch (error) {
      this.logger.error('User registration failed', error);
      throw error;
    }
  }

  async loginUser() {
    this.logger.step('Login User', 3);
    
    try {
      const credentials = {
        email: this.testData.user.email,
        password: this.testData.user.password
      };
      
      const response = await this.apiClient.login(credentials);
      
      if (response.success && response.data.token) {
        this.logger.success('User logged in successfully');
      } else {
        throw new Error('Login response missing token');
      }
    } catch (error) {
      this.logger.error('User login failed', error);
      throw error;
    }
  }

  async connectWebSocket() {
    this.logger.step('Connect WebSocket', 4);
    
    try {
      await this.wsClient.connect();
      await this.wsClient.authenticate(this.apiClient.token);
      
      this.logger.success('WebSocket connected and authenticated');
    } catch (error) {
      this.logger.error('WebSocket connection failed', error);
      throw error;
    }
  }

  async updateProfile() {
    this.logger.step('Update Profile', 5);
    
    try {
      const response = await this.apiClient.updateProfile(this.testData.profileUpdate);
      
      if (response.success) {
        this.logger.success('Profile updated successfully', {
          username: this.testData.profileUpdate.username
        });
      } else {
        throw new Error('Profile update failed');
      }
    } catch (error) {
      this.logger.error('Profile update failed', error);
      throw error;
    }
  }

  async submitAssessment() {
    this.logger.step('Submit Assessment', 6);
    
    try {
      const response = await this.apiClient.submitAssessment(this.testData.assessment);
      
      if (response.success && response.data.jobId) {
        this.jobId = response.data.jobId;
        this.logger.success('Assessment submitted successfully', {
          jobId: this.jobId,
          status: response.data.status
        });
      } else {
        throw new Error('Assessment submission failed');
      }
    } catch (error) {
      this.logger.error('Assessment submission failed', error);
      throw error;
    }
  }

  async waitForNotification() {
    this.logger.step('Wait for WebSocket Notification', 7);
    
    try {
      this.logger.info('Waiting for assessment completion notification...');
      
      const notification = await this.wsClient.waitForAssessmentComplete(
        this.jobId, 
        parseInt(process.env.ASSESSMENT_TIMEOUT) || 300000
      );
      
      this.resultId = notification.resultId;
      this.logger.success('Assessment completion notification received', {
        jobId: notification.jobId,
        resultId: this.resultId
      });
      
    } catch (error) {
      this.logger.error('Failed to receive notification', error);
      throw error;
    }
  }

  async getProfilePersona() {
    this.logger.step('Get Profile Persona', 8);

    try {
      if (!this.resultId) {
        throw new Error('No result ID available');
      }

      // Add delay to allow batch processing to complete
      // The analysis worker uses batch processing with a 5-second interval
      this.logger.info('Waiting for batch processing to complete...');
      await new Promise(resolve => setTimeout(resolve, 6000)); // 6 seconds to be safe

      const response = await this.apiClient.getResult(this.resultId);

      if (response.success && response.data.persona_profile) {
        // Store persona profile for chatbot conversation creation
        this.personaProfile = response.data.persona_profile;

        this.logger.success('Profile persona retrieved successfully', {
          archetype: response.data.persona_profile.archetype,
          careerCount: response.data.persona_profile.careerRecommendation?.length || 0
        });
      } else {
        throw new Error('Failed to retrieve persona profile');
      }
    } catch (error) {
      this.logger.error('Failed to get profile persona', error);
      throw error;
    }
  }

  async testChatbot() {
    this.logger.step('Test Chatbot', 9);
    
    try {
      // Create conversation from assessment
      const convResponse = await this.apiClient.createConversationFromAssessment({
        assessment_id: this.resultId,
        title: this.testData.conversation.title,
        auto_start_message: true
      });
      
      if (convResponse.success && convResponse.data.conversation) {
        this.conversationId = convResponse.data.conversation.id;
        this.logger.success('Chatbot conversation created', {
          conversationId: this.conversationId
        });
      } else {
        throw new Error('Failed to create chatbot conversation');
      }
      
      // Send test messages
      for (let i = 0; i < this.testData.messages.length; i++) {
        const message = this.testData.messages[i];
        
        this.logger.info(`Sending message ${i + 1}/${this.testData.messages.length}`);
        
        const msgResponse = await this.apiClient.sendMessage(this.conversationId, message);
        
        if (msgResponse.success) {
          this.logger.success(`Message ${i + 1} sent and responded`, {
            userMessage: message.content.substring(0, 50) + '...',
            assistantResponse: msgResponse.data.assistant_message?.content?.substring(0, 50) + '...'
          });
        } else {
          throw new Error(`Failed to send message ${i + 1}`);
        }
        
        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      this.logger.success('Chatbot interaction completed successfully');
      
    } catch (error) {
      this.logger.error('Chatbot test failed', error);
      throw error;
    }
  }

  async cleanup() {
    if (process.env.ENABLE_CLEANUP !== 'true') {
      this.logger.skip('Account cleanup', 'ENABLE_CLEANUP is not true');
      return;
    }
    
    this.logger.step('Cleanup Test Account', 10);
    
    try {
      await this.apiClient.deleteAccount();
      this.logger.success('Test account cleaned up successfully');
    } catch (error) {
      this.logger.warning('Account cleanup failed (non-critical)', error);
    }
  }

  async disconnect() {
    try {
      if (this.wsClient) {
        this.wsClient.disconnect();
      }
      this.logger.info('Disconnected from services');
    } catch (error) {
      this.logger.warning('Disconnect error (non-critical)', error);
    }
  }
}

// Run test if called directly
if (require.main === module) {
  const test = new SingleUserTest();
  test.run()
    .then(() => {
      console.log('\n✅ Single User Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Single User Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = SingleUserTest;
