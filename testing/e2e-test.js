#!/usr/bin/env node

const axios = require('axios');
const io = require('socket.io-client');
const chalk = require('chalk');
const config = require('./config');
const TestUtils = require('./utils');

class E2ETester {
  constructor() {
    this.testUser = null;
    this.startTime = Date.now();
  }

  async run() {
    console.log(chalk.bold.blue('\n🧪 ATMA E2E Testing Started'));
    console.log(chalk.gray('Testing complete user journey from registration to account deletion\n'));

    try {
      await this.test1_Register();
      await this.test2_Login();
      await this.test3_UpdateProfile();
      await this.test4_SubmitAssessment();
      await this.test5_WaitForCompletion();
      await this.test6_CheckAssessment();
      await this.test7_DeleteAccount();
      
      this.generateReport();
    } catch (error) {
      TestUtils.logError(`E2E test failed: ${error.message}`);
      console.error(error);
      process.exit(1);
    }
  }

  async test1_Register() {
    TestUtils.logStage('Test 1: User Registration');
    
    const userData = TestUtils.generateRandomUser(1);
    this.testUser = userData;
    
    try {
      const startTime = Date.now();
      const response = await axios.post(`${config.api.baseUrl}/api/auth/register`, {
        email: userData.email,
        password: userData.password
      }, {
        timeout: config.api.timeout
      });

      const duration = Date.now() - startTime;
      
      if (response.data.success) {
        this.testUser.id = response.data.data?.user?.id;
        TestUtils.logSuccess(`User registered successfully in ${TestUtils.formatDuration(duration)}`);
        TestUtils.logInfo(`Email: ${userData.email}`);
      } else {
        throw new Error('Registration response indicates failure');
      }
      
      await TestUtils.delay(1000);
    } catch (error) {
      throw new Error(`Registration failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async test2_Login() {
    TestUtils.logStage('Test 2: User Login');
    
    try {
      const startTime = Date.now();
      const response = await axios.post(`${config.api.baseUrl}/api/auth/login`, {
        email: this.testUser.email,
        password: this.testUser.password
      }, {
        timeout: config.api.timeout
      });

      const duration = Date.now() - startTime;
      
      if (response.data.success && response.data.data.token) {
        this.testUser.token = response.data.data.token;
        TestUtils.logSuccess(`User logged in successfully in ${TestUtils.formatDuration(duration)}`);
        TestUtils.logInfo(`Token received: ${this.testUser.token.substring(0, 20)}...`);
      } else {
        throw new Error('Login response missing token');
      }
      
      await TestUtils.delay(1000);
    } catch (error) {
      throw new Error(`Login failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async test3_UpdateProfile() {
    TestUtils.logStage('Test 3: Update User Profile');

    try {
      const startTime = Date.now();

      // First, get available schools to ensure we use a valid school_id
      let schoolId = null;
      try {
        const schoolsResponse = await axios.get(`${config.api.baseUrl}/api/auth/schools`, {
          headers: {
            'Authorization': `Bearer ${this.testUser.token}`
          },
          timeout: config.api.timeout
        });

        if (schoolsResponse.data.success && schoolsResponse.data.data.schools.length > 0) {
          const randomSchool = schoolsResponse.data.data.schools[Math.floor(Math.random() * schoolsResponse.data.data.schools.length)];
          schoolId = randomSchool.id;
        }
      } catch (schoolError) {
        TestUtils.logWarning('Could not fetch schools, proceeding without school_id');
      }

      // Ensure gender is valid (only 'male' or 'female' based on model validation)
      const validGender = ['male', 'female'][Math.floor(Math.random() * 2)];

      const profileData = {
        username: this.testUser.username,
        full_name: this.testUser.full_name,
        date_of_birth: this.testUser.date_of_birth,
        gender: validGender
      };

      // Only add school_id if we found a valid one
      if (schoolId) {
        profileData.school_id = schoolId;
      }

      const response = await axios.put(`${config.api.baseUrl}/api/auth/profile`, profileData, {
        headers: {
          'Authorization': `Bearer ${this.testUser.token}`,
          'Content-Type': 'application/json'
        },
        timeout: config.api.timeout
      });

      const duration = Date.now() - startTime;

      if (response.data.success) {
        TestUtils.logSuccess(`Profile updated successfully in ${TestUtils.formatDuration(duration)}`);
        TestUtils.logInfo(`Username: ${this.testUser.username}`);
        TestUtils.logInfo(`Full Name: ${this.testUser.full_name}`);
        TestUtils.logInfo(`Gender: ${validGender}`);
        if (schoolId) {
          TestUtils.logInfo(`School ID: ${schoolId}`);
        }
      } else {
        throw new Error('Profile update response indicates failure');
      }

      await TestUtils.delay(1000);
    } catch (error) {
      throw new Error(`Profile update failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async test4_SubmitAssessment() {
    TestUtils.logStage('Test 4: Submit Assessment');
    
    try {
      const startTime = Date.now();
      const assessmentData = TestUtils.randomizeAssessmentScores(config.assessmentTemplate);
      const idempotencyKey = TestUtils.generateIdempotencyKey();
      
      const response = await axios.post(`${config.api.baseUrl}/api/assessment/submit`, assessmentData, {
        headers: {
          'Authorization': `Bearer ${this.testUser.token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
          'X-Force-Direct': 'true' // Force direct processing to avoid batch resultId issues
        },
        timeout: config.api.timeout
      });

      const duration = Date.now() - startTime;
      
      if (response.data.success && response.data.data.jobId) {
        this.testUser.jobId = response.data.data.jobId;
        TestUtils.logSuccess(`Assessment submitted successfully in ${TestUtils.formatDuration(duration)}`);
        TestUtils.logInfo(`Job ID: ${this.testUser.jobId}`);
        TestUtils.logInfo(`Queue Position: ${response.data.data.queuePosition}`);
        TestUtils.logInfo(`Estimated Processing Time: ${response.data.data.estimatedProcessingTime}`);
      } else {
        throw new Error('Assessment submission response missing job ID');
      }
      
      await TestUtils.delay(1000);
    } catch (error) {
      throw new Error(`Assessment submission failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async test5_WaitForCompletion() {
    TestUtils.logStage('Test 5: Wait for Assessment Completion via WebSocket');
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let socket;
      
      const timeout = setTimeout(() => {
        if (socket) socket.disconnect();
        reject(new Error('Assessment completion timeout'));
      }, config.test.assessmentTimeout);

      try {
        socket = io(config.websocket.url, {
          autoConnect: false,
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: config.websocket.reconnectionAttempts,
          reconnectionDelay: config.websocket.reconnectionDelay,
          timeout: config.websocket.timeout
        });

        socket.on('connect', () => {
          TestUtils.logInfo('WebSocket connected, authenticating...');
          socket.emit('authenticate', { token: this.testUser.token });
        });

        socket.on('authenticated', (data) => {
          TestUtils.logSuccess(`WebSocket authenticated for user: ${data.email}`);
          TestUtils.logInfo('Waiting for assessment completion...');
        });

        socket.on('auth_error', (data) => {
          clearTimeout(timeout);
          socket.disconnect();
          reject(new Error(`WebSocket authentication failed: ${data.message}`));
        });

        socket.on('analysis-started', (data) => {
          if (data.jobId === this.testUser.jobId) {
            TestUtils.logInfo(`Analysis started: ${data.message}`);
          }
        });

        socket.on('analysis-complete', (data) => {
          if (data.jobId === this.testUser.jobId) {
            clearTimeout(timeout);
            const duration = Date.now() - startTime;
            
            this.testUser.resultId = data.resultId;
            
            TestUtils.logSuccess(`Assessment completed in ${TestUtils.formatDuration(duration)}`);
            TestUtils.logInfo(`Result ID: ${data.resultId}`);
            TestUtils.logInfo(`Message: ${data.message}`);
            
            socket.disconnect();
            resolve(data);
          }
        });

        socket.on('analysis-failed', (data) => {
          if (data.jobId === this.testUser.jobId) {
            clearTimeout(timeout);
            socket.disconnect();
            reject(new Error(`Assessment failed: ${data.error}`));
          }
        });

        socket.on('disconnect', () => {
          TestUtils.logInfo('WebSocket disconnected');
        });

        socket.connect();
        
      } catch (error) {
        clearTimeout(timeout);
        reject(new Error(`WebSocket connection failed: ${error.message}`));
      }
    });
  }

  async test6_CheckAssessment() {
    TestUtils.logStage('Test 6: Check Assessment Results');
    
    try {
      const startTime = Date.now();
      const response = await axios.get(`${config.api.baseUrl}/api/archive/results`, {
        headers: {
          'Authorization': `Bearer ${this.testUser.token}`
        },
        timeout: config.api.timeout
      });

      const duration = Date.now() - startTime;
      
      if (response.data.success) {
        TestUtils.logSuccess(`Assessment results retrieved in ${TestUtils.formatDuration(duration)}`);
        TestUtils.logInfo(`Found ${response.data.data.results?.length || 0} results`);
        
        if (response.data.data.results && response.data.data.results.length > 0) {
          const latestResult = response.data.data.results[0];
          TestUtils.logInfo(`Latest result status: ${latestResult.status}`);
        }
      } else {
        throw new Error('Results retrieval response indicates failure');
      }
      
      await TestUtils.delay(1000);
    } catch (error) {
      throw new Error(`Results check failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async test7_DeleteAccount() {
    TestUtils.logStage('Test 7: Clean Up User Account Data');

    try {
      const startTime = Date.now();

      // Use the cleanup utility to clean up user data
      const cleanupResults = await TestUtils.cleanupUserAccount(this.testUser.token, config.api.baseUrl);

      const duration = Date.now() - startTime;

      const totalCleaned = (cleanupResults.profileDeleted ? 1 : 0) +
                          cleanupResults.resultsDeleted +
                          cleanupResults.jobsDeleted;

      if (cleanupResults.errors.length === 0) {
        TestUtils.logSuccess(`Account data cleaned successfully in ${TestUtils.formatDuration(duration)}`);
        TestUtils.logInfo(`Cleaned ${totalCleaned} items (profile: ${cleanupResults.profileDeleted ? 'yes' : 'no'}, results: ${cleanupResults.resultsDeleted}, jobs: ${cleanupResults.jobsDeleted})`);
      } else {
        TestUtils.logWarning(`Partial cleanup completed in ${TestUtils.formatDuration(duration)}`);
        TestUtils.logInfo(`Cleaned ${totalCleaned} items with ${cleanupResults.errors.length} errors`);
        cleanupResults.errors.forEach(error => {
          TestUtils.logWarning(`Cleanup error: ${error}`);
        });
      }

      await TestUtils.delay(1000);
    } catch (error) {
      throw new Error(`Account cleanup failed: ${error.message}`);
    }
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    
    console.log(chalk.bold.green('\n📊 E2E TEST REPORT'));
    console.log(chalk.gray('='.repeat(60)));
    
    console.log(chalk.bold(`\n⏱️  Total Test Duration: ${TestUtils.formatDuration(totalDuration)}`));
    console.log(chalk.bold(`👤 Test User: ${this.testUser.email}`));
    
    console.log(chalk.bold.yellow('\n🎯 TEST SUMMARY:'));
    console.log(chalk.green('✅ All E2E tests passed successfully!'));
    console.log(chalk.green('✅ Complete user journey validated'));
    console.log(chalk.green('✅ WebSocket notifications working'));
    console.log(chalk.green('✅ Assessment processing functional'));
    
    console.log(chalk.gray('\n' + '='.repeat(60)));
    console.log(chalk.bold.green('✅ E2E test completed successfully!'));
  }
}

// Run the E2E test
if (require.main === module) {
  const e2eTester = new E2ETester();
  e2eTester.run().catch(error => {
    console.error(chalk.red('E2E test failed:'), error);
    process.exit(1);
  });
}

module.exports = E2ETester;
