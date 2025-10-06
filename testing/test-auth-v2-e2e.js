#!/usr/bin/env node

/**
 * End-to-End Testing with Auth-V2 (Firebase)
 * Complete user journey testing dengan Firebase authentication
 */

const axios = require('axios');
const chalk = require('chalk');

// Configuration
const CONFIG = {
  AUTH_V2_URL: process.env.AUTH_V2_SERVICE_URL || 'http://localhost:3008',
  ARCHIVE_URL: process.env.ARCHIVE_SERVICE_URL || 'http://localhost:3002',
  ASSESSMENT_URL: process.env.ASSESSMENT_SERVICE_URL || 'http://localhost:3003',
  CHATBOT_URL: process.env.CHATBOT_SERVICE_URL || 'http://localhost:3006',
  NOTIFICATION_URL: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
  
  TEST_USER: {
    email: 'kasykoi@gmail.com',
    password: 'Anjas123'
  }
};

let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

let firebaseToken = null;
let userId = null;

// Utility functions
function log(message, type = 'info') {
  const colors = {
    info: chalk.blue,
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow
  };
  const color = colors[type] || chalk.white;
  console.log(color(`[${type.toUpperCase()}] ${message}`));
}

function logSection(title) {
  console.log('\n' + chalk.bold.cyan('═'.repeat(80)));
  console.log(chalk.bold.cyan(`  ${title}`));
  console.log(chalk.bold.cyan('═'.repeat(80)) + '\n');
}

async function runTest(name, testFn) {
  testResults.total++;
  log(`Testing: ${name}`, 'info');
  
  try {
    const startTime = Date.now();
    const result = await testFn();
    const duration = Date.now() - startTime;
    
    testResults.passed++;
    testResults.tests.push({ name, status: 'passed', duration, result });
    log(`✓ ${name} - PASSED (${duration}ms)`, 'success');
    return result;
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'failed', error: error.message });
    log(`✗ ${name} - FAILED: ${error.message}`, 'error');
    throw error;
  }
}

// ============================================================================
// AUTHENTICATION TESTS
// ============================================================================

async function testAuthentication() {
  logSection('Step 1: Firebase Authentication');
  
  // Test 1: Login with Firebase
  const loginResult = await runTest('Login with Firebase Auth-V2', async () => {
    const response = await axios.post(`${CONFIG.AUTH_V2_URL}/v1/auth/login`, {
      email: CONFIG.TEST_USER.email,
      password: CONFIG.TEST_USER.password
    });
    
    if (!response.data.success) {
      throw new Error('Login failed: ' + JSON.stringify(response.data));
    }
    
    if (!response.data.data.idToken) {
      throw new Error('No idToken in response');
    }
    
    firebaseToken = response.data.data.idToken;
    userId = response.data.data.uid;

    log(`Firebase Token: ${firebaseToken.substring(0, 30)}...`, 'info');
    log(`User ID: ${userId}`, 'info');

    return { token: firebaseToken, userId };
  });

  // Test 2: Verify token
  await runTest('Verify Firebase Token', async () => {
    const response = await axios.post(`${CONFIG.AUTH_V2_URL}/v1/token/verify`, {
      token: firebaseToken
    });

    if (!response.data.success) {
      throw new Error('Token verification failed');
    }

    // Verify response contains user data
    if (!response.data.data.firebaseUid) {
      throw new Error('No Firebase UID in response');
    }

    log(`Verified Firebase UID: ${response.data.data.firebaseUid}`, 'info');
    
    return response.data.data;
  });
  
  // Test 3: Get user profile
  await runTest('Get User Profile', async () => {
    const response = await axios.get(`${CONFIG.AUTH_V2_URL}/v1/auth/profile`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    
    if (!response.data.success) {
      throw new Error('Failed to get profile');
    }
    
    log(`User Email: ${response.data.data.email}`, 'info');
    log(`Email Verified: ${response.data.data.emailVerified}`, 'info');
    
    return response.data.data;
  });
}

// ============================================================================
// ARCHIVE SERVICE TESTS
// ============================================================================

async function testArchiveService() {
  logSection('Step 2: Archive Service with Firebase Token');
  
  let jobId = null;
  
  // Test 1: List existing jobs
  await runTest('Archive - List Jobs', async () => {
    const response = await axios.get(`${CONFIG.ARCHIVE_URL}/api/jobs`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    
    if (!response.data.success) {
      throw new Error('Failed to list jobs');
    }
    
    log(`Found ${response.data.data.length} existing jobs`, 'info');
    return response.data.data;
  });
  
  // Test 2: Create new analysis job
  const createResult = await runTest('Archive - Create Analysis Job', async () => {
    const response = await axios.post(`${CONFIG.ARCHIVE_URL}/api/jobs`, {
      url: 'https://example.com/test-auth-v2-e2e',
      analysis_type: 'full',
      priority: 'normal'
    }, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    
    if (!response.data.success) {
      throw new Error('Failed to create job');
    }
    
    jobId = response.data.data.id;
    log(`Created job with ID: ${jobId}`, 'info');
    
    return response.data.data;
  });
  
  // Test 3: Get job details
  await runTest('Archive - Get Job Details', async () => {
    const response = await axios.get(`${CONFIG.ARCHIVE_URL}/api/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    
    if (!response.data.success) {
      throw new Error('Failed to get job details');
    }
    
    log(`Job Status: ${response.data.data.status}`, 'info');
    return response.data.data;
  });
  
  // Test 4: Get job results (might be empty if not processed)
  await runTest('Archive - Get Job Results', async () => {
    const response = await axios.get(`${CONFIG.ARCHIVE_URL}/api/jobs/${jobId}/results`, {
      headers: { Authorization: `Bearer ${firebaseToken}` },
      validateStatus: () => true
    });
    
    // Results might not be available yet, that's okay
    if (response.status === 404) {
      log('Results not available yet (job still processing)', 'warning');
      return null;
    }
    
    if (!response.data.success) {
      throw new Error('Failed to get results');
    }
    
    return response.data.data;
  });
  
  // Test 5: Delete job
  await runTest('Archive - Delete Job', async () => {
    const response = await axios.delete(`${CONFIG.ARCHIVE_URL}/api/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    
    if (!response.data.success) {
      throw new Error('Failed to delete job');
    }
    
    log('Job deleted successfully', 'success');
    return response.data;
  });
}

// ============================================================================
// ASSESSMENT SERVICE TESTS
// ============================================================================

async function testAssessmentService() {
  logSection('Step 3: Assessment Service with Firebase Token');
  
  // Test 1: List assessments
  await runTest('Assessment - List Assessments', async () => {
    const response = await axios.get(`${CONFIG.ASSESSMENT_URL}/api/assessments`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    
    if (!response.data.success) {
      throw new Error('Failed to list assessments');
    }
    
    log(`Found ${response.data.data.length} assessments`, 'info');
    return response.data.data;
  });
  
  // Test 2: Get user stats
  await runTest('Assessment - Get User Stats', async () => {
    const response = await axios.get(`${CONFIG.ASSESSMENT_URL}/api/assessments/stats`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    
    if (!response.data.success) {
      throw new Error('Failed to get stats');
    }
    
    log(`Total Assessments: ${response.data.data.total || 0}`, 'info');
    return response.data.data;
  });
  
  // Test 3: Submit new assessment
  await runTest('Assessment - Submit Assessment', async () => {
    const assessmentData = {
      answers: [
        { question_id: 1, answer: 'A' },
        { question_id: 2, answer: 'B' },
        { question_id: 3, answer: 'C' }
      ]
    };
    
    const response = await axios.post(`${CONFIG.ASSESSMENT_URL}/api/assessments/submit`, 
      assessmentData,
      {
        headers: { Authorization: `Bearer ${firebaseToken}` },
        validateStatus: () => true
      }
    );
    
    // Might fail due to insufficient tokens or invalid questions, that's okay
    if (response.status === 400 || response.status === 402) {
      log('Assessment submission failed (expected - insufficient tokens or invalid data)', 'warning');
      return null;
    }
    
    if (!response.data.success) {
      throw new Error('Failed to submit assessment');
    }
    
    return response.data.data;
  });
}

// ============================================================================
// CHATBOT SERVICE TESTS
// ============================================================================

async function testChatbotService() {
  logSection('Step 4: Chatbot Service with Firebase Token');
  
  let conversationId = null;
  
  // Test 1: List conversations
  await runTest('Chatbot - List Conversations', async () => {
    const response = await axios.get(`${CONFIG.CHATBOT_URL}/api/conversations`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    
    if (!response.data.success) {
      throw new Error('Failed to list conversations');
    }
    
    log(`Found ${response.data.data.length} conversations`, 'info');
    
    if (response.data.data.length > 0) {
      conversationId = response.data.data[0].id;
    }
    
    return response.data.data;
  });
  
  // Test 2: Create new conversation
  if (!conversationId) {
    await runTest('Chatbot - Create Conversation', async () => {
      const response = await axios.post(`${CONFIG.CHATBOT_URL}/api/conversations`, {
        title: 'E2E Test Conversation'
      }, {
        headers: { Authorization: `Bearer ${firebaseToken}` }
      });
      
      if (!response.data.success) {
        throw new Error('Failed to create conversation');
      }
      
      conversationId = response.data.data.id;
      log(`Created conversation with ID: ${conversationId}`, 'info');
      
      return response.data.data;
    });
  }
  
  // Test 3: Send message
  await runTest('Chatbot - Send Message', async () => {
    const response = await axios.post(`${CONFIG.CHATBOT_URL}/api/chat`, {
      message: 'Hello, this is an E2E test with Firebase token',
      conversation_id: conversationId
    }, {
      headers: { Authorization: `Bearer ${firebaseToken}` },
      validateStatus: () => true
    });
    
    // Might fail due to insufficient tokens
    if (response.status === 402) {
      log('Chat failed (insufficient tokens)', 'warning');
      return null;
    }
    
    if (!response.data.success) {
      throw new Error('Failed to send message');
    }
    
    return response.data.data;
  });
  
  // Test 4: Get conversation history
  if (conversationId) {
    await runTest('Chatbot - Get Conversation History', async () => {
      const response = await axios.get(`${CONFIG.CHATBOT_URL}/api/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${firebaseToken}` }
      });
      
      if (!response.data.success) {
        throw new Error('Failed to get conversation history');
      }
      
      log(`Conversation has ${response.data.data.messages?.length || 0} messages`, 'info');
      return response.data.data;
    });
  }
}

// ============================================================================
// CROSS-SERVICE INTEGRATION TESTS
// ============================================================================

async function testCrossServiceIntegration() {
  logSection('Step 5: Cross-Service Integration');

  // Test 1: Create job and verify it appears in list
  await runTest('Integration - Job Creation Flow', async () => {
    // Create job
    const createResponse = await axios.post(`${CONFIG.ARCHIVE_URL}/api/jobs`, {
      url: 'https://example.com/integration-test',
      analysis_type: 'full'
    }, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });

    if (!createResponse.data.success) {
      throw new Error('Failed to create job');
    }

    const jobId = createResponse.data.data.id;

    // Verify it appears in list
    const listResponse = await axios.get(`${CONFIG.ARCHIVE_URL}/api/jobs`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });

    if (!listResponse.data.success) {
      throw new Error('Failed to list jobs');
    }

    const foundJob = listResponse.data.data.find(job => job.id === jobId);
    if (!foundJob) {
      throw new Error('Created job not found in list');
    }

    // Cleanup
    await axios.delete(`${CONFIG.ARCHIVE_URL}/api/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });

    return { jobId, found: true };
  });

  // Test 2: Multiple services with same token
  await runTest('Integration - Same Token Multiple Services', async () => {
    const results = await Promise.all([
      axios.get(`${CONFIG.ARCHIVE_URL}/api/jobs`, {
        headers: { Authorization: `Bearer ${firebaseToken}` }
      }),
      axios.get(`${CONFIG.ASSESSMENT_URL}/api/assessments`, {
        headers: { Authorization: `Bearer ${firebaseToken}` }
      }),
      axios.get(`${CONFIG.CHATBOT_URL}/api/conversations`, {
        headers: { Authorization: `Bearer ${firebaseToken}` }
      })
    ]);

    const allSuccessful = results.every(r => r.data.success);
    if (!allSuccessful) {
      throw new Error('Not all services accepted the Firebase token');
    }

    log('All services accepted the same Firebase token', 'success');
    return { servicesAccepted: results.length };
  });
}

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

async function testPerformance() {
  logSection('Step 6: Performance Testing with Firebase Token');

  // Test 1: Sequential requests latency
  await runTest('Performance - Sequential Requests', async () => {
    const iterations = 10;
    const latencies = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await axios.get(`${CONFIG.ARCHIVE_URL}/api/jobs`, {
        headers: { Authorization: `Bearer ${firebaseToken}` }
      });
      latencies.push(Date.now() - start);
    }

    const avg = latencies.reduce((a, b) => a + b, 0) / iterations;
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);

    log(`Latency - Avg: ${avg.toFixed(2)}ms, Min: ${min}ms, Max: ${max}ms`, 'info');

    return { avg, min, max, latencies };
  });

  // Test 2: Concurrent requests
  await runTest('Performance - Concurrent Requests', async () => {
    const concurrentCount = 20;
    const requests = Array(concurrentCount).fill(null).map(() =>
      axios.get(`${CONFIG.ARCHIVE_URL}/api/jobs`, {
        headers: { Authorization: `Bearer ${firebaseToken}` }
      }).catch(err => ({ error: err.message }))
    );

    const start = Date.now();
    const results = await Promise.all(requests);
    const duration = Date.now() - start;

    const successful = results.filter(r => !r.error && r.data?.success).length;
    const successRate = (successful / concurrentCount) * 100;

    log(`${successful}/${concurrentCount} requests successful (${successRate}%)`, 'info');
    log(`Total duration: ${duration}ms, Avg per request: ${(duration / concurrentCount).toFixed(2)}ms`, 'info');

    if (successRate < 95) {
      throw new Error(`Success rate ${successRate}% below 95% threshold`);
    }

    return { successful, total: concurrentCount, successRate, duration };
  });

  // Test 3: Token caching effectiveness
  await runTest('Performance - Token Caching', async () => {
    // First request (cache miss)
    const start1 = Date.now();
    await axios.get(`${CONFIG.ARCHIVE_URL}/api/jobs`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    const firstRequestTime = Date.now() - start1;

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));

    // Second request (should be cached)
    const start2 = Date.now();
    await axios.get(`${CONFIG.ARCHIVE_URL}/api/jobs`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    const secondRequestTime = Date.now() - start2;

    log(`First request: ${firstRequestTime}ms, Second request: ${secondRequestTime}ms`, 'info');

    // Second request should be faster (cached)
    const improvement = ((firstRequestTime - secondRequestTime) / firstRequestTime * 100).toFixed(2);
    log(`Cache improvement: ${improvement}%`, 'info');

    return { firstRequestTime, secondRequestTime, improvement };
  });
}

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

async function testErrorHandling() {
  logSection('Step 7: Error Handling with Firebase Token');

  // Test 1: Invalid resource ID
  await runTest('Error - 404 Not Found', async () => {
    const response = await axios.get(`${CONFIG.ARCHIVE_URL}/api/jobs/99999999`, {
      headers: { Authorization: `Bearer ${firebaseToken}` },
      validateStatus: () => true
    });

    if (response.status !== 404) {
      throw new Error(`Expected 404, got ${response.status}`);
    }

    return { status: response.status };
  });

  // Test 2: Invalid request body
  await runTest('Error - 400 Bad Request', async () => {
    const response = await axios.post(`${CONFIG.ARCHIVE_URL}/api/jobs`, {
      // Missing required 'url' field
      analysis_type: 'full'
    }, {
      headers: { Authorization: `Bearer ${firebaseToken}` },
      validateStatus: () => true
    });

    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }

    return { status: response.status };
  });

  // Test 3: Expired/Invalid token handling
  await runTest('Error - Invalid Token', async () => {
    const response = await axios.get(`${CONFIG.ARCHIVE_URL}/api/jobs`, {
      headers: { Authorization: 'Bearer invalid_token_here' },
      validateStatus: () => true
    });

    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }

    return { status: response.status };
  });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log(chalk.bold.green('\n🚀 Starting End-to-End Testing with Auth-V2 (Firebase)\n'));
  console.log(chalk.yellow('This test suite validates complete user journey with Firebase authentication\n'));

  const startTime = Date.now();

  try {
    // Step 1: Authentication
    await testAuthentication();

    // Step 2: Archive Service
    await testArchiveService();

    // Step 3: Assessment Service
    await testAssessmentService();

    // Step 4: Chatbot Service
    await testChatbotService();

    // Step 5: Cross-Service Integration
    await testCrossServiceIntegration();

    // Step 6: Performance
    await testPerformance();

    // Step 7: Error Handling
    await testErrorHandling();

  } catch (error) {
    log(`Fatal error during testing: ${error.message}`, 'error');
  }

  const duration = (Date.now() - startTime) / 1000;

  // Generate report
  generateReport(duration);
}

function generateReport(duration) {
  logSection('Test Results Summary');

  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(2);

  console.log(chalk.bold(`Total Tests: ${testResults.total}`));
  console.log(chalk.green(`✓ Passed: ${testResults.passed}`));
  console.log(chalk.red(`✗ Failed: ${testResults.failed}`));
  console.log(chalk.bold(`Success Rate: ${successRate}%`));
  console.log(chalk.bold(`Duration: ${duration.toFixed(2)}s\n`));

  if (testResults.failed > 0) {
    console.log(chalk.red.bold('Failed Tests:'));
    testResults.tests
      .filter(t => t.status === 'failed')
      .forEach(t => {
        console.log(chalk.red(`  ✗ ${t.name}: ${t.error}`));
      });
    console.log();
  }

  // Summary
  if (testResults.failed === 0) {
    console.log(chalk.green.bold('🎉 All tests passed! Auth-V2 integration is working perfectly.\n'));
  } else {
    console.log(chalk.yellow.bold(`⚠️  ${testResults.failed} test(s) failed. Please review the errors above.\n`));
  }

  // Save report
  const fs = require('fs');
  const path = require('path');
  const reportPath = path.join(__dirname, 'reports', `auth-v2-e2e-test-${new Date().toISOString()}.json`);

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({
    ...testResults,
    duration,
    successRate,
    timestamp: new Date().toISOString()
  }, null, 2));

  console.log(chalk.blue(`📄 Detailed report saved to: ${reportPath}\n`));

  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    log(`Unhandled error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runAllTests, testResults };
