// Mass testing and load testing for ATMA
const io = require('socket.io-client');
const { makeRequest } = require('./test-helpers');
const { API_GATEWAY_URL, NOTIFICATION_SERVICE_URL, createTestUser, assessmentData } = require('./test-config');
const { testHealthCheck } = require('./test-auth-flow');
const { submitAssessmentForUser, waitForJobCompletion } = require('./test-assessment-flow');
const { userAssessmentTimes } = require('./test-websocket-flow');

// Login single user for mass testing
async function loginSingleUser(userIndex, delay = 0, skipProfile = false) {
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  const user = await createTestUser(userIndex);
  const startTime = Date.now();

  try {
    console.log(`[User ${userIndex}] Starting login process...`);

    // Parallel execution of register and login preparation
    const registerPromise = makeRequest('POST', `${API_GATEWAY_URL}/api/auth/register`, {
      email: user.email,
      password: user.password
    });

    const registerResult = await registerPromise;

    if (!registerResult.success) {
      console.log(`[User ${userIndex}] Registration failed:`, registerResult.data?.message || 'Unknown error');
      return { success: false, userIndex, error: 'Registration failed', user };
    }

    // Login user immediately after registration
    const loginResult = await makeRequest('POST', `${API_GATEWAY_URL}/api/auth/login`, {
      email: user.email,
      password: user.password
    });

    if (!loginResult.success) {
      console.log(`[User ${userIndex}] Login failed:`, loginResult.data?.message || 'Unknown error');
      return { success: false, userIndex, error: 'Login failed', user };
    }

    const authToken = loginResult.data.data?.token;
    const userId = loginResult.data.data?.user?.id;

    if (!authToken || !userId) {
      console.log(`[User ${userIndex}] Invalid login response - missing token or user ID`);
      return { success: false, userIndex, error: 'Invalid login response', user };
    }

    let profileResult = { success: true };

    // Skip profile update in high-performance mode to reduce load
    if (!skipProfile) {
      profileResult = await makeRequest('PUT', `${API_GATEWAY_URL}/api/auth/profile`, {
        username: user.username,
        full_name: user.full_name,
        school_id: user.school_id,
        date_of_birth: user.date_of_birth,
        gender: user.gender
      }, {
        'Authorization': `Bearer ${authToken}`
      });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`[User ${userIndex}] ✅ Login completed in ${duration}ms`);

    return {
      success: true,
      userIndex,
      user,
      authToken,
      userId,
      duration,
      profileUpdated: profileResult.success
    };

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`[User ${userIndex}] ❌ Login failed after ${duration}ms:`, error.message);
    return { success: false, userIndex, error: error.message, user, duration };
  }
}

// Connect WebSocket for mass testing
async function connectWebSocketForUser(userResult, delay = 0) {
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  if (!userResult.success) {
    return { success: false, userIndex: userResult.userIndex, error: 'User login failed' };
  }

  const { userIndex, authToken, userId } = userResult;
  const startTime = Date.now();

  return new Promise((resolve) => {
    console.log(`[User ${userIndex}] Connecting to WebSocket...`);

    const socket = io(NOTIFICATION_SERVICE_URL, {
      transports: ['websocket'],
      timeout: 10000,
      forceNew: true
    });

    let resolved = false;

    const resolveOnce = (result) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
    };

    socket.on('connect', () => {
      console.log(`[User ${userIndex}] WebSocket connected, authenticating...`);
      socket.emit('authenticate', { token: authToken });
    });

    socket.on('authenticated', (data) => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`[User ${userIndex}] ✅ WebSocket authenticated in ${duration}ms`);

      // Set up notification listeners for this user
      socket.on('analysis-complete', (notificationData) => {
        const notificationTime = Date.now();
        console.log(`\n[User ${userIndex}] 🎉 ANALYSIS COMPLETE NOTIFICATION RECEIVED!`);

        // Calculate and display processing time
        const submissionTime = userAssessmentTimes.get(userIndex);
        if (submissionTime) {
          const processingTime = notificationTime - submissionTime;
          console.log(`[User ${userIndex}] ⏱️  Processing Time: ${processingTime}ms (${(processingTime / 1000).toFixed(2)}s)`);
          console.log(`[User ${userIndex}]    Submitted at: ${new Date(submissionTime).toISOString()}`);
          console.log(`[User ${userIndex}]    Completed at: ${new Date(notificationTime).toISOString()}`);
        }

        if (notificationData.jobId) {
          console.log(`[User ${userIndex}]    Job ID: ${notificationData.jobId}`);
        }
        if (notificationData.resultId) {
          console.log(`[User ${userIndex}]    Result ID: ${notificationData.resultId}`);
        }
      });

      socket.on('analysis-failed', (notificationData) => {
        const notificationTime = Date.now();
        console.log(`\n[User ${userIndex}] ❌ ANALYSIS FAILED NOTIFICATION RECEIVED!`);

        // Calculate and display processing time even for failures
        const submissionTime = userAssessmentTimes.get(userIndex);
        if (submissionTime) {
          const processingTime = notificationTime - submissionTime;
          console.log(`[User ${userIndex}] ⏱️  Processing Time: ${processingTime}ms (${(processingTime / 1000).toFixed(2)}s)`);
          console.log(`[User ${userIndex}]    Submitted at: ${new Date(submissionTime).toISOString()}`);
          console.log(`[User ${userIndex}]    Failed at: ${new Date(notificationTime).toISOString()}`);
        }

        if (notificationData.jobId) {
          console.log(`[User ${userIndex}]    Job ID: ${notificationData.jobId}`);
        }
        if (notificationData.error) {
          console.log(`[User ${userIndex}]    Error: ${notificationData.error}`);
        }
      });

      resolveOnce({
        success: true,
        userIndex,
        userId,
        socket,
        duration,
        authData: data
      });
    });

    socket.on('auth_error', (error) => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`[User ${userIndex}] ❌ WebSocket auth failed after ${duration}ms:`, error.message);
      socket.disconnect();

      resolveOnce({
        success: false,
        userIndex,
        error: error.message,
        duration
      });
    });

    socket.on('connect_error', (error) => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`[User ${userIndex}] ❌ WebSocket connection failed after ${duration}ms:`, error.message);

      resolveOnce({
        success: false,
        userIndex,
        error: error.message,
        duration
      });
    });

    // Timeout after 15 seconds
    setTimeout(() => {
      if (!resolved) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`[User ${userIndex}] ❌ WebSocket connection timeout after ${duration}ms`);
        socket.disconnect();

        resolveOnce({
          success: false,
          userIndex,
          error: 'Connection timeout',
          duration
        });
      }
    }, 15000);
  });
}

// Mass login test runner
async function runMassLoginTest(userCount = 250, options = {}) {
  console.log(`🚀 Starting Mass Login Test for ${userCount} users`);
  console.log('='.repeat(60));

  const {
    batchSize = 20,           // Increased default batch size
    batchDelay = 1000,        // Reduced default delay
    userDelay = 50,           // Reduced default delay
    enableWebSocket = true,   // Whether to test WebSocket connections
    wsDelay = 100,           // Reduced default delay
    cleanupUsers = true,      // Whether to cleanup users after test
    highPerformance = false,  // High-performance mode
    skipProfile = false       // Skip profile updates for speed
  } = options;

  const startTime = Date.now();
  const results = {
    total: userCount,
    loginSuccess: 0,
    loginFailed: 0,
    wsSuccess: 0,
    wsFailed: 0,
    errors: [],
    durations: {
      login: [],
      websocket: []
    }
  };

  // Check services health first
  console.log('\n📋 Checking services health...');
  const servicesHealthy = await testHealthCheck();
  if (!servicesHealthy) {
    console.log('\n❌ Some services are not healthy. Aborting mass test.');
    return results;
  }

  const allSockets = [];
  const successfulUsers = [];

  try {
    // Process users in batches
    for (let batchStart = 0; batchStart < userCount; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, userCount);
      const currentBatch = batchEnd - batchStart;

      console.log(`\n📦 Processing batch ${Math.floor(batchStart / batchSize) + 1}: Users ${batchStart + 1}-${batchEnd}`);

      // Login users in current batch
      const loginPromises = [];
      for (let i = batchStart; i < batchEnd; i++) {
        const delay = highPerformance ? 0 : (i - batchStart) * userDelay;
        loginPromises.push(loginSingleUser(i + 1, delay, skipProfile));
      }

      const loginResults = await Promise.all(loginPromises);

      // Process login results
      for (const result of loginResults) {
        if (result.success) {
          results.loginSuccess++;
          results.durations.login.push(result.duration);
          successfulUsers.push(result);
        } else {
          results.loginFailed++;
          results.errors.push({
            type: 'login',
            userIndex: result.userIndex,
            error: result.error
          });
        }
      }

      console.log(`   Login results: ${loginResults.filter(r => r.success).length}/${currentBatch} successful`);

      // WebSocket connections for successful logins
      if (enableWebSocket && loginResults.some(r => r.success)) {
        console.log(`   Connecting WebSockets for successful users...`);

        const wsPromises = [];
        for (const result of loginResults) {
          if (result.success) {
            const delay = highPerformance ? 0 : (result.userIndex - batchStart - 1) * wsDelay;
            wsPromises.push(connectWebSocketForUser(result, delay));
          }
        }

        const wsResults = await Promise.all(wsPromises);

        // Process WebSocket results
        for (const result of wsResults) {
          if (result.success) {
            results.wsSuccess++;
            results.durations.websocket.push(result.duration);
            allSockets.push(result.socket);
          } else {
            results.wsFailed++;
            results.errors.push({
              type: 'websocket',
              userIndex: result.userIndex,
              error: result.error
            });
          }
        }

        console.log(`   WebSocket results: ${wsResults.filter(r => r.success).length}/${wsResults.length} successful`);
      }

      // Delay between batches (except for the last batch)
      if (batchEnd < userCount && !highPerformance) {
        console.log(`   Waiting ${batchDelay}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Calculate statistics
    const avgLoginTime = results.durations.login.length > 0
      ? results.durations.login.reduce((a, b) => a + b, 0) / results.durations.login.length
      : 0;

    const avgWsTime = results.durations.websocket.length > 0
      ? results.durations.websocket.reduce((a, b) => a + b, 0) / results.durations.websocket.length
      : 0;

    // Display final results
    console.log('\n' + '='.repeat(60));
    console.log('📊 MASS LOGIN TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
    console.log(`Total Users: ${userCount}`);
    console.log(`\n🔐 Login Results:`);
    console.log(`  ✅ Successful: ${results.loginSuccess}/${userCount} (${((results.loginSuccess / userCount) * 100).toFixed(1)}%)`);
    console.log(`  ❌ Failed: ${results.loginFailed}/${userCount} (${((results.loginFailed / userCount) * 100).toFixed(1)}%)`);
    console.log(`  ⏱️  Average Time: ${avgLoginTime.toFixed(0)}ms`);

    if (enableWebSocket) {
      console.log(`\n🔌 WebSocket Results:`);
      console.log(`  ✅ Successful: ${results.wsSuccess}/${results.loginSuccess} (${results.loginSuccess > 0 ? ((results.wsSuccess / results.loginSuccess) * 100).toFixed(1) : 0}%)`);
      console.log(`  ❌ Failed: ${results.wsFailed}/${results.loginSuccess} (${results.loginSuccess > 0 ? ((results.wsFailed / results.loginSuccess) * 100).toFixed(1) : 0}%)`);
      console.log(`  ⏱️  Average Time: ${avgWsTime.toFixed(0)}ms`);
    }

    // Show error summary
    if (results.errors.length > 0) {
      console.log(`\n❌ Error Summary:`);
      const errorCounts = {};
      results.errors.forEach(err => {
        const key = `${err.type}: ${err.error}`;
        errorCounts[key] = (errorCounts[key] || 0) + 1;
      });

      Object.entries(errorCounts).forEach(([error, count]) => {
        console.log(`  ${error}: ${count} occurrences`);
      });
    }

    return results;

  } catch (error) {
    console.error('\n💥 Mass login test failed:', error.message);
    return results;
  } finally {
    // Cleanup WebSocket connections
    if (cleanupUsers && allSockets.length > 0) {
      console.log(`\n🧹 Cleaning up ${allSockets.length} WebSocket connections...`);
      allSockets.forEach(socket => {
        if (socket && socket.connected) {
          socket.disconnect();
        }
      });
    }
  }
}

// Mass end-to-end test runner
async function runMassEndToEndTest(userCount = 50, options = {}) {
  console.log(`🚀 Starting Mass End-to-End Test for ${userCount} users`);
  console.log('='.repeat(60));

  const {
    batchSize = 10,
    batchDelay = 3000,
    userDelay = 200,
    wsDelay = 300,
    enableWebSocket = true,
    cleanupUsers = true,
    highPerformance = false,
    skipProfile = false,
    jobTimeout = 300000
  } = options;

  const startTime = Date.now();
  const results = {
    total: userCount,
    loginSuccess: 0,
    loginFailed: 0,
    wsSuccess: 0,
    wsFailed: 0,
    assessmentSuccess: 0,
    assessmentFailed: 0,
    jobSuccess: 0,
    jobFailed: 0,
    errors: [],
    durations: {
      login: [],
      websocket: [],
      assessment: [],
      job: []
    }
  };

  // Check services health first
  console.log('\n📋 Checking services health...');
  const servicesHealthy = await testHealthCheck();
  if (!servicesHealthy) {
    console.log('\n❌ Some services are not healthy. Aborting end-to-end test.');
    return results;
  }

  const allSockets = [];
  const successfulUsers = [];

  try {
    // Process users in batches
    for (let batchStart = 0; batchStart < userCount; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, userCount);
      const currentBatch = batchEnd - batchStart;

      console.log(`\n📦 Processing batch ${Math.floor(batchStart / batchSize) + 1}: Users ${batchStart + 1}-${batchEnd}`);

      // Step 1: Login users
      const loginPromises = [];
      for (let i = batchStart; i < batchEnd; i++) {
        const delay = highPerformance ? 0 : (i - batchStart) * userDelay;
        loginPromises.push(loginSingleUser(i + 1, delay, skipProfile));
      }

      const loginResults = await Promise.all(loginPromises);
      const successfulLogins = loginResults.filter(r => r.success);

      // Process login results
      for (const result of loginResults) {
        if (result.success) {
          results.loginSuccess++;
          results.durations.login.push(result.duration);
          successfulUsers.push(result);
        } else {
          results.loginFailed++;
          results.errors.push({
            type: 'login',
            userIndex: result.userIndex,
            error: result.error
          });
        }
      }

      console.log(`   Login: ${successfulLogins.length}/${currentBatch} successful`);

      if (successfulLogins.length === 0) {
        console.log(`   ⚠️ No successful logins in this batch, skipping remaining steps`);
        continue;
      }

      // Step 2: WebSocket connections (if enabled)
      let wsResults = [];
      if (enableWebSocket) {
        console.log(`   Connecting WebSockets...`);
        const wsPromises = [];
        for (const result of successfulLogins) {
          const delay = highPerformance ? 0 : (result.userIndex - batchStart - 1) * wsDelay;
          wsPromises.push(connectWebSocketForUser(result, delay));
        }

        wsResults = await Promise.all(wsPromises);

        // Process WebSocket results
        for (const result of wsResults) {
          if (result.success) {
            results.wsSuccess++;
            results.durations.websocket.push(result.duration);
            allSockets.push(result.socket);
          } else {
            results.wsFailed++;
            results.errors.push({
              type: 'websocket',
              userIndex: result.userIndex,
              error: result.error
            });
          }
        }

        console.log(`   WebSocket: ${wsResults.filter(r => r.success).length}/${successfulLogins.length} successful`);
      }

      // Step 3: Submit assessments
      console.log(`   Submitting assessments...`);
      const assessmentPromises = [];
      for (const result of successfulLogins) {
        const delay = highPerformance ? 0 : (result.userIndex - batchStart - 1) * userDelay;
        assessmentPromises.push(submitAssessmentForUser(result, delay));
      }

      const assessmentResults = await Promise.all(assessmentPromises);
      const successfulAssessments = assessmentResults.filter(r => r.success);

      // Process assessment results
      for (const result of assessmentResults) {
        if (result.success) {
          results.assessmentSuccess++;
          results.durations.assessment.push(result.duration);
          // Store submission time for WebSocket notifications
          userAssessmentTimes.set(result.userIndex, result.submissionTime);
        } else {
          results.assessmentFailed++;
          results.errors.push({
            type: 'assessment',
            userIndex: result.userIndex,
            error: result.error
          });
        }
      }

      console.log(`   Assessment: ${successfulAssessments.length}/${successfulLogins.length} successful`);

      // Step 4: Wait for job completions (polling method)
      if (successfulAssessments.length > 0) {
        console.log(`   Waiting for job completions...`);
        const jobPromises = [];
        for (const result of successfulAssessments) {
          jobPromises.push(waitForJobCompletion(result, jobTimeout));
        }

        const jobResults = await Promise.all(jobPromises);

        // Process job completion results
        for (const result of jobResults) {
          if (result.success) {
            results.jobSuccess++;
            results.durations.job.push(result.duration);
          } else {
            results.jobFailed++;
            results.errors.push({
              type: 'job_completion',
              userIndex: result.userIndex,
              error: result.error
            });
          }
        }

        console.log(`   Job Completion: ${jobResults.filter(r => r.success).length}/${successfulAssessments.length} successful`);
      }

      // Delay between batches (except for the last batch)
      if (batchEnd < userCount && !highPerformance) {
        console.log(`   Waiting ${batchDelay}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Calculate statistics
    const avgLoginTime = results.durations.login.length > 0
      ? results.durations.login.reduce((a, b) => a + b, 0) / results.durations.login.length
      : 0;

    const avgWsTime = results.durations.websocket.length > 0
      ? results.durations.websocket.reduce((a, b) => a + b, 0) / results.durations.websocket.length
      : 0;

    const avgAssessmentTime = results.durations.assessment.length > 0
      ? results.durations.assessment.reduce((a, b) => a + b, 0) / results.durations.assessment.length
      : 0;

    const avgJobTime = results.durations.job.length > 0
      ? results.durations.job.reduce((a, b) => a + b, 0) / results.durations.job.length
      : 0;

    // Display final results
    console.log('\n' + '='.repeat(60));
    console.log('📊 MASS END-TO-END TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
    console.log(`Total Users: ${userCount}`);

    console.log(`\n🔐 Login Results:`);
    console.log(`  ✅ Successful: ${results.loginSuccess}/${userCount} (${((results.loginSuccess / userCount) * 100).toFixed(1)}%)`);
    console.log(`  ❌ Failed: ${results.loginFailed}/${userCount} (${((results.loginFailed / userCount) * 100).toFixed(1)}%)`);
    console.log(`  ⏱️  Average Time: ${avgLoginTime.toFixed(0)}ms`);

    if (enableWebSocket) {
      console.log(`\n🔌 WebSocket Results:`);
      console.log(`  ✅ Successful: ${results.wsSuccess}/${results.loginSuccess} (${results.loginSuccess > 0 ? ((results.wsSuccess / results.loginSuccess) * 100).toFixed(1) : 0}%)`);
      console.log(`  ❌ Failed: ${results.wsFailed}/${results.loginSuccess} (${results.loginSuccess > 0 ? ((results.wsFailed / results.loginSuccess) * 100).toFixed(1) : 0}%)`);
      console.log(`  ⏱️  Average Time: ${avgWsTime.toFixed(0)}ms`);
    }

    console.log(`\n📝 Assessment Results:`);
    console.log(`  ✅ Successful: ${results.assessmentSuccess}/${results.loginSuccess} (${results.loginSuccess > 0 ? ((results.assessmentSuccess / results.loginSuccess) * 100).toFixed(1) : 0}%)`);
    console.log(`  ❌ Failed: ${results.assessmentFailed}/${results.loginSuccess} (${results.loginSuccess > 0 ? ((results.assessmentFailed / results.loginSuccess) * 100).toFixed(1) : 0}%)`);
    console.log(`  ⏱️  Average Time: ${avgAssessmentTime.toFixed(0)}ms`);

    console.log(`\n⚙️ Job Completion Results:`);
    console.log(`  ✅ Successful: ${results.jobSuccess}/${results.assessmentSuccess} (${results.assessmentSuccess > 0 ? ((results.jobSuccess / results.assessmentSuccess) * 100).toFixed(1) : 0}%)`);
    console.log(`  ❌ Failed: ${results.jobFailed}/${results.assessmentSuccess} (${results.assessmentSuccess > 0 ? ((results.jobFailed / results.assessmentSuccess) * 100).toFixed(1) : 0}%)`);
    console.log(`  ⏱️  Average Time: ${avgJobTime.toFixed(0)}ms`);

    // Show error summary
    if (results.errors.length > 0) {
      console.log(`\n❌ Error Summary:`);
      const errorCounts = {};
      results.errors.forEach(err => {
        const key = `${err.type}: ${err.error}`;
        errorCounts[key] = (errorCounts[key] || 0) + 1;
      });

      Object.entries(errorCounts).forEach(([error, count]) => {
        console.log(`  ${error}: ${count} occurrences`);
      });
    }

    return results;

  } catch (error) {
    console.error('\n💥 Mass end-to-end test failed:', error.message);
    return results;
  } finally {
    // Cleanup WebSocket connections
    if (cleanupUsers && allSockets.length > 0) {
      console.log(`\n🧹 Cleaning up ${allSockets.length} WebSocket connections...`);
      allSockets.forEach(socket => {
        if (socket && socket.connected) {
          socket.disconnect();
        }
      });
    }
  }
}

module.exports = {
  loginSingleUser,
  connectWebSocketForUser,
  runMassLoginTest,
  runMassEndToEndTest
};
