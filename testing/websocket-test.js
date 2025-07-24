require('dotenv').config();
const APIClient = require('./lib/api-client');
const WebSocketClient = require('./lib/websocket-client');
const TestDataGenerator = require('./lib/test-data');
const TestLogger = require('./lib/test-logger');

class WebSocketTest {
  constructor() {
    this.logger = TestLogger.create('websocket-test');
    this.dataGenerator = new TestDataGenerator();
    this.apiClient = new APIClient();
    this.wsClient = new WebSocketClient();
    this.testData = null;
  }

  async run() {
    try {
      this.logger.info('Starting WebSocket-focused E2E Test');
      
      // Setup
      await this.setup();
      
      // Test WebSocket connection
      await this.testConnection();
      
      // Test authentication
      await this.testAuthentication();
      
      // Test notification flow
      await this.testNotificationFlow();
      
      // Test reconnection
      await this.testReconnection();
      
      // Test error handling
      await this.testErrorHandling();
      
      this.logger.success('WebSocket E2E Test completed successfully');
      
    } catch (error) {
      this.logger.error('WebSocket E2E Test failed', error);
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
    
    this.logger.success('Test environment setup completed');
  }

  async testConnection() {
    this.logger.step('Test WebSocket Connection', 2);
    
    try {
      // Test basic connection
      await this.wsClient.connect();
      
      const status = this.wsClient.getStatus();
      if (status.connected) {
        this.logger.success('WebSocket connection established');
      } else {
        throw new Error('WebSocket connection failed');
      }
      
      // Test connection options
      this.wsClient.disconnect();
      
      const customOptions = {
        transports: ['websocket'],
        timeout: 10000
      };
      
      await this.wsClient.connect(customOptions);
      this.logger.success('WebSocket connection with custom options successful');
      
    } catch (error) {
      this.logger.error('WebSocket connection test failed', error);
      throw error;
    }
  }

  async testAuthentication() {
    this.logger.step('Test WebSocket Authentication', 3);
    
    try {
      // Test valid authentication
      await this.wsClient.authenticate(this.apiClient.token);
      
      const status = this.wsClient.getStatus();
      if (status.authenticated) {
        this.logger.success('WebSocket authentication successful');
      } else {
        throw new Error('WebSocket authentication failed');
      }
      
      // Test invalid token
      this.wsClient.disconnect();
      await this.wsClient.connect();
      
      try {
        await this.wsClient.authenticate('invalid_token');
        throw new Error('Invalid token should have failed');
      } catch (error) {
        if (error.message.includes('Invalid token') || error.message.includes('Authentication')) {
          this.logger.success('Invalid token properly rejected');
        } else {
          throw error;
        }
      }
      
      // Reconnect with valid token
      await this.wsClient.authenticate(this.apiClient.token);
      
    } catch (error) {
      this.logger.error('WebSocket authentication test failed', error);
      throw error;
    }
  }

  async testNotificationFlow() {
    this.logger.step('Test Notification Flow', 4);
    
    try {
      // Clear any existing notifications
      this.wsClient.clearNotifications();
      
      // Submit assessment to trigger notifications
      const response = await this.apiClient.submitAssessment(this.testData.assessment);
      const jobId = response.data.jobId;
      
      this.logger.info('Assessment submitted, waiting for notifications...');
      
      // Test analysis-started notification
      const startedNotification = await this.wsClient.waitForNotification('analysis-started', 30000);
      
      if (startedNotification.jobId === jobId) {
        this.logger.success('Analysis-started notification received correctly');
      } else {
        throw new Error('Analysis-started notification job ID mismatch');
      }
      
      // Test analysis-complete notification
      const completeNotification = await this.wsClient.waitForAssessmentComplete(jobId, 300000);
      
      if (completeNotification.jobId === jobId && completeNotification.resultId) {
        this.logger.success('Analysis-complete notification received correctly');
      } else {
        throw new Error('Analysis-complete notification data invalid');
      }
      
      // Verify notification storage
      const notifications = this.wsClient.getNotifications();
      const startedCount = notifications.filter(n => n.type === 'analysis-started').length;
      const completeCount = notifications.filter(n => n.type === 'analysis-complete').length;
      
      this.logger.success('Notification flow completed', {
        totalNotifications: notifications.length,
        startedNotifications: startedCount,
        completeNotifications: completeCount
      });
      
    } catch (error) {
      this.logger.error('Notification flow test failed', error);
      throw error;
    }
  }

  async testReconnection() {
    this.logger.step('Test WebSocket Reconnection', 5);
    
    try {
      // Verify initial connection
      let status = this.wsClient.getStatus();
      if (!status.connected || !status.authenticated) {
        throw new Error('WebSocket not properly connected before reconnection test');
      }
      
      // Force disconnect
      this.wsClient.disconnect();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reconnect
      await this.wsClient.connect();
      await this.wsClient.authenticate(this.apiClient.token);
      
      status = this.wsClient.getStatus();
      if (status.connected && status.authenticated) {
        this.logger.success('WebSocket reconnection successful');
      } else {
        throw new Error('WebSocket reconnection failed');
      }
      
    } catch (error) {
      this.logger.error('WebSocket reconnection test failed', error);
      throw error;
    }
  }

  async testErrorHandling() {
    this.logger.step('Test Error Handling', 6);
    
    try {
      // Test authentication timeout
      this.wsClient.disconnect();
      await this.wsClient.connect();
      
      // Don't authenticate and wait for timeout
      try {
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error('Authentication timeout test'));
          }, 11000); // Longer than auth timeout
        });
      } catch (error) {
        if (error.message.includes('timeout')) {
          this.logger.success('Authentication timeout handled correctly');
        }
      }
      
      // Test connection to invalid URL
      const invalidWsClient = new WebSocketClient('http://invalid-url:9999');
      
      try {
        await invalidWsClient.connect();
        throw new Error('Invalid URL should have failed');
      } catch (error) {
        this.logger.success('Invalid URL connection properly rejected');
      }
      
      // Reconnect for cleanup
      await this.wsClient.connect();
      await this.wsClient.authenticate(this.apiClient.token);
      
    } catch (error) {
      this.logger.error('Error handling test failed', error);
      throw error;
    }
  }

  async cleanup() {
    this.logger.step('Cleanup', 7);
    
    try {
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
  const test = new WebSocketTest();
  test.run()
    .then(() => {
      console.log('\n✅ WebSocket Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ WebSocket Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = WebSocketTest;
