#!/usr/bin/env node

const axios = require('axios');
const io = require('socket.io-client');
const chalk = require('chalk');
const cliProgress = require('cli-progress');
const config = require('./config');
const TestUtils = require('./utils');

class LoadTester {
  constructor() {
    this.users = [];
    this.results = {
      register: { durations: [], successes: 0, failures: 0 },
      login: { durations: [], successes: 0, failures: 0 },
      updateProfile: { durations: [], successes: 0, failures: 0 },
      submitAssessment: { durations: [], successes: 0, failures: 0 },
      waitForCompletion: { durations: [], successes: 0, failures: 0 },
      checkAssessment: { durations: [], successes: 0, failures: 0 },
      deleteAccount: { durations: [], successes: 0, failures: 0 }
    };
    this.startTime = Date.now();
  }

  async run() {
    console.log(chalk.bold.blue('\n🚀 ATMA Load Testing Started'));
    console.log(chalk.gray(`Testing ${config.test.userCount} users with ${config.test.concurrency} concurrent operations\n`));

    try {
      await this.stage1_Register();
      await this.stage2_Login();
      await this.stage3_UpdateProfile();
      await this.stage4_SubmitAssessment();
      await this.stage5_WaitForCompletion();
      await this.stage6_CheckAssessment();
      await this.stage7_DeleteAccounts();
      
      this.generateReport();
    } catch (error) {
      TestUtils.logError(`Load test failed: ${error.message}`);
      console.error(error);
    }
  }

  async stage1_Register() {
    TestUtils.logStage('Stage 1: User Registration');
    
    const progressBar = new cliProgress.SingleBar({
      format: 'Progress |{bar}| {percentage}% | {value}/{total} users | ETA: {eta}s',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
    
    progressBar.start(config.test.userCount, 0);

    const tasks = [];
    for (let i = 1; i <= config.test.userCount; i++) {
      tasks.push(() => this.registerUser(i, progressBar));
    }

    const { results, errors } = await TestUtils.executeConcurrently(tasks, config.test.concurrency);
    
    progressBar.stop();
    
    this.results.register.successes = results.length;
    this.results.register.failures = errors.length;
    
    TestUtils.logSuccess(`Registered ${results.length}/${config.test.userCount} users`);
    if (errors.length > 0) {
      TestUtils.logError(`Failed to register ${errors.length} users`);
    }
    
    await TestUtils.delay(config.test.delayBetweenStages);
  }

  async registerUser(index, progressBar) {
    const startTime = Date.now();
    const userData = TestUtils.generateRandomUser(index);
    
    try {
      const response = await axios.post(`${config.api.baseUrl}/api/auth/register`, {
        email: userData.email,
        password: userData.password
      }, {
        timeout: config.api.timeout
      });

      const duration = Date.now() - startTime;
      this.results.register.durations.push(duration);
      
      this.users.push({
        ...userData,
        id: response.data.data?.user?.id,
        registered: true
      });
      
      progressBar.increment();
      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.register.durations.push(duration);
      progressBar.increment();
      throw new Error(`Registration failed for ${userData.email}: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async stage2_Login() {
    TestUtils.logStage('Stage 2: User Login');
    
    const progressBar = new cliProgress.SingleBar({
      format: 'Progress |{bar}| {percentage}% | {value}/{total} users | ETA: {eta}s',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
    
    const registeredUsers = this.users.filter(user => user.registered);
    progressBar.start(registeredUsers.length, 0);

    const tasks = registeredUsers.map(user => () => this.loginUser(user, progressBar));
    const { results, errors } = await TestUtils.executeConcurrently(tasks, config.test.concurrency);
    
    progressBar.stop();
    
    this.results.login.successes = results.length;
    this.results.login.failures = errors.length;
    
    TestUtils.logSuccess(`Logged in ${results.length}/${registeredUsers.length} users`);
    if (errors.length > 0) {
      TestUtils.logError(`Failed to login ${errors.length} users`);
    }
    
    await TestUtils.delay(config.test.delayBetweenStages);
  }

  async loginUser(user, progressBar) {
    const startTime = Date.now();
    
    try {
      const response = await axios.post(`${config.api.baseUrl}/api/auth/login`, {
        email: user.email,
        password: user.password
      }, {
        timeout: config.api.timeout
      });

      const duration = Date.now() - startTime;
      this.results.login.durations.push(duration);
      
      user.token = response.data.data.token;
      user.loggedIn = true;
      
      progressBar.increment();
      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.login.durations.push(duration);
      progressBar.increment();
      throw new Error(`Login failed for ${user.email}: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async stage3_UpdateProfile() {
    TestUtils.logStage('Stage 3: Update User Profiles');
    
    const progressBar = new cliProgress.SingleBar({
      format: 'Progress |{bar}| {percentage}% | {value}/{total} users | ETA: {eta}s',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
    
    const loggedInUsers = this.users.filter(user => user.loggedIn);
    progressBar.start(loggedInUsers.length, 0);

    const tasks = loggedInUsers.map(user => () => this.updateUserProfile(user, progressBar));
    const { results, errors } = await TestUtils.executeConcurrently(tasks, config.test.concurrency);
    
    progressBar.stop();
    
    this.results.updateProfile.successes = results.length;
    this.results.updateProfile.failures = errors.length;
    
    TestUtils.logSuccess(`Updated ${results.length}/${loggedInUsers.length} user profiles`);
    if (errors.length > 0) {
      TestUtils.logError(`Failed to update ${errors.length} user profiles`);
    }
    
    await TestUtils.delay(config.test.delayBetweenStages);
  }

  async updateUserProfile(user, progressBar) {
    const startTime = Date.now();

    try {
      // Use valid gender (only 'male' or 'female' based on model validation)
      const validGender = ['male', 'female'][Math.floor(Math.random() * 2)];

      const profileData = {
        username: user.username,
        full_name: user.full_name,
        date_of_birth: user.date_of_birth,
        gender: validGender
      };

      // Skip school_id for load testing to avoid database lookup overhead
      // In real scenario, you would fetch available schools first

      const response = await axios.put(`${config.api.baseUrl}/api/auth/profile`, profileData, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        timeout: config.api.timeout
      });

      const duration = Date.now() - startTime;
      this.results.updateProfile.durations.push(duration);

      user.profileUpdated = true;

      progressBar.increment();
      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.updateProfile.durations.push(duration);
      progressBar.increment();
      throw new Error(`Profile update failed for ${user.email}: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async stage4_SubmitAssessment() {
    TestUtils.logStage('Stage 4: Submit Assessments');

    const progressBar = new cliProgress.SingleBar({
      format: 'Progress |{bar}| {percentage}% | {value}/{total} users | ETA: {eta}s',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    const eligibleUsers = this.users.filter(user => user.profileUpdated);
    progressBar.start(eligibleUsers.length, 0);

    const tasks = eligibleUsers.map(user => () => this.submitAssessment(user, progressBar));
    const { results, errors } = await TestUtils.executeConcurrently(tasks, config.test.concurrency);

    progressBar.stop();

    this.results.submitAssessment.successes = results.length;
    this.results.submitAssessment.failures = errors.length;

    TestUtils.logSuccess(`Submitted ${results.length}/${eligibleUsers.length} assessments`);
    if (errors.length > 0) {
      TestUtils.logError(`Failed to submit ${errors.length} assessments`);
    }

    await TestUtils.delay(config.test.delayBetweenStages);
  }

  async submitAssessment(user, progressBar) {
    const startTime = Date.now();

    try {
      const assessmentData = TestUtils.randomizeAssessmentScores(config.assessmentTemplate);
      const idempotencyKey = TestUtils.generateIdempotencyKey();

      const response = await axios.post(`${config.api.baseUrl}/api/assessment/submit`, assessmentData, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
          'X-Force-Direct': 'true' // Force direct processing to avoid batch resultId issues
        },
        timeout: config.api.timeout
      });

      const duration = Date.now() - startTime;
      this.results.submitAssessment.durations.push(duration);

      user.jobId = response.data.data.jobId;
      user.assessmentSubmitted = true;

      progressBar.increment();
      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.submitAssessment.durations.push(duration);
      progressBar.increment();
      throw new Error(`Assessment submission failed for ${user.email}: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async stage5_WaitForCompletion() {
    TestUtils.logStage('Stage 5: Wait for Assessment Completion via WebSocket');

    const eligibleUsers = this.users.filter(user => user.assessmentSubmitted);
    TestUtils.logInfo(`Monitoring ${eligibleUsers.length} assessments via WebSocket...`);

    const progressBar = new cliProgress.SingleBar({
      format: 'Progress |{bar}| {percentage}% | {value}/{total} completed | ETA: {eta}s',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    progressBar.start(eligibleUsers.length, 0);

    const promises = eligibleUsers.map(user => this.waitForAssessmentCompletion(user, progressBar));
    const results = await Promise.allSettled(promises);

    progressBar.stop();

    const successes = results.filter(r => r.status === 'fulfilled').length;
    const failures = results.filter(r => r.status === 'rejected').length;

    this.results.waitForCompletion.successes = successes;
    this.results.waitForCompletion.failures = failures;

    TestUtils.logSuccess(`${successes}/${eligibleUsers.length} assessments completed`);
    if (failures > 0) {
      TestUtils.logError(`${failures} assessments failed or timed out`);
    }

    await TestUtils.delay(config.test.delayBetweenStages);
  }

  async waitForAssessmentCompletion(user, progressBar) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let socket;

      const timeout = setTimeout(() => {
        if (socket) socket.disconnect();
        const duration = Date.now() - startTime;
        this.results.waitForCompletion.durations.push(duration);
        reject(new Error(`Assessment completion timeout for ${user.email}`));
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
          socket.emit('authenticate', { token: user.token });
        });

        socket.on('authenticated', () => {
          // Successfully authenticated, now wait for completion
        });

        socket.on('auth_error', (data) => {
          clearTimeout(timeout);
          socket.disconnect();
          const duration = Date.now() - startTime;
          this.results.waitForCompletion.durations.push(duration);
          reject(new Error(`WebSocket auth failed for ${user.email}: ${data.message}`));
        });

        socket.on('analysis-complete', (data) => {
          if (data.jobId === user.jobId) {
            clearTimeout(timeout);
            const duration = Date.now() - startTime;
            this.results.waitForCompletion.durations.push(duration);

            user.resultId = data.resultId;
            user.assessmentCompleted = true;

            socket.disconnect();
            progressBar.increment();
            resolve(data);
          }
        });

        socket.on('analysis-failed', (data) => {
          if (data.jobId === user.jobId) {
            clearTimeout(timeout);
            const duration = Date.now() - startTime;
            this.results.waitForCompletion.durations.push(duration);

            socket.disconnect();
            progressBar.increment();
            reject(new Error(`Assessment failed for ${user.email}: ${data.error}`));
          }
        });

        socket.on('disconnect', () => {
          // Handle disconnect if needed
        });

        socket.connect();

      } catch (error) {
        clearTimeout(timeout);
        const duration = Date.now() - startTime;
        this.results.waitForCompletion.durations.push(duration);
        reject(new Error(`WebSocket connection failed for ${user.email}: ${error.message}`));
      }
    });
  }

  async stage6_CheckAssessment() {
    TestUtils.logStage('Stage 6: Check Assessment Results');

    const progressBar = new cliProgress.SingleBar({
      format: 'Progress |{bar}| {percentage}% | {value}/{total} users | ETA: {eta}s',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    const completedUsers = this.users.filter(user => user.assessmentCompleted);
    progressBar.start(completedUsers.length, 0);

    const tasks = completedUsers.map(user => () => this.checkAssessmentResult(user, progressBar));
    const { results, errors } = await TestUtils.executeConcurrently(tasks, config.test.concurrency);

    progressBar.stop();

    this.results.checkAssessment.successes = results.length;
    this.results.checkAssessment.failures = errors.length;

    TestUtils.logSuccess(`Checked ${results.length}/${completedUsers.length} assessment results`);
    if (errors.length > 0) {
      TestUtils.logError(`Failed to check ${errors.length} assessment results`);
    }

    await TestUtils.delay(config.test.delayBetweenStages);
  }

  async checkAssessmentResult(user, progressBar) {
    const startTime = Date.now();

    try {
      const response = await axios.get(`${config.api.baseUrl}/api/archive/results`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        timeout: config.api.timeout
      });

      const duration = Date.now() - startTime;
      this.results.checkAssessment.durations.push(duration);

      user.resultChecked = true;

      progressBar.increment();
      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.checkAssessment.durations.push(duration);
      progressBar.increment();
      throw new Error(`Result check failed for ${user.email}: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async stage7_DeleteAccounts() {
    TestUtils.logStage('Stage 7: Delete User Accounts');

    const progressBar = new cliProgress.SingleBar({
      format: 'Progress |{bar}| {percentage}% | {value}/{total} users | ETA: {eta}s',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    const usersToDelete = this.users.filter(user => user.loggedIn);
    progressBar.start(usersToDelete.length, 0);

    // Delete accounts with some delay to avoid overwhelming the server
    for (const user of usersToDelete) {
      try {
        await this.deleteUserAccount(user, progressBar);
        await TestUtils.delay(config.test.cleanupDelay);
      } catch (error) {
        TestUtils.logError(`Failed to delete account for ${user.email}: ${error.message}`);
        progressBar.increment();
      }
    }

    progressBar.stop();

    TestUtils.logSuccess(`Account deletion process completed`);
    await TestUtils.delay(config.test.delayBetweenStages);
  }

  async deleteUserAccount(user, progressBar) {
    const startTime = Date.now();

    try {
      // Use the new self-deletion endpoint
      const deletionResults = await TestUtils.deleteUserAccount(user.token, config.api.baseUrl);

      const duration = Date.now() - startTime;
      this.results.deleteAccount.durations.push(duration);

      if (deletionResults.accountDeleted && deletionResults.errors.length === 0) {
        this.results.deleteAccount.successes++;
        user.deleted = true;
        user.originalEmail = deletionResults.originalEmail;
        user.deletedAt = deletionResults.deletedAt;
      } else {
        this.results.deleteAccount.failures++;
        user.deletionErrors = deletionResults.errors;
      }

      progressBar.increment();
      return { success: deletionResults.accountDeleted, deletionResults };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.deleteAccount.durations.push(duration);
      this.results.deleteAccount.failures++;
      progressBar.increment();
      throw new Error(`Account deletion failed for ${user.email}: ${error.message}`);
    }
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;

    console.log(chalk.bold.green('\n📊 LOAD TEST REPORT'));
    console.log(chalk.gray('='.repeat(80)));

    console.log(chalk.bold(`\n⏱️  Total Test Duration: ${TestUtils.formatDuration(totalDuration)}`));
    console.log(chalk.bold(`👥 Total Users: ${config.test.userCount}`));
    console.log(chalk.bold(`🔄 Concurrency: ${config.test.concurrency}`));

    // Generate report for each stage
    const stages = [
      { name: 'Registration', key: 'register' },
      { name: 'Login', key: 'login' },
      { name: 'Profile Update', key: 'updateProfile' },
      { name: 'Assessment Submission', key: 'submitAssessment' },
      { name: 'Assessment Completion', key: 'waitForCompletion' },
      { name: 'Result Check', key: 'checkAssessment' },
      { name: 'Account Deletion', key: 'deleteAccount' }
    ];

    stages.forEach(stage => {
      const result = this.results[stage.key];
      const stats = TestUtils.calculateStats(result.durations);
      const successRate = result.successes + result.failures > 0
        ? ((result.successes / (result.successes + result.failures)) * 100).toFixed(2)
        : '0.00';

      const throughput = result.durations.length > 0
        ? (result.durations.length / (totalDuration / 1000)).toFixed(2)
        : '0.00';

      console.log(chalk.cyan(`\n📈 ${stage.name}:`));
      console.log(`   Success Rate: ${chalk.green(successRate + '%')} (${result.successes}/${result.successes + result.failures})`);
      console.log(`   Throughput: ${chalk.yellow(throughput)} requests/second`);

      if (result.durations.length > 0) {
        console.log(`   Response Times:`);
        console.log(`     Min: ${chalk.blue(TestUtils.formatDuration(stats.min))}`);
        console.log(`     Max: ${chalk.red(TestUtils.formatDuration(stats.max))}`);
        console.log(`     Avg: ${chalk.yellow(TestUtils.formatDuration(stats.avg))}`);
        console.log(`     P95: ${chalk.cyan(TestUtils.formatDuration(stats.p95))}`);
        console.log(`     P99: ${chalk.magenta(TestUtils.formatDuration(stats.p99))}`);
      }
    });

    // Overall statistics
    const totalRequests = Object.values(this.results).reduce((sum, result) => sum + result.durations.length, 0);
    const totalSuccesses = Object.values(this.results).reduce((sum, result) => sum + result.successes, 0);
    const totalFailures = Object.values(this.results).reduce((sum, result) => sum + result.failures, 0);
    const overallSuccessRate = totalRequests > 0 ? ((totalSuccesses / (totalSuccesses + totalFailures)) * 100).toFixed(2) : '0.00';
    const overallThroughput = totalRequests > 0 ? (totalRequests / (totalDuration / 1000)).toFixed(2) : '0.00';

    console.log(chalk.bold.yellow('\n🎯 OVERALL STATISTICS:'));
    console.log(`   Total Requests: ${chalk.white(totalRequests)}`);
    console.log(`   Overall Success Rate: ${chalk.green(overallSuccessRate + '%')}`);
    console.log(`   Overall Throughput: ${chalk.yellow(overallThroughput)} requests/second`);

    console.log(chalk.gray('\n' + '='.repeat(80)));
    console.log(chalk.bold.green('✅ Load test completed successfully!'));
  }
}

// Run the load test
if (require.main === module) {
  const loadTester = new LoadTester();
  loadTester.run().catch(error => {
    console.error(chalk.red('Load test failed:'), error);
    process.exit(1);
  });
}

module.exports = LoadTester;
