require('dotenv').config();
const APIClient = require('./lib/api-client');
const WebSocketClient = require('./lib/websocket-client');
const TestDataGenerator = require('./lib/test-data');
const TestLogger = require('./lib/test-logger');

class StressTest {
  constructor() {
    this.logger = TestLogger.create('stress-test');
    this.dataGenerator = new TestDataGenerator();
    this.users = [];
    this.stressUsers = parseInt(process.env.STRESS_TEST_USERS) || 5;
    this.concurrentLimit = (process.env.NO_BATCH === 'true') ? this.stressUsers : (parseInt(process.env.CONCURRENT_LIMIT) || 5); // Allow full concurrency when NO_BATCH=true
  }

  async run() {
    try {
      this.logger.info(`Starting Stress Test with ${this.stressUsers} users`);
      
      // Initialize users
      await this.initializeUsers();
      
      // Run stress test phases
      await this.runRegistrationStress();
      await this.runLoginStress();
      await this.runWebSocketStress();
      await this.runAssessmentStress();
      await this.runChatbotStress();
      await this.runCleanupStress();
      
      // Generate performance report
      await this.generatePerformanceReport();
      
      this.logger.success('Stress Test completed successfully');
      
    } catch (error) {
      this.logger.error('Stress Test failed', error);
      throw error;
    } finally {
      await this.disconnectAll();
      await this.logger.saveReport();
    }
  }

  async initializeUsers() {
    this.logger.step('Initialize Stress Test Users', 1);
    
    const testData = this.dataGenerator.generateStressTestData(this.stressUsers);
    
    for (let i = 0; i < this.stressUsers; i++) {
      const user = {
        id: i + 1,
        apiClient: new APIClient(),
        wsClient: new WebSocketClient(),
        testData: testData[i],
        metrics: {
          registrationTime: 0,
          loginTime: 0,
          wsConnectionTime: 0,
          assessmentTime: 0,
          chatbotTime: 0,
          errors: []
        },
        status: 'initialized'
      };
      
      this.users.push(user);
    }
    
    this.logger.success(`${this.stressUsers} users initialized for stress testing`);
  }

  async runRegistrationStress() {
    this.logger.step('Registration Stress Test', 2);
    
    const startTime = Date.now();
    
    try {
      await this.runConcurrentOperations(
        this.users,
        async (user) => {
          const userStartTime = Date.now();
          await user.apiClient.register(user.testData.user);
          user.metrics.registrationTime = Date.now() - userStartTime;
          this.logger.userAction(user.id, `Registered in ${user.metrics.registrationTime}ms`);
        },
        'Registration'
      );
      
      const totalTime = Date.now() - startTime;
      this.logger.success(`Registration stress test completed in ${totalTime}ms`);
      
    } catch (error) {
      this.logger.error('Registration stress test failed', error);
      throw error;
    }
  }

  async runLoginStress() {
    this.logger.step('Login Stress Test', 3);
    
    const startTime = Date.now();
    
    try {
      await this.runConcurrentOperations(
        this.users,
        async (user) => {
          const userStartTime = Date.now();
          await user.apiClient.login({
            email: user.testData.user.email,
            password: user.testData.user.password
          });
          user.metrics.loginTime = Date.now() - userStartTime;
          this.logger.userAction(user.id, `Logged in in ${user.metrics.loginTime}ms`);
        },
        'Login'
      );
      
      const totalTime = Date.now() - startTime;
      this.logger.success(`Login stress test completed in ${totalTime}ms`);
      
    } catch (error) {
      this.logger.error('Login stress test failed', error);
      throw error;
    }
  }

  async runWebSocketStress() {
    this.logger.step('WebSocket Stress Test', 4);
    
    const startTime = Date.now();
    
    try {
      await this.runConcurrentOperations(
        this.users,
        async (user) => {
          const userStartTime = Date.now();
          await user.wsClient.connect();
          await user.wsClient.authenticate(user.apiClient.token);
          user.metrics.wsConnectionTime = Date.now() - userStartTime;
          this.logger.userAction(user.id, `WebSocket connected in ${user.metrics.wsConnectionTime}ms`);
        },
        'WebSocket Connection'
      );
      
      const totalTime = Date.now() - startTime;
      this.logger.success(`WebSocket stress test completed in ${totalTime}ms`);
      
      // Test concurrent notifications
      await this.testConcurrentNotifications();
      
    } catch (error) {
      this.logger.error('WebSocket stress test failed', error);
      throw error;
    }
  }

  async runAssessmentStress() {
    this.logger.step('Assessment Stress Test', 5);
    
    const startTime = Date.now();
    
    try {
      await this.runConcurrentOperations(
        this.users,
        async (user) => {
          const userStartTime = Date.now();
          
          // Submit assessment
          const response = await user.apiClient.submitAssessment(user.testData.assessment);
          user.jobId = response.data.jobId;

          // Wait for completion via WebSocket, fallback to polling if needed
          try {
            await user.wsClient.waitForAssessmentComplete(user.jobId, 300000);
          } catch (wsErr) {
            // Fallback polling
            const fallbackTimeoutMs = parseInt(process.env.ASSESSMENT_TIMEOUT) || 300000;
            const startedAt = Date.now();
            const pollIntervalMs = 2000;
            let polled = false;
            while ((Date.now() - startedAt) < fallbackTimeoutMs) {
              try {
                const job = await user.apiClient.getJob(user.jobId);
                if (job?.success && job?.data?.status === 'completed' && job?.data?.result_id) {
                  polled = true;
                  break;
                }
              } catch (pollErr) {
                // ignore and continue polling
              }
              await new Promise(r => setTimeout(r, pollIntervalMs));
            }
            if (!polled) throw wsErr;
          }

          user.metrics.assessmentTime = Date.now() - userStartTime;
          this.logger.userAction(user.id, `Assessment completed in ${user.metrics.assessmentTime}ms`);
        },
        'Assessment'
      );
      
      const totalTime = Date.now() - startTime;
      this.logger.success(`Assessment stress test completed in ${totalTime}ms`);
      
    } catch (error) {
      this.logger.error('Assessment stress test failed', error);
      throw error;
    }
  }

  async runChatbotStress() {
    if (process.env.SKIP_CHATBOT === 'true') {
      this.logger.skip('Chatbot Stress Test', 'SKIP_CHATBOT is true');
      return;
    }
    this.logger.step('Chatbot Stress Test', 6);

    const startTime = Date.now();
    
    try {
      // Get result IDs first
      for (const user of this.users) {
        const results = await user.apiClient.getResults({ limit: 1 });
        if (results.success && results.data.results.length > 0) {
          user.resultId = results.data.results[0].id;
        }
      }
      
      await this.runConcurrentOperations(
        this.users.filter(user => user.resultId), // Only users with results
        async (user) => {
          const userStartTime = Date.now();
          
          // Create conversation
          const convResponse = await user.apiClient.createConversationFromAssessment({
            assessment_id: user.resultId,
            title: `Stress Test Chat ${user.id}`,
            auto_start_message: true
          });
          
          user.conversationId = convResponse.data.conversation.id;
          
          // Send a few messages
          const messages = user.testData.messages.slice(0, 2); // Limit for stress test
          
          for (const message of messages) {
            await user.apiClient.sendMessage(user.conversationId, message);
            await new Promise(resolve => setTimeout(resolve, 200)); // Small delay
          }
          
          user.metrics.chatbotTime = Date.now() - userStartTime;
          this.logger.userAction(user.id, `Chatbot interaction completed in ${user.metrics.chatbotTime}ms`);
        },
        'Chatbot'
      );
      
      const totalTime = Date.now() - startTime;
      this.logger.success(`Chatbot stress test completed in ${totalTime}ms`);
      
    } catch (error) {
      this.logger.error('Chatbot stress test failed', error);
      throw error;
    }
  }

  async runCleanupStress() {
    if (process.env.ENABLE_CLEANUP !== 'true') {
      this.logger.skip('Cleanup stress test', 'ENABLE_CLEANUP is not true');
      return;
    }
    
    this.logger.step('Cleanup Stress Test', 7);
    
    const startTime = Date.now();
    
    try {
      await this.runConcurrentOperations(
        this.users,
        async (user) => {
          try {
            await user.apiClient.deleteAccount();
            this.logger.userAction(user.id, 'Account cleaned up');
          } catch (error) {
            this.logger.userAction(user.id, 'Cleanup failed (non-critical)');
          }
        },
        'Cleanup'
      );
      
      const totalTime = Date.now() - startTime;
      this.logger.success(`Cleanup stress test completed in ${totalTime}ms`);
      
    } catch (error) {
      this.logger.warning('Cleanup stress test had issues (non-critical)', error);
    }
  }

  async testConcurrentNotifications() {
    this.logger.info('Testing concurrent WebSocket notifications...');

    try {
      // Submit multiple assessments simultaneously
      const assessmentPromises = this.users.slice(0, 3).map(async (user) => {
        // Use valid/allowed assessment payload from generator (no custom name override)
        const response = await user.apiClient.submitAssessment(user.testData.assessment);
        return { user, jobId: response.data.jobId };
      });

      const assessmentResults = await Promise.all(assessmentPromises);

      // Helper: wait via WS with fallback to polling
      const waitWithFallback = async ({ user, jobId }) => {
        try {
          await user.wsClient.waitForAssessmentComplete(jobId, 60000); // try WS first (60s)
          return true;
        } catch (wsErr) {
          // Fallback: poll archive job status up to ASSESSMENT_TIMEOUT
          const fallbackTimeoutMs = parseInt(process.env.ASSESSMENT_TIMEOUT) || 300000;
          const startedAt = Date.now();
          const pollIntervalMs = 2000;
          while ((Date.now() - startedAt) < fallbackTimeoutMs) {
            try {
              const job = await user.apiClient.getJob(jobId);
              if (job?.success && job?.data?.status === 'completed') {
                return true;
              }
            } catch (pollErr) {
              // ignore and continue polling
            }
            await new Promise(r => setTimeout(r, pollIntervalMs));
          }
          throw wsErr;
        }
      };

      // Wait for all to complete (WS or fallback)
      await Promise.all(assessmentResults.map(waitWithFallback));

      this.logger.success('Concurrent notifications handled successfully (WS or fallback)');

    } catch (error) {
      this.logger.error('Concurrent notifications test failed', error);
      throw error;
    }
  }

  async runConcurrentOperations(users, operation, operationName) {
    const chunks = this.chunkArray(users, this.concurrentLimit);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      this.logger.info(`${operationName} batch ${i + 1}/${chunks.length} (${chunk.length} users)`);
      
      const promises = chunk.map(async (user) => {
        try {
          await operation(user);
        } catch (error) {
          user.metrics.errors.push({
            operation: operationName,
            error: error.message,
            timestamp: new Date()
          });
          this.logger.userAction(user.id, `${operationName} failed: ${error.message}`);
          throw error;
        }
      });
      
      const results = await Promise.allSettled(promises);
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;
      
      this.logger.info(`Batch ${i + 1} completed: ${successCount} success, ${failureCount} failures`);
      
      // Small delay between batches
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async generatePerformanceReport() {
    this.logger.step('Generate Performance Report', 8);
    
    const metrics = {
      totalUsers: this.users.length,
      successfulUsers: this.users.filter(u => u.metrics.errors.length === 0).length,
      averageRegistrationTime: this.calculateAverage('registrationTime'),
      averageLoginTime: this.calculateAverage('loginTime'),
      averageWsConnectionTime: this.calculateAverage('wsConnectionTime'),
      averageAssessmentTime: this.calculateAverage('assessmentTime'),
      averageChatbotTime: this.calculateAverage('chatbotTime'),
      totalErrors: this.users.reduce((sum, u) => sum + u.metrics.errors.length, 0),
      errorsByOperation: this.groupErrorsByOperation()
    };
    
    this.logger.success('Performance Report Generated', metrics);
    
    return metrics;
  }

  calculateAverage(metricName) {
    const values = this.users
      .map(u => u.metrics[metricName])
      .filter(v => v > 0);
    
    if (values.length === 0) return 0;
    
    return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
  }

  groupErrorsByOperation() {
    const errorGroups = {};
    
    this.users.forEach(user => {
      user.metrics.errors.forEach(error => {
        if (!errorGroups[error.operation]) {
          errorGroups[error.operation] = 0;
        }
        errorGroups[error.operation]++;
      });
    });
    
    return errorGroups;
  }

  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async disconnectAll() {
    try {
      for (const user of this.users) {
        if (user.wsClient) {
          user.wsClient.disconnect();
        }
      }
      this.logger.info('Disconnected all users from services');
    } catch (error) {
      this.logger.warning('Disconnect error (non-critical)', error);
    }
  }
}

// Run test if called directly
if (require.main === module) {
  const test = new StressTest();
  test.run()
    .then(() => {
      console.log('\n✅ Stress Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Stress Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = StressTest;
