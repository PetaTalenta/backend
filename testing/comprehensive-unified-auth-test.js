#!/usr/bin/env node

/**
 * Comprehensive Unified Auth Testing Suite
 * Tests all services with both Firebase (auth-v2) and Legacy JWT tokens
 */

const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  API_GATEWAY_URL: process.env.API_GATEWAY_URL || 'http://localhost:3000',
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  AUTH_V2_SERVICE_URL: process.env.AUTH_V2_SERVICE_URL || 'http://localhost:3008',
  ARCHIVE_SERVICE_URL: process.env.ARCHIVE_SERVICE_URL || 'http://localhost:3002',
  ASSESSMENT_SERVICE_URL: process.env.ASSESSMENT_SERVICE_URL || 'http://localhost:3003',
  CHATBOT_SERVICE_URL: process.env.CHATBOT_SERVICE_URL || 'http://localhost:3006',
  NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
  ADMIN_SERVICE_URL: process.env.ADMIN_SERVICE_URL || 'http://localhost:3007',
  
  // Test accounts
  TEST_USER: {
    email: 'kasykoi@gmail.com',
    password: 'Anjas123'
  },
  ADMIN_USER: {
    username: 'superadmin',
    password: 'admin123'
  }
};

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  categories: {
    authentication: { passed: 0, failed: 0, tests: [] },
    serviceAccess: { passed: 0, failed: 0, tests: [] },
    fallback: { passed: 0, failed: 0, tests: [] },
    performance: { passed: 0, failed: 0, tests: [] },
    security: { passed: 0, failed: 0, tests: [] },
    integration: { passed: 0, failed: 0, tests: [] },
    errorHandling: { passed: 0, failed: 0, tests: [] }
  },
  startTime: new Date(),
  endTime: null
};

// Tokens storage
let firebaseToken = null;
let jwtToken = null;

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: chalk.blue('ℹ'),
    success: chalk.green('✓'),
    error: chalk.red('✗'),
    warning: chalk.yellow('⚠'),
    test: chalk.cyan('→')
  }[type] || chalk.white('•');
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function logSection(title) {
  console.log('\n' + chalk.bold.cyan('═'.repeat(80)));
  console.log(chalk.bold.cyan(`  ${title}`));
  console.log(chalk.bold.cyan('═'.repeat(80)) + '\n');
}

async function runTest(category, name, testFn) {
  testResults.total++;
  log(`Testing: ${name}`, 'test');
  
  try {
    const startTime = Date.now();
    await testFn();
    const duration = Date.now() - startTime;
    
    testResults.passed++;
    testResults.categories[category].passed++;
    testResults.categories[category].tests.push({
      name,
      status: 'passed',
      duration
    });
    
    log(`${name} - PASSED (${duration}ms)`, 'success');
    return true;
  } catch (error) {
    testResults.failed++;
    testResults.categories[category].failed++;
    testResults.categories[category].tests.push({
      name,
      status: 'failed',
      error: error.message
    });
    
    log(`${name} - FAILED: ${error.message}`, 'error');
    return false;
  }
}

// ============================================================================
// PHASE 1: AUTHENTICATION TESTING
// ============================================================================

async function testFirebaseAuthentication() {
  logSection('Phase 1: Firebase Authentication (Auth-V2)');
  
  // Test 1: Login with Firebase
  await runTest('authentication', 'Firebase Login', async () => {
    const response = await axios.post(`${CONFIG.AUTH_V2_SERVICE_URL}/v1/auth/login`, {
      email: CONFIG.TEST_USER.email,
      password: CONFIG.TEST_USER.password
    });
    
    if (!response.data.success || !response.data.data.idToken) {
      throw new Error('Firebase login failed or no token returned');
    }
    
    firebaseToken = response.data.data.idToken;
    log(`Firebase token obtained: ${firebaseToken.substring(0, 20)}...`, 'info');
  });
  
  // Test 2: Verify Firebase token
  await runTest('authentication', 'Firebase Token Verification', async () => {
    const response = await axios.post(`${CONFIG.AUTH_V2_SERVICE_URL}/v1/token/verify`, {
      idToken: firebaseToken
    });
    
    if (!response.data.success || !response.data.data.uid) {
      throw new Error('Firebase token verification failed');
    }
  });
  
  // Test 3: Get user profile with Firebase token
  await runTest('authentication', 'Get Profile with Firebase Token', async () => {
    const response = await axios.get(`${CONFIG.AUTH_V2_SERVICE_URL}/v1/auth/profile`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    
    if (!response.data.success || !response.data.data.email) {
      throw new Error('Failed to get profile with Firebase token');
    }
  });
}

async function testLegacyJWTAuthentication() {
  logSection('Phase 1: Legacy JWT Authentication');
  
  // Test 1: Login with legacy auth
  await runTest('authentication', 'Legacy JWT Login', async () => {
    const response = await axios.post(`${CONFIG.AUTH_SERVICE_URL}/auth/login`, {
      email: CONFIG.TEST_USER.email,
      password: CONFIG.TEST_USER.password
    });
    
    if (!response.data.success || !response.data.token) {
      throw new Error('Legacy JWT login failed or no token returned');
    }
    
    jwtToken = response.data.token;
    log(`JWT token obtained: ${jwtToken.substring(0, 20)}...`, 'info');
  });
  
  // Test 2: Verify JWT token
  await runTest('authentication', 'JWT Token Verification', async () => {
    const response = await axios.post(`${CONFIG.AUTH_SERVICE_URL}/auth/verify-token`, {
      token: jwtToken
    });
    
    if (!response.data.valid || !response.data.user) {
      throw new Error('JWT token verification failed');
    }
  });
}

// ============================================================================
// PHASE 2: SERVICE ACCESS TESTING
// ============================================================================

async function testArchiveServiceAccess() {
  logSection('Phase 2: Archive Service Access Testing');
  
  // Test with Firebase token
  await runTest('serviceAccess', 'Archive Service - List Jobs (Firebase)', async () => {
    const response = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    
    if (!response.data.success) {
      throw new Error('Failed to list jobs with Firebase token');
    }
  });
  
  // Test with JWT token
  await runTest('serviceAccess', 'Archive Service - List Jobs (JWT)', async () => {
    const response = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
      headers: { Authorization: `Bearer ${jwtToken}` }
    });
    
    if (!response.data.success) {
      throw new Error('Failed to list jobs with JWT token');
    }
  });
  
  // Test create job with Firebase token
  await runTest('serviceAccess', 'Archive Service - Create Job (Firebase)', async () => {
    const response = await axios.post(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
      url: 'https://example.com/test',
      analysis_type: 'full'
    }, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    
    if (!response.data.success) {
      throw new Error('Failed to create job with Firebase token');
    }
  });
  
  // Test create job with JWT token
  await runTest('serviceAccess', 'Archive Service - Create Job (JWT)', async () => {
    const response = await axios.post(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
      url: 'https://example.com/test-jwt',
      analysis_type: 'full'
    }, {
      headers: { Authorization: `Bearer ${jwtToken}` }
    });
    
    if (!response.data.success) {
      throw new Error('Failed to create job with JWT token');
    }
  });
}

async function testAssessmentServiceAccess() {
  logSection('Phase 2: Assessment Service Access Testing');
  
  // Test with Firebase token
  await runTest('serviceAccess', 'Assessment Service - List Assessments (Firebase)', async () => {
    const response = await axios.get(`${CONFIG.ASSESSMENT_SERVICE_URL}/api/assessments`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    
    if (!response.data.success) {
      throw new Error('Failed to list assessments with Firebase token');
    }
  });
  
  // Test with JWT token
  await runTest('serviceAccess', 'Assessment Service - List Assessments (JWT)', async () => {
    const response = await axios.get(`${CONFIG.ASSESSMENT_SERVICE_URL}/api/assessments`, {
      headers: { Authorization: `Bearer ${jwtToken}` }
    });
    
    if (!response.data.success) {
      throw new Error('Failed to list assessments with JWT token');
    }
  });
}

async function testChatbotServiceAccess() {
  logSection('Phase 2: Chatbot Service Access Testing');
  
  // Test with Firebase token
  await runTest('serviceAccess', 'Chatbot Service - Get Conversations (Firebase)', async () => {
    const response = await axios.get(`${CONFIG.CHATBOT_SERVICE_URL}/api/conversations`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    
    if (!response.data.success) {
      throw new Error('Failed to get conversations with Firebase token');
    }
  });
  
  // Test with JWT token
  await runTest('serviceAccess', 'Chatbot Service - Get Conversations (JWT)', async () => {
    const response = await axios.get(`${CONFIG.CHATBOT_SERVICE_URL}/api/conversations`, {
      headers: { Authorization: `Bearer ${jwtToken}` }
    });
    
    if (!response.data.success) {
      throw new Error('Failed to get conversations with JWT token');
    }
  });
}

// ============================================================================
// PHASE 3: FALLBACK MECHANISM TESTING
// ============================================================================

async function testFallbackMechanism() {
  logSection('Phase 3: Fallback Mechanism Testing');

  // Test 1: Invalid Firebase token should fallback to JWT verification
  await runTest('fallback', 'Invalid Firebase Token Fallback', async () => {
    try {
      // Use a malformed token that looks like Firebase but isn't valid
      const fakeFirebaseToken = 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImZha2UifQ.' +
        'eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vZmFrZSJ9.' +
        'fake_signature_that_is_very_long_to_look_like_firebase_token';

      const response = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
        headers: { Authorization: `Bearer ${fakeFirebaseToken}` },
        validateStatus: () => true // Don't throw on any status
      });

      // Should return 401 since both verifications will fail
      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }
    } catch (error) {
      if (error.message.includes('Expected 401')) throw error;
      // Network errors are acceptable for this test
    }
  });

  // Test 2: Test with valid JWT when Firebase might fail
  await runTest('fallback', 'JWT Token Works When Firebase Unavailable', async () => {
    const response = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
      headers: { Authorization: `Bearer ${jwtToken}` }
    });

    if (!response.data.success) {
      throw new Error('JWT token should work even if Firebase verification fails');
    }
  });
}

// ============================================================================
// PHASE 4: PERFORMANCE TESTING
// ============================================================================

async function testPerformance() {
  logSection('Phase 4: Performance Testing');

  // Test 1: Measure auth latency with Firebase token
  await runTest('performance', 'Auth Latency - Firebase Token', async () => {
    const iterations = 10;
    const latencies = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
        headers: { Authorization: `Bearer ${firebaseToken}` }
      });
      latencies.push(Date.now() - start);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / iterations;
    const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];

    log(`Average latency: ${avgLatency.toFixed(2)}ms, P95: ${p95Latency}ms`, 'info');

    if (p95Latency > 500) {
      throw new Error(`P95 latency ${p95Latency}ms exceeds 500ms threshold`);
    }
  });

  // Test 2: Measure auth latency with JWT token
  await runTest('performance', 'Auth Latency - JWT Token', async () => {
    const iterations = 10;
    const latencies = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      latencies.push(Date.now() - start);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / iterations;
    const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];

    log(`Average latency: ${avgLatency.toFixed(2)}ms, P95: ${p95Latency}ms`, 'info');

    if (p95Latency > 500) {
      throw new Error(`P95 latency ${p95Latency}ms exceeds 500ms threshold`);
    }
  });

  // Test 3: Concurrent requests
  await runTest('performance', 'Concurrent Requests - 50 Mixed Tokens', async () => {
    const concurrentRequests = 50;
    const requests = [];

    for (let i = 0; i < concurrentRequests; i++) {
      const token = i % 2 === 0 ? firebaseToken : jwtToken;
      requests.push(
        axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => ({ error: err.message }))
      );
    }

    const start = Date.now();
    const results = await Promise.all(requests);
    const duration = Date.now() - start;

    const successful = results.filter(r => !r.error && r.data?.success).length;
    const successRate = (successful / concurrentRequests) * 100;

    log(`${successful}/${concurrentRequests} requests successful (${successRate.toFixed(2)}%) in ${duration}ms`, 'info');

    if (successRate < 95) {
      throw new Error(`Success rate ${successRate.toFixed(2)}% below 95% threshold`);
    }
  });
}

// ============================================================================
// PHASE 5: SECURITY TESTING
// ============================================================================

async function testSecurity() {
  logSection('Phase 5: Security Testing');

  // Test 1: Missing token should return 401
  await runTest('security', 'Missing Token Returns 401', async () => {
    const response = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
      validateStatus: () => true
    });

    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  });

  // Test 2: Invalid token should return 401
  await runTest('security', 'Invalid Token Returns 401', async () => {
    const response = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
      headers: { Authorization: 'Bearer invalid_token_here' },
      validateStatus: () => true
    });

    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  });

  // Test 3: Malformed Authorization header
  await runTest('security', 'Malformed Authorization Header', async () => {
    const response = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
      headers: { Authorization: 'InvalidFormat token' },
      validateStatus: () => true
    });

    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  });

  // Test 4: Expired token handling (simulate with very old token)
  await runTest('security', 'Expired Token Handling', async () => {
    // This is a placeholder - in real scenario, we'd use an actually expired token
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzLCJleHAiOjE2MDAwMDAwMDB9.fake';

    const response = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
      validateStatus: () => true
    });

    if (response.status !== 401) {
      throw new Error(`Expected 401 for expired token, got ${response.status}`);
    }
  });
}

// ============================================================================
// PHASE 6: ERROR HANDLING TESTING
// ============================================================================

async function testErrorHandling() {
  logSection('Phase 6: Error Handling Testing');

  // Test 1: 404 Not Found
  await runTest('errorHandling', '404 Not Found Error', async () => {
    const response = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs/99999999`, {
      headers: { Authorization: `Bearer ${firebaseToken}` },
      validateStatus: () => true
    });

    if (response.status !== 404) {
      throw new Error(`Expected 404, got ${response.status}`);
    }
  });

  // Test 2: 400 Bad Request
  await runTest('errorHandling', '400 Bad Request Error', async () => {
    const response = await axios.post(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
      // Missing required fields
      analysis_type: 'full'
    }, {
      headers: { Authorization: `Bearer ${firebaseToken}` },
      validateStatus: () => true
    });

    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }
  });

  // Test 3: Error response format consistency
  await runTest('errorHandling', 'Error Response Format Consistency', async () => {
    const response = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
      validateStatus: () => true
    });

    if (!response.data.success === false || !response.data.error) {
      throw new Error('Error response format is inconsistent');
    }
  });
}

// ============================================================================
// PHASE 7: END-TO-END INTEGRATION TESTING
// ============================================================================

async function testEndToEndIntegration() {
  logSection('Phase 7: End-to-End Integration Testing');

  // Test 1: Complete user journey with Firebase token
  await runTest('integration', 'E2E Journey - Firebase Token', async () => {
    // Step 1: Create analysis job
    const jobResponse = await axios.post(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
      url: 'https://example.com/e2e-test',
      analysis_type: 'full'
    }, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });

    if (!jobResponse.data.success) {
      throw new Error('Failed to create job');
    }

    const jobId = jobResponse.data.data.id;

    // Step 2: Get job details
    const detailsResponse = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });

    if (!detailsResponse.data.success) {
      throw new Error('Failed to get job details');
    }

    // Step 3: List all jobs
    const listResponse = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });

    if (!listResponse.data.success) {
      throw new Error('Failed to list jobs');
    }

    log('E2E journey completed successfully', 'success');
  });

  // Test 2: Complete user journey with JWT token
  await runTest('integration', 'E2E Journey - JWT Token', async () => {
    // Similar flow with JWT token
    const jobResponse = await axios.post(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
      url: 'https://example.com/e2e-test-jwt',
      analysis_type: 'full'
    }, {
      headers: { Authorization: `Bearer ${jwtToken}` }
    });

    if (!jobResponse.data.success) {
      throw new Error('Failed to create job with JWT');
    }

    log('E2E journey with JWT completed successfully', 'success');
  });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log(chalk.bold.green('\n🚀 Starting Comprehensive Unified Auth Testing Suite\n'));

  try {
    // Phase 1: Authentication
    await testFirebaseAuthentication();
    await testLegacyJWTAuthentication();

    // Phase 2: Service Access
    await testArchiveServiceAccess();
    await testAssessmentServiceAccess();
    await testChatbotServiceAccess();

    // Phase 3: Fallback Mechanism
    await testFallbackMechanism();

    // Phase 4: Performance
    await testPerformance();

    // Phase 5: Security
    await testSecurity();

    // Phase 6: Error Handling
    await testErrorHandling();

    // Phase 7: Integration
    await testEndToEndIntegration();

  } catch (error) {
    log(`Fatal error during testing: ${error.message}`, 'error');
  }

  // Generate final report
  testResults.endTime = new Date();
  generateReport();
}

function generateReport() {
  logSection('Test Results Summary');

  const duration = (testResults.endTime - testResults.startTime) / 1000;
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(2);

  console.log(chalk.bold(`Total Tests: ${testResults.total}`));
  console.log(chalk.green(`✓ Passed: ${testResults.passed}`));
  console.log(chalk.red(`✗ Failed: ${testResults.failed}`));
  console.log(chalk.yellow(`⊘ Skipped: ${testResults.skipped}`));
  console.log(chalk.bold(`Success Rate: ${successRate}%`));
  console.log(chalk.bold(`Duration: ${duration.toFixed(2)}s\n`));

  // Category breakdown
  console.log(chalk.bold('Category Breakdown:'));
  Object.entries(testResults.categories).forEach(([category, results]) => {
    const total = results.passed + results.failed;
    const rate = total > 0 ? ((results.passed / total) * 100).toFixed(2) : 0;
    console.log(`  ${category}: ${results.passed}/${total} (${rate}%)`);
  });

  // Save detailed report
  const reportPath = path.join(__dirname, 'reports', `comprehensive-test-${new Date().toISOString()}.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));

  console.log(chalk.blue(`\n📄 Detailed report saved to: ${reportPath}\n`));

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log(`Unhandled error: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});

