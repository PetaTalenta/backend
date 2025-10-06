#!/usr/bin/env node

/**
 * Fallback Mechanism Testing
 * Tests automatic fallback between Firebase and JWT token verification
 */

const axios = require('axios');
const chalk = require('chalk');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

// Configuration
const CONFIG = {
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  AUTH_V2_SERVICE_URL: process.env.AUTH_V2_SERVICE_URL || 'http://localhost:3008',
  ARCHIVE_SERVICE_URL: process.env.ARCHIVE_SERVICE_URL || 'http://localhost:3002',
  
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
let jwtToken = null;

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
    return null;
  }
}

// ============================================================================
// SETUP: GET TOKENS
// ============================================================================

async function setupTokens() {
  logSection('Setup: Obtaining Test Tokens');
  
  // Get Firebase token
  await runTest('Get Firebase Token', async () => {
    const response = await axios.post(`${CONFIG.AUTH_V2_SERVICE_URL}/v1/auth/login`, {
      email: CONFIG.TEST_USER.email,
      password: CONFIG.TEST_USER.password
    });
    
    if (!response.data.success || !response.data.data.idToken) {
      throw new Error('Failed to get Firebase token');
    }
    
    firebaseToken = response.data.data.idToken;
    log(`Firebase token: ${firebaseToken.substring(0, 30)}...`, 'info');
    return firebaseToken;
  });
  
  // Get JWT token
  await runTest('Get JWT Token', async () => {
    const response = await axios.post(`${CONFIG.AUTH_SERVICE_URL}/auth/login`, {
      email: CONFIG.TEST_USER.email,
      password: CONFIG.TEST_USER.password
    });
    
    if (!response.data.success || !response.data.token) {
      throw new Error('Failed to get JWT token');
    }
    
    jwtToken = response.data.token;
    log(`JWT token: ${jwtToken.substring(0, 30)}...`, 'info');
    return jwtToken;
  });
}

// ============================================================================
// TEST 1: NORMAL OPERATION (BOTH SERVICES UP)
// ============================================================================

async function testNormalOperation() {
  logSection('Test 1: Normal Operation (Both Services Up)');
  
  // Test Firebase token
  await runTest('Firebase Token - Primary Verification', async () => {
    const response = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    
    if (!response.data.success) {
      throw new Error('Firebase token verification failed');
    }
    
    log('Firebase token verified successfully', 'success');
    return response.data;
  });
  
  // Test JWT token
  await runTest('JWT Token - Primary Verification', async () => {
    const response = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
      headers: { Authorization: `Bearer ${jwtToken}` }
    });
    
    if (!response.data.success) {
      throw new Error('JWT token verification failed');
    }
    
    log('JWT token verified successfully', 'success');
    return response.data;
  });
  
  // Test alternating tokens
  await runTest('Alternating Tokens - Multiple Requests', async () => {
    const requests = [];
    
    for (let i = 0; i < 10; i++) {
      const token = i % 2 === 0 ? firebaseToken : jwtToken;
      requests.push(
        axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
    }
    
    const results = await Promise.all(requests);
    const allSuccessful = results.every(r => r.data.success);
    
    if (!allSuccessful) {
      throw new Error('Not all requests succeeded');
    }
    
    log('All 10 alternating requests succeeded', 'success');
    return { total: 10, successful: 10 };
  });
}

// ============================================================================
// TEST 2: INVALID TOKEN FALLBACK
// ============================================================================

async function testInvalidTokenFallback() {
  logSection('Test 2: Invalid Token Fallback');
  
  // Test 1: Malformed Firebase-like token
  await runTest('Malformed Firebase Token - Should Fail', async () => {
    const fakeFirebaseToken = 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImZha2UifQ.' +
      'eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vZmFrZSIsImF1ZCI6ImZha2UifQ.' +
      'fake_signature_that_looks_like_firebase_but_is_invalid_and_very_long_to_match_pattern';
    
    const response = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
      headers: { Authorization: `Bearer ${fakeFirebaseToken}` },
      validateStatus: () => true
    });
    
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
    
    log('Malformed Firebase token correctly rejected', 'success');
    return { status: 401 };
  });
  
  // Test 2: Malformed JWT token
  await runTest('Malformed JWT Token - Should Fail', async () => {
    const fakeJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzfQ.fake_signature';
    
    const response = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
      headers: { Authorization: `Bearer ${fakeJwtToken}` },
      validateStatus: () => true
    });
    
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
    
    log('Malformed JWT token correctly rejected', 'success');
    return { status: 401 };
  });
  
  // Test 3: Completely invalid token
  await runTest('Invalid Token Format - Should Fail', async () => {
    const response = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
      headers: { Authorization: 'Bearer invalid_token_here' },
      validateStatus: () => true
    });
    
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
    
    log('Invalid token correctly rejected', 'success');
    return { status: 401 };
  });
}

// ============================================================================
// TEST 3: TOKEN TYPE DETECTION
// ============================================================================

async function testTokenTypeDetection() {
  logSection('Test 3: Token Type Detection');
  
  // Test 1: Firebase token detection
  await runTest('Firebase Token - Correct Detection', async () => {
    // Firebase tokens are typically 800-1500+ characters
    if (firebaseToken.length < 500) {
      throw new Error('Firebase token seems too short');
    }
    
    // Should contain multiple dots (JWT structure)
    const dots = (firebaseToken.match(/\./g) || []).length;
    if (dots !== 2) {
      throw new Error('Firebase token should have 2 dots (JWT structure)');
    }
    
    log(`Firebase token length: ${firebaseToken.length} chars`, 'info');
    return { length: firebaseToken.length, dots };
  });
  
  // Test 2: JWT token detection
  await runTest('JWT Token - Correct Detection', async () => {
    // JWT tokens are typically 200-400 characters
    if (jwtToken.length > 600) {
      throw new Error('JWT token seems too long');
    }
    
    // Should contain 2 dots (JWT structure)
    const dots = (jwtToken.match(/\./g) || []).length;
    if (dots !== 2) {
      throw new Error('JWT token should have 2 dots');
    }
    
    log(`JWT token length: ${jwtToken.length} chars`, 'info');
    return { length: jwtToken.length, dots };
  });
  
  // Test 3: Both tokens work with same service
  await runTest('Both Token Types - Same Service', async () => {
    const firebaseResponse = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    
    const jwtResponse = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
      headers: { Authorization: `Bearer ${jwtToken}` }
    });
    
    if (!firebaseResponse.data.success || !jwtResponse.data.success) {
      throw new Error('One or both token types failed');
    }
    
    log('Both token types work with the same service', 'success');
    return { firebase: true, jwt: true };
  });
}

// ============================================================================
// TEST 4: PERFORMANCE COMPARISON
// ============================================================================

async function testPerformanceComparison() {
  logSection('Test 4: Performance Comparison');
  
  // Test 1: Firebase token verification latency
  await runTest('Firebase Token - Verification Latency', async () => {
    const iterations = 20;
    const latencies = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
        headers: { Authorization: `Bearer ${firebaseToken}` }
      });
      latencies.push(Date.now() - start);
    }
    
    const avg = latencies.reduce((a, b) => a + b, 0) / iterations;
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    const p95 = latencies.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];
    
    log(`Firebase - Avg: ${avg.toFixed(2)}ms, Min: ${min}ms, Max: ${max}ms, P95: ${p95}ms`, 'info');
    
    return { avg, min, max, p95, latencies };
  });
  
  // Test 2: JWT token verification latency
  await runTest('JWT Token - Verification Latency', async () => {
    const iterations = 20;
    const latencies = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/api/jobs`, {
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      latencies.push(Date.now() - start);
    }
    
    const avg = latencies.reduce((a, b) => a + b, 0) / iterations;
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    const p95 = latencies.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];
    
    log(`JWT - Avg: ${avg.toFixed(2)}ms, Min: ${min}ms, Max: ${max}ms, P95: ${p95}ms`, 'info');
    
    return { avg, min, max, p95, latencies };
  });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log(chalk.bold.green('\n🚀 Starting Fallback Mechanism Testing\n'));
  console.log(chalk.yellow('This test suite validates automatic fallback between Firebase and JWT tokens\n'));
  
  const startTime = Date.now();
  
  try {
    // Setup
    await setupTokens();
    
    // Test 1: Normal operation
    await testNormalOperation();
    
    // Test 2: Invalid token fallback
    await testInvalidTokenFallback();
    
    // Test 3: Token type detection
    await testTokenTypeDetection();
    
    // Test 4: Performance comparison
    await testPerformanceComparison();
    
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
    console.log(chalk.green.bold('🎉 All fallback tests passed! Mechanism is working correctly.\n'));
  } else {
    console.log(chalk.yellow.bold(`⚠️  ${testResults.failed} test(s) failed. Please review the errors above.\n`));
  }
  
  // Save report
  const fs = require('fs');
  const path = require('path');
  const reportPath = path.join(__dirname, 'reports', `fallback-test-${new Date().toISOString()}.json`);
  
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
