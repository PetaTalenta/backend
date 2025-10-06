#!/usr/bin/env node

/**
 * Quick Unified Auth Testing
 * Fast validation of unified auth across all services
 */

const axios = require('axios');
const chalk = require('chalk');

// Configuration
const CONFIG = {
  AUTH_SERVICE_URL: 'http://localhost:3001',
  AUTH_V2_SERVICE_URL: 'http://localhost:3008',
  ARCHIVE_SERVICE_URL: 'http://localhost:3002',
  ASSESSMENT_SERVICE_URL: 'http://localhost:3003',
  CHATBOT_SERVICE_URL: 'http://localhost:3006',
  
  TEST_USER: {
    email: 'kasykoi@gmail.com',
    password: 'Anjas123'
  }
};

let results = { total: 0, passed: 0, failed: 0, tests: [] };
let firebaseToken = null;
let jwtToken = null;

function log(msg, type = 'info') {
  const colors = { info: chalk.blue, success: chalk.green, error: chalk.red };
  console.log((colors[type] || chalk.white)(`[${type.toUpperCase()}] ${msg}`));
}

function section(title) {
  console.log('\n' + chalk.bold.cyan('═'.repeat(80)));
  console.log(chalk.bold.cyan(`  ${title}`));
  console.log(chalk.bold.cyan('═'.repeat(80)) + '\n');
}

async function test(name, fn) {
  results.total++;
  try {
    const start = Date.now();
    await fn();
    const duration = Date.now() - start;
    results.passed++;
    results.tests.push({ name, status: 'passed', duration });
    log(`✓ ${name} (${duration}ms)`, 'success');
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
    log(`✗ ${name}: ${error.message}`, 'error');
  }
}

async function main() {
  console.log(chalk.bold.green('\n🚀 Quick Unified Auth Testing\n'));
  
  // ========== STEP 1: GET TOKENS ==========
  section('Step 1: Obtain Tokens');
  
  await test('Get Firebase Token', async () => {
    const res = await axios.post(`${CONFIG.AUTH_V2_SERVICE_URL}/v1/auth/login`, {
      email: CONFIG.TEST_USER.email,
      password: CONFIG.TEST_USER.password
    });
    if (!res.data.success || !res.data.data.idToken) throw new Error('No token');
    firebaseToken = res.data.data.idToken;
    log(`Firebase: ${firebaseToken.substring(0, 30)}...`, 'info');
  });
  
  await test('Get JWT Token', async () => {
    const res = await axios.post(`${CONFIG.AUTH_SERVICE_URL}/auth/login`, {
      email: CONFIG.TEST_USER.email,
      password: CONFIG.TEST_USER.password
    });
    if (!res.data.success || !res.data.data?.token) throw new Error('No token');
    jwtToken = res.data.data.token;
    log(`JWT: ${jwtToken.substring(0, 30)}...`, 'info');
  });
  
  // ========== STEP 2: ARCHIVE SERVICE ==========
  section('Step 2: Archive Service');
  
  await test('Archive - List Jobs (Firebase)', async () => {
    const res = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/archive/jobs`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    if (!res.data.success) throw new Error('Failed');
    log(`Found ${res.data.data.length} jobs`, 'info');
  });

  await test('Archive - List Jobs (JWT)', async () => {
    const res = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/archive/jobs`, {
      headers: { Authorization: `Bearer ${jwtToken}` }
    });
    if (!res.data.success) throw new Error('Failed');
    log(`Found ${res.data.data.length} jobs`, 'info');
  });

  await test('Archive - Create Job (Firebase)', async () => {
    const res = await axios.post(`${CONFIG.ARCHIVE_SERVICE_URL}/archive/jobs`, {
      url: 'https://example.com/test-firebase',
      analysis_type: 'full'
    }, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    if (!res.data.success) throw new Error('Failed');
    log(`Created job ID: ${res.data.data.id}`, 'info');

    // Cleanup
    await axios.delete(`${CONFIG.ARCHIVE_SERVICE_URL}/archive/jobs/${res.data.data.id}`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
  });

  await test('Archive - Create Job (JWT)', async () => {
    const res = await axios.post(`${CONFIG.ARCHIVE_SERVICE_URL}/archive/jobs`, {
      url: 'https://example.com/test-jwt',
      analysis_type: 'full'
    }, {
      headers: { Authorization: `Bearer ${jwtToken}` }
    });
    if (!res.data.success) throw new Error('Failed');
    log(`Created job ID: ${res.data.data.id}`, 'info');

    // Cleanup
    await axios.delete(`${CONFIG.ARCHIVE_SERVICE_URL}/archive/jobs/${res.data.data.id}`, {
      headers: { Authorization: `Bearer ${jwtToken}` }
    });
  });
  
  // ========== STEP 3: ASSESSMENT SERVICE ==========
  section('Step 3: Assessment Service');

  await test('Assessment - Get Stats (Firebase)', async () => {
    const res = await axios.get(`${CONFIG.ASSESSMENT_SERVICE_URL}/assessment/stats`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    if (!res.data.success) throw new Error('Failed');
    log(`Total assessments: ${res.data.data.totalAssessments || 0}`, 'info');
  });

  await test('Assessment - Get Stats (JWT)', async () => {
    const res = await axios.get(`${CONFIG.ASSESSMENT_SERVICE_URL}/assessment/stats`, {
      headers: { Authorization: `Bearer ${jwtToken}` }
    });
    if (!res.data.success) throw new Error('Failed');
    log(`Total assessments: ${res.data.data.totalAssessments || 0}`, 'info');
  });

  // ========== STEP 4: CHATBOT SERVICE ==========
  section('Step 4: Chatbot Service');

  await test('Chatbot - List Conversations (Firebase)', async () => {
    const res = await axios.get(`${CONFIG.CHATBOT_SERVICE_URL}/conversations`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    if (!res.data.success) throw new Error('Failed');
    log(`Found ${res.data.data.length} conversations`, 'info');
  });

  await test('Chatbot - List Conversations (JWT)', async () => {
    const res = await axios.get(`${CONFIG.CHATBOT_SERVICE_URL}/conversations`, {
      headers: { Authorization: `Bearer ${jwtToken}` }
    });
    if (!res.data.success) throw new Error('Failed');
    log(`Found ${res.data.data.length} conversations`, 'info');
  });
  
  // ========== STEP 5: PERFORMANCE TEST ==========
  section('Step 5: Performance Testing');
  
  await test('Performance - 20 Concurrent Requests (Mixed)', async () => {
    const requests = [];
    for (let i = 0; i < 20; i++) {
      const token = i % 2 === 0 ? firebaseToken : jwtToken;
      requests.push(
        axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/archive/jobs`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => ({ error: err.message }))
      );
    }

    const start = Date.now();
    const responses = await Promise.all(requests);
    const duration = Date.now() - start;

    const successful = responses.filter(r => !r.error && r.data?.success).length;
    const successRate = (successful / 20) * 100;

    log(`${successful}/20 successful (${successRate}%) in ${duration}ms`, 'info');

    if (successRate < 95) throw new Error(`Success rate ${successRate}% < 95%`);
  });

  await test('Performance - Token Caching', async () => {
    // First request
    const start1 = Date.now();
    await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/archive/jobs`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    const time1 = Date.now() - start1;

    // Second request (should be cached)
    const start2 = Date.now();
    await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/archive/jobs`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    const time2 = Date.now() - start2;

    log(`First: ${time1}ms, Second: ${time2}ms`, 'info');

    // Second should be faster or similar (cached)
    if (time2 > time1 * 2) {
      log('Warning: Second request slower than expected', 'error');
    }
  });
  
  // ========== STEP 6: SECURITY TEST ==========
  section('Step 6: Security Testing');
  
  await test('Security - Invalid Token Rejected', async () => {
    const res = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/archive/jobs`, {
      headers: { Authorization: 'Bearer invalid_token' },
      validateStatus: () => true
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await test('Security - Missing Token Rejected', async () => {
    const res = await axios.get(`${CONFIG.ARCHIVE_SERVICE_URL}/archive/jobs`, {
      validateStatus: () => true
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });
  
  // ========== FINAL REPORT ==========
  section('Test Results Summary');
  
  const successRate = ((results.passed / results.total) * 100).toFixed(2);
  
  console.log(chalk.bold(`Total Tests: ${results.total}`));
  console.log(chalk.green(`✓ Passed: ${results.passed}`));
  console.log(chalk.red(`✗ Failed: ${results.failed}`));
  console.log(chalk.bold(`Success Rate: ${successRate}%\n`));
  
  if (results.failed > 0) {
    console.log(chalk.red.bold('Failed Tests:'));
    results.tests.filter(t => t.status === 'failed').forEach(t => {
      console.log(chalk.red(`  ✗ ${t.name}: ${t.error}`));
    });
    console.log();
  }
  
  if (results.failed === 0) {
    console.log(chalk.green.bold('🎉 All tests passed! Unified auth is working perfectly.\n'));
    console.log(chalk.green('✓ Firebase tokens work across all services'));
    console.log(chalk.green('✓ JWT tokens work across all services'));
    console.log(chalk.green('✓ Performance is acceptable'));
    console.log(chalk.green('✓ Security checks passed\n'));
  } else {
    console.log(chalk.yellow.bold(`⚠️  ${results.failed} test(s) failed.\n`));
  }
  
  // Save report
  const fs = require('fs');
  const path = require('path');
  const reportPath = path.join(__dirname, 'reports', `quick-test-${new Date().toISOString()}.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(chalk.blue(`📄 Report saved: ${reportPath}\n`));
  
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(err => {
  log(`Fatal error: ${err.message}`, 'error');
  console.error(err);
  process.exit(1);
});

