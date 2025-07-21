#!/usr/bin/env node

// Main test runner for ATMA testing suite
const { regenerateTestUser } = require('./test-config');
const { runAuthFlow, testDeleteProfile } = require('./test-auth-flow');
const { testConnectWebSocket, testMonitorJobStatus, cleanupWebSocket } = require('./test-websocket-flow');
const { runAssessmentFlow } = require('./test-assessment-flow');
const { runMassLoginTest, runMassEndToEndTest } = require('./test-mass-testing');
const { runAdminAuthFlow } = require('./test-admin-auth');
const { makeRequest, displayResponse } = require('./test-helpers');
const { API_GATEWAY_URL } = require('./test-config');

// Complete WebSocket flow test
async function runWebSocketFlow() {
  console.log('🚀 Starting ATMA WebSocket Flow Test');
  console.log('====================================');

  try {
    // Generate new random email for this test run
    const { testUser, profileData } = regenerateTestUser();

    // Run authentication flow
    const authResult = await runAuthFlow(testUser, profileData);
    if (!authResult.success) {
      console.log('\n❌ Authentication failed. Cannot proceed with WebSocket flow.');
      return;
    }

    const { authToken, userId, profileUpdateSuccess } = authResult;

    // Connect to WebSocket immediately after login
    const wsConnected = await testConnectWebSocket(authToken);
    if (!wsConnected) {
      console.log('\n❌ WebSocket connection failed. Cannot proceed with flow.');
      return;
    }

    // Submit assessment and monitor via WebSocket
    const assessmentResult = await runAssessmentFlow(authToken);
    if (!assessmentResult.success) {
      cleanupWebSocket();
      return;
    }

    const { jobId } = assessmentResult;

    // Monitor job status and wait for notifications
    const jobCompleted = await testMonitorJobStatus(jobId);

    // Delete profile at the end (optional - can be skipped with --keep-user flag)
    const args = process.argv.slice(2);
    if (!args.includes('--keep-user')) {
      console.log('\n=== 12. CLEANUP USER PROFILE ===');
      if (profileUpdateSuccess) {
        await testDeleteProfile(authToken);
      } else {
        console.log('⚠️ Skipping profile deletion since profile was not created successfully');
      }
    } else {
      console.log('\n=== 12. KEEPING USER PROFILE ===');
      console.log('User profile kept for future testing (--keep-user flag used)');
    }

    console.log('\n🎉 WebSocket Flow Test Completed!');
    console.log('==================================');

    if (jobCompleted) {
      console.log('✅ Test Result: SUCCESS - Job completed and notifications received');
    } else {
      console.log('⚠️ Test Result: PARTIAL - Job may still be processing');
    }

  } catch (error) {
    console.error('\n💥 Test execution failed:', error.message);
  } finally {
    cleanupWebSocket();
  }
}

// Basic authentication flow test
async function runBasicTests() {
  console.log('🚀 Starting ATMA Basic Authentication Tests');
  console.log('===========================================');

  try {
    // Generate new random email for this test run
    const { testUser, profileData } = regenerateTestUser();

    // Run authentication flow
    const authResult = await runAuthFlow(testUser, profileData);
    if (!authResult.success) {
      console.log('\n❌ Authentication failed.');
      return;
    }

    const { authToken } = authResult;

    // Get profile again to see the updated data
    console.log('\n=== 4b. GET UPDATED PROFILE ===');
    const result = await makeRequest('GET', `${API_GATEWAY_URL}/api/auth/profile`, null, {
      'Authorization': `Bearer ${authToken}`
    });
    displayResponse('Get Updated Profile Result:', result);

    // Delete profile
    await testDeleteProfile(authToken);

    console.log('\n🎉 All basic tests completed!');
    console.log('=====================================');

  } catch (error) {
    console.error('\n💥 Test execution failed:', error.message);
  }
}

// Display help information
function showHelp() {
  console.log('ATMA Testing Suite - Modular Testing Options:');
  console.log('='.repeat(50));
  console.log('Basic Tests:');
  console.log('  node test-runner.js                       - Run basic auth flow tests');
  console.log('  node test-runner.js --websocket           - Run WebSocket flow test');
  console.log('  node test-runner.js -w                    - Run WebSocket flow test (short)');
  console.log('  node test-runner.js --websocket --keep-user - Run WebSocket test, keep user profile');
  console.log('  node test-runner.js --admin               - Run admin authentication test');
  console.log('  node test-runner.js -a                    - Run admin authentication test (short)');
  console.log('');
  console.log('Mass Testing:');
  console.log('  node test-runner.js --end-to-end          - Run end-to-end test (50 users)');
  console.log('  node test-runner.js -e                    - Run end-to-end test (short)');
  console.log('  node test-runner.js --mass-login          - Run mass login test (250 users)');
  console.log('  node test-runner.js -m                    - Run mass login test (short)');
  console.log('');
  console.log('Help:');
  console.log('  node test-runner.js --help                - Show this help');
  console.log('  node test-runner.js -h                    - Show this help (short)');
  console.log('');
  console.log('End-to-End Test Options:');
  console.log('  --users=N                                 - Number of users to test (default: 50)');
  console.log('  --batch-size=N                            - Users per batch (default: 10)');
  console.log('  --batch-delay=N                           - Delay between batches in ms (default: 3000)');
  console.log('  --user-delay=N                            - Delay between users in batch in ms (default: 200)');
  console.log('  --ws-delay=N                              - Delay between WebSocket connections in ms (default: 300)');
  console.log('  --job-timeout=N                           - Job completion timeout in ms (default: 300000)');
  console.log('  --high-performance, --hp                  - Enable high-performance mode (max speed)');
  console.log('  --no-websocket                            - Skip WebSocket testing');
  console.log('  --no-cleanup                              - Skip user cleanup after test');
  console.log('');
  console.log('Mass Login Test Options:');
  console.log('  --users=N                                 - Number of users to test (default: 250)');
  console.log('  --batch-size=N                            - Users per batch (default: 20)');
  console.log('  --batch-delay=N                           - Delay between batches in ms (default: 1000)');
  console.log('  --user-delay=N                            - Delay between users in batch in ms (default: 50)');
  console.log('  --ws-delay=N                              - Delay between WebSocket connections in ms (default: 100)');
  console.log('  --high-performance, --hp                  - Enable high-performance mode (max speed)');
  console.log('  --no-websocket                            - Skip WebSocket testing');
  console.log('  --no-cleanup                              - Skip user cleanup after test');
  console.log('');
  console.log('Environment Variables:');
  console.log('  DEBUG_RESPONSE=true                       - Show full API responses (debug mode)');
  console.log('');
  console.log('Examples:');
  console.log('  # End-to-End Testing (Login + Submit + Get Result)');
  console.log('  node test-runner.js --end-to-end --users=10');
  console.log('  node test-runner.js -e --users=50 --high-performance');
  console.log('  node test-runner.js -e --users=100 --batch-size=5 --job-timeout=600000');
  console.log('');
  console.log('  # Mass Login Testing (Login + WebSocket only)');
  console.log('  node test-runner.js --mass-login --users=100 --batch-size=5');
  console.log('  node test-runner.js -m --users=50 --no-websocket');
  console.log('  node test-runner.js -m --users=1000 --high-performance');
  console.log('  node test-runner.js -m --users=500 --hp --batch-size=50');
  console.log('');
  console.log('  # Other Tests');
  console.log('  DEBUG_RESPONSE=true node test-runner.js --websocket');
  console.log('  node test-runner.js --websocket --keep-user');
}

// Parse command line arguments and run appropriate test
function parseArgsAndRun() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  if (args.includes('--end-to-end') || args.includes('-e')) {
    console.log('Running Mass End-to-End Test...\n');

    // Parse end-to-end test options (take the last occurrence of each argument)
    const userCountArgs = args.filter(arg => arg.startsWith('--users='));
    const userCount = userCountArgs.length > 0 ? parseInt(userCountArgs[userCountArgs.length - 1].split('=')[1]) : 50;

    const batchSizeArgs = args.filter(arg => arg.startsWith('--batch-size='));
    const batchSize = batchSizeArgs.length > 0 ? parseInt(batchSizeArgs[batchSizeArgs.length - 1].split('=')[1]) : 10;

    const batchDelayArgs = args.filter(arg => arg.startsWith('--batch-delay='));
    const batchDelay = batchDelayArgs.length > 0 ? parseInt(batchDelayArgs[batchDelayArgs.length - 1].split('=')[1]) : 3000;

    const userDelayArgs = args.filter(arg => arg.startsWith('--user-delay='));
    const userDelay = userDelayArgs.length > 0 ? parseInt(userDelayArgs[userDelayArgs.length - 1].split('=')[1]) : 200;

    const wsDelayArgs = args.filter(arg => arg.startsWith('--ws-delay='));
    const wsDelay = wsDelayArgs.length > 0 ? parseInt(wsDelayArgs[wsDelayArgs.length - 1].split('=')[1]) : 300;

    const jobTimeoutArgs = args.filter(arg => arg.startsWith('--job-timeout='));
    const jobTimeout = jobTimeoutArgs.length > 0 ? parseInt(jobTimeoutArgs[jobTimeoutArgs.length - 1].split('=')[1]) : 300000;

    const enableWebSocket = !args.includes('--no-websocket');
    const cleanupUsers = !args.includes('--no-cleanup');

    // High-performance mode
    const highPerformanceMode = args.includes('--high-performance') || args.includes('--hp');
    if (highPerformanceMode) {
      console.log('🚀 HIGH-PERFORMANCE MODE ENABLED');
    }

    const options = {
      batchSize,
      batchDelay,
      userDelay,
      wsDelay,
      enableWebSocket,
      cleanupUsers,
      highPerformance: highPerformanceMode,
      skipProfile: highPerformanceMode,
      jobTimeout
    };

    console.log(`Configuration:`);
    console.log(`  Users: ${userCount}`);
    console.log(`  Batch Size: ${options.batchSize}`);
    console.log(`  Batch Delay: ${options.batchDelay}ms`);
    console.log(`  User Delay: ${options.userDelay}ms`);
    console.log(`  WebSocket Delay: ${options.wsDelay}ms`);
    console.log(`  Job Timeout: ${options.jobTimeout / 1000}s`);
    console.log(`  WebSocket Enabled: ${enableWebSocket}`);
    console.log(`  Cleanup Users: ${cleanupUsers}`);
    console.log(`  High Performance Mode: ${highPerformanceMode}`);
    console.log('');

    runMassEndToEndTest(userCount, options);
  } else if (args.includes('--mass-login') || args.includes('-m')) {
    console.log('Running Mass Login Test...\n');

    // Parse mass login options (take the last occurrence of each argument)
    const userCountArgs = args.filter(arg => arg.startsWith('--users='));
    const userCount = userCountArgs.length > 0 ? parseInt(userCountArgs[userCountArgs.length - 1].split('=')[1]) : 250;

    const batchSizeArgs = args.filter(arg => arg.startsWith('--batch-size='));
    const batchSize = batchSizeArgs.length > 0 ? parseInt(batchSizeArgs[batchSizeArgs.length - 1].split('=')[1]) : 20;

    const batchDelayArgs = args.filter(arg => arg.startsWith('--batch-delay='));
    const batchDelay = batchDelayArgs.length > 0 ? parseInt(batchDelayArgs[batchDelayArgs.length - 1].split('=')[1]) : 1000;

    const userDelayArgs = args.filter(arg => arg.startsWith('--user-delay='));
    const userDelay = userDelayArgs.length > 0 ? parseInt(userDelayArgs[userDelayArgs.length - 1].split('=')[1]) : 50;

    const wsDelayArgs = args.filter(arg => arg.startsWith('--ws-delay='));
    const wsDelay = wsDelayArgs.length > 0 ? parseInt(wsDelayArgs[wsDelayArgs.length - 1].split('=')[1]) : 100;

    const enableWebSocket = !args.includes('--no-websocket');
    const cleanupUsers = !args.includes('--no-cleanup');

    // High-performance mode
    const highPerformanceMode = args.includes('--high-performance') || args.includes('--hp');
    if (highPerformanceMode) {
      console.log('🚀 HIGH-PERFORMANCE MODE ENABLED');
    }

    const options = {
      batchSize,
      batchDelay,
      userDelay,
      wsDelay,
      enableWebSocket,
      cleanupUsers,
      highPerformance: highPerformanceMode,
      skipProfile: highPerformanceMode
    };

    console.log(`Configuration:`);
    console.log(`  Users: ${userCount}`);
    console.log(`  Batch Size: ${options.batchSize}`);
    console.log(`  Batch Delay: ${options.batchDelay}ms`);
    console.log(`  User Delay: ${options.userDelay}ms`);
    console.log(`  WebSocket Delay: ${options.wsDelay}ms`);
    console.log(`  WebSocket Enabled: ${enableWebSocket}`);
    console.log(`  Cleanup Users: ${cleanupUsers}`);
    console.log(`  High Performance Mode: ${highPerformanceMode}`);
    console.log('');

    runMassLoginTest(userCount, options);
  } else if (args.includes('--websocket') || args.includes('-w')) {
    console.log('Running WebSocket Flow Test...\n');
    runWebSocketFlow();
  } else if (args.includes('--admin') || args.includes('-a')) {
    console.log('Running Admin Authentication Test...\n');
    runAdminAuthFlow();
  } else {
    console.log('Running basic auth flow tests...');
    console.log('Use --websocket or -w flag to run WebSocket flow test');
    console.log('Use --admin or -a flag to run admin authentication test');
    console.log('Use --mass-login or -m flag to run mass login test');
    console.log('Use --help or -h flag to see all options\n');
    runBasicTests();
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  parseArgsAndRun();
}

module.exports = {
  runWebSocketFlow,
  runBasicTests,
  showHelp,
  parseArgsAndRun
};
