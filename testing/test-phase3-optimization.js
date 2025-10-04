#!/usr/bin/env node

/**
 * Phase 3 Unified Auth Testing Script
 * Tests performance optimization, monitoring, and final validation
 * 
 * Test Coverage:
 * 1. Performance metrics (latency, throughput)
 * 2. Token caching effectiveness
 * 3. Load testing with concurrent requests
 * 4. All services integration
 * 5. Fallback mechanisms
 * 6. Error handling
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const AUTH_V2_SERVICE_URL = process.env.AUTH_V2_SERVICE_URL || 'http://localhost:3008';

// Test credentials
const TEST_USER = {
  email: 'kasykoi@gmail.com',
  password: 'Anjas123'
};

let jwtToken = null;
let firebaseToken = null;

const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: [],
  metrics: {
    authLatency: [],
    cacheHitRate: 0,
    throughput: 0
  }
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  log(`\n${'='.repeat(70)}`, 'cyan');
  log(`TEST: ${testName}`, 'cyan');
  log('='.repeat(70), 'cyan');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function logMetric(label, value, unit = '') {
  log(`📊 ${label}: ${value}${unit}`, 'magenta');
}

function recordTest(name, passed, message, latency = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    logSuccess(`${name}: ${message}`);
  } else {
    testResults.failed++;
    logError(`${name}: ${message}`);
  }
  
  testResults.tests.push({ name, passed, message, latency });
  
  if (latency !== null) {
    testResults.metrics.authLatency.push(latency);
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Authentication Setup
// ============================================================================

async function setupAuthentication() {
  logTest('Authentication Setup');
  
  try {
    // Get JWT token
    const jwtResponse = await axios.post(`${AUTH_SERVICE_URL}/auth/login`, TEST_USER);
    if (jwtResponse.data.success && jwtResponse.data.data.token) {
      jwtToken = jwtResponse.data.data.token;
      logSuccess(`JWT token obtained`);
    } else {
      throw new Error('Failed to get JWT token');
    }
    
    // Get Firebase token
    const firebaseResponse = await axios.post(`${AUTH_V2_SERVICE_URL}/v1/auth/login`, TEST_USER);
    if (firebaseResponse.data.success && firebaseResponse.data.data.idToken) {
      firebaseToken = firebaseResponse.data.data.idToken;
      logSuccess(`Firebase token obtained`);
    } else {
      throw new Error('Failed to get Firebase token');
    }
    
    return true;
  } catch (error) {
    logError(`Authentication setup failed: ${error.message}`);
    return false;
  }
}

// ============================================================================
// Test 1: Auth Latency Measurement
// ============================================================================

async function testAuthLatency() {
  logTest('Auth Latency Measurement');
  
  const services = [
    { name: 'Archive Service', url: `${API_BASE_URL}/api/archive/jobs`, method: 'get' },
    { name: 'Assessment Service', url: `${API_BASE_URL}/api/assessment/health`, method: 'get' },
    { name: 'Chatbot Service', url: `${API_BASE_URL}/api/chatbot/conversations`, method: 'get' },
    { name: 'Notification Service', url: `${API_BASE_URL}/api/notifications/health`, method: 'get' }
  ];
  
  const tokens = [
    { type: 'JWT', token: jwtToken },
    { type: 'Firebase', token: firebaseToken }
  ];
  
  for (const service of services) {
    for (const { type, token } of tokens) {
      try {
        const start = performance.now();
        const response = await axios({
          method: service.method,
          url: service.url,
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        });
        const latency = performance.now() - start;
        
        const passed = response.status === 200 && latency < 200;
        recordTest(
          `${service.name} (${type})`,
          passed,
          `Latency: ${latency.toFixed(2)}ms ${passed ? '(✓ <200ms)' : '(✗ ≥200ms)'}`,
          latency
        );
      } catch (error) {
        recordTest(
          `${service.name} (${type})`,
          false,
          `Failed: ${error.message}`
        );
      }
      
      await sleep(100); // Small delay between requests
    }
  }
}

// ============================================================================
// Test 2: Concurrent Request Load Test
// ============================================================================

async function testConcurrentLoad() {
  logTest('Concurrent Load Test (50 requests)');
  
  const concurrentRequests = 50;
  const url = `${API_BASE_URL}/api/archive/jobs`;
  
  logInfo(`Sending ${concurrentRequests} concurrent requests...`);
  
  const start = performance.now();
  const promises = [];
  
  for (let i = 0; i < concurrentRequests; i++) {
    const token = i % 2 === 0 ? jwtToken : firebaseToken;
    promises.push(
      axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      }).catch(err => ({ error: err.message }))
    );
  }
  
  const results = await Promise.all(promises);
  const duration = performance.now() - start;
  
  const successful = results.filter(r => !r.error && r.status === 200).length;
  const failed = results.filter(r => r.error).length;
  const successRate = (successful / concurrentRequests) * 100;
  const throughput = (concurrentRequests / duration) * 1000; // requests per second
  
  testResults.metrics.throughput = throughput;
  
  logMetric('Total Requests', concurrentRequests);
  logMetric('Successful', successful);
  logMetric('Failed', failed);
  logMetric('Success Rate', successRate.toFixed(2), '%');
  logMetric('Duration', duration.toFixed(2), 'ms');
  logMetric('Throughput', throughput.toFixed(2), ' req/s');
  
  const passed = successRate >= 99.5;
  recordTest(
    'Concurrent Load Test',
    passed,
    `Success rate: ${successRate.toFixed(2)}% ${passed ? '(✓ ≥99.5%)' : '(✗ <99.5%)'}`
  );
}

// ============================================================================
// Test 3: Token Type Detection and Fallback
// ============================================================================

async function testTokenFallback() {
  logTest('Token Type Detection and Fallback');
  
  // Test with valid tokens
  try {
    const jwtResponse = await axios.get(`${API_BASE_URL}/api/archive/jobs`, {
      headers: { Authorization: `Bearer ${jwtToken}` }
    });
    
    recordTest(
      'JWT Token Detection',
      jwtResponse.status === 200,
      'JWT token correctly detected and verified'
    );
  } catch (error) {
    recordTest('JWT Token Detection', false, error.message);
  }
  
  try {
    const firebaseResponse = await axios.get(`${API_BASE_URL}/api/archive/jobs`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    
    recordTest(
      'Firebase Token Detection',
      firebaseResponse.status === 200,
      'Firebase token correctly detected and verified'
    );
  } catch (error) {
    recordTest('Firebase Token Detection', false, error.message);
  }
  
  // Test with invalid token (should fail gracefully)
  try {
    await axios.get(`${API_BASE_URL}/api/archive/jobs`, {
      headers: { Authorization: 'Bearer invalid_token_12345' }
    });
    recordTest('Invalid Token Handling', false, 'Should have rejected invalid token');
  } catch (error) {
    recordTest(
      'Invalid Token Handling',
      error.response?.status === 401,
      'Invalid token correctly rejected with 401'
    );
  }
}

// ============================================================================
// Test 4: All Services Integration
// ============================================================================

async function testAllServicesIntegration() {
  logTest('All Services Integration Test');
  
  const endpoints = [
    { name: 'API Gateway Health', url: `${API_BASE_URL}/health`, auth: false },
    { name: 'Auth Service Health', url: `${AUTH_SERVICE_URL}/health`, auth: false },
    { name: 'Auth-V2 Service Health', url: `${AUTH_V2_SERVICE_URL}/health`, auth: false },
    { name: 'Archive Service', url: `${API_BASE_URL}/api/archive/jobs`, auth: true },
    { name: 'Assessment Service', url: `${API_BASE_URL}/api/assessment/health`, auth: true },
    { name: 'Chatbot Service', url: `${API_BASE_URL}/api/chatbot/conversations`, auth: true },
    { name: 'Notification Service', url: `${API_BASE_URL}/api/notifications/health`, auth: true }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = { timeout: 10000 };
      if (endpoint.auth) {
        config.headers = { Authorization: `Bearer ${firebaseToken}` };
      }
      
      const response = await axios.get(endpoint.url, config);
      recordTest(
        endpoint.name,
        response.status === 200,
        'Service responding correctly'
      );
    } catch (error) {
      recordTest(
        endpoint.name,
        false,
        `Service error: ${error.message}`
      );
    }
  }
}

// ============================================================================
// Test 5: Performance Metrics Analysis
// ============================================================================

function analyzePerformanceMetrics() {
  logTest('Performance Metrics Analysis');
  
  if (testResults.metrics.authLatency.length === 0) {
    logError('No latency data collected');
    return;
  }
  
  const latencies = testResults.metrics.authLatency.sort((a, b) => a - b);
  const count = latencies.length;
  
  const p50 = latencies[Math.floor(count * 0.50)];
  const p95 = latencies[Math.floor(count * 0.95)];
  const p99 = latencies[Math.floor(count * 0.99)];
  const avg = latencies.reduce((a, b) => a + b, 0) / count;
  const min = latencies[0];
  const max = latencies[count - 1];
  
  logMetric('Min Latency', min.toFixed(2), 'ms');
  logMetric('Max Latency', max.toFixed(2), 'ms');
  logMetric('Avg Latency', avg.toFixed(2), 'ms');
  logMetric('P50 Latency', p50.toFixed(2), 'ms');
  logMetric('P95 Latency', p95.toFixed(2), 'ms');
  logMetric('P99 Latency', p99.toFixed(2), 'ms');
  
  // Check against targets
  const p50Target = p50 < 50;
  const p95Target = p95 < 200;
  const p99Target = p99 < 500;
  
  recordTest('P50 Latency Target', p50Target, `${p50.toFixed(2)}ms ${p50Target ? '(✓ <50ms)' : '(✗ ≥50ms)'}`);
  recordTest('P95 Latency Target', p95Target, `${p95.toFixed(2)}ms ${p95Target ? '(✓ <200ms)' : '(✗ ≥200ms)'}`);
  recordTest('P99 Latency Target', p99Target, `${p99.toFixed(2)}ms ${p99Target ? '(✓ <500ms)' : '(✗ ≥500ms)'}`);
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests() {
  log('\n' + '='.repeat(70), 'cyan');
  log('PHASE 3: OPTIMIZATION & FINALIZATION TEST SUITE', 'cyan');
  log('='.repeat(70) + '\n', 'cyan');
  
  const setupSuccess = await setupAuthentication();
  if (!setupSuccess) {
    log('\n❌ Authentication setup failed. Cannot proceed with tests.', 'red');
    process.exit(1);
  }
  
  await sleep(1000);
  
  // Run all tests
  await testAuthLatency();
  await sleep(1000);
  
  await testConcurrentLoad();
  await sleep(1000);
  
  await testTokenFallback();
  await sleep(1000);
  
  await testAllServicesIntegration();
  await sleep(1000);
  
  analyzePerformanceMetrics();
  
  // Print summary
  log('\n' + '='.repeat(70), 'cyan');
  log('TEST SUMMARY', 'cyan');
  log('='.repeat(70), 'cyan');
  
  log(`\nTotal Tests: ${testResults.total}`, 'blue');
  log(`Passed: ${testResults.passed}`, 'green');
  log(`Failed: ${testResults.failed}`, 'red');
  log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`, 'yellow');
  
  if (testResults.failed === 0) {
    log('\n✅ ALL TESTS PASSED! Phase 3 validation successful.', 'green');
    process.exit(0);
  } else {
    log(`\n❌ ${testResults.failed} TEST(S) FAILED. Please review and fix issues.`, 'red');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Test suite error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

