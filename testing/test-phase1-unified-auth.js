#!/usr/bin/env node

/**
 * Phase 1 Unified Auth Testing Script
 * Tests API Gateway, Auth Service, and Admin Service with both JWT and Firebase tokens
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const AUTH_V2_SERVICE_URL = process.env.AUTH_V2_SERVICE_URL || 'http://localhost:3008';
const ADMIN_SERVICE_URL = process.env.ADMIN_SERVICE_URL || 'http://localhost:3007';

// Test credentials
const TEST_USER_JWT = {
  email: 'kasykoi@gmail.com',
  password: 'Anjas123'
};

const TEST_USER_FIREBASE = {
  email: 'kasykoi@gmail.com',
  password: 'Anjas123'
};

const TEST_ADMIN = {
  username: 'superadmin',
  password: 'admin123'
};

let jwtToken = null;
let firebaseToken = null;
let adminToken = null;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`TEST: ${testName}`, 'cyan');
  log('='.repeat(60), 'cyan');
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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Login with JWT (Legacy Auth)
async function testJWTLogin() {
  logTest('JWT Login (Legacy Auth Service)');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, TEST_USER_JWT);
    
    if (response.data.success && response.data.data.token) {
      jwtToken = response.data.data.token;
      logSuccess(`JWT Login successful`);
      logInfo(`Token: ${jwtToken.substring(0, 50)}...`);
      logInfo(`User: ${response.data.data.user.email}`);
      return true;
    } else {
      logError('JWT Login failed: No token received');
      return false;
    }
  } catch (error) {
    logError(`JWT Login failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

// Test 2: Login with Firebase (Auth-V2)
async function testFirebaseLogin() {
  logTest('Firebase Login (Auth-V2 Service)');

  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/v2/login`, TEST_USER_FIREBASE);
    
    if (response.data.success && response.data.data.idToken) {
      firebaseToken = response.data.data.idToken;
      logSuccess(`Firebase Login successful`);
      logInfo(`Token: ${firebaseToken.substring(0, 50)}...`);
      if (response.data.data.user) {
        logInfo(`User: ${response.data.data.user.email || response.data.data.user.uid || 'N/A'}`);
      }
      return true;
    } else {
      logError('Firebase Login failed: No token received');
      return false;
    }
  } catch (error) {
    logError(`Firebase Login failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

// Test 3: Admin Login (JWT)
async function testAdminLogin() {
  logTest('Admin Login (Legacy Auth Service)');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, TEST_ADMIN);
    
    if (response.data.success && response.data.data.token) {
      adminToken = response.data.data.token;
      logSuccess(`Admin Login successful`);
      logInfo(`Token: ${adminToken.substring(0, 50)}...`);
      logInfo(`User: ${response.data.data.user.username}`);
      return true;
    } else {
      logError('Admin Login failed: No token received');
      return false;
    }
  } catch (error) {
    logError(`Admin Login failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

// Test 4: API Gateway - Archive Service with JWT
async function testArchiveWithJWT() {
  logTest('API Gateway → Archive Service (JWT Token)');
  
  if (!jwtToken) {
    logError('JWT token not available');
    return false;
  }
  
  try {
    const response = await axios.get(`${API_BASE_URL}/api/archive/jobs`, {
      headers: { Authorization: `Bearer ${jwtToken}` }
    });
    
    if (response.data.success) {
      logSuccess('Archive service accessible with JWT token');
      logInfo(`Jobs count: ${response.data.data.jobs?.length || 0}`);
      return true;
    } else {
      logError('Archive service request failed');
      return false;
    }
  } catch (error) {
    logError(`Archive service request failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

// Test 5: API Gateway - Archive Service with Firebase Token
async function testArchiveWithFirebase() {
  logTest('API Gateway → Archive Service (Firebase Token)');
  
  if (!firebaseToken) {
    logError('Firebase token not available');
    return false;
  }
  
  try {
    const response = await axios.get(`${API_BASE_URL}/api/archive/jobs`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });
    
    if (response.data.success) {
      logSuccess('Archive service accessible with Firebase token');
      logInfo(`Jobs count: ${response.data.data.jobs?.length || 0}`);
      return true;
    } else {
      logError('Archive service request failed');
      return false;
    }
  } catch (error) {
    logError(`Archive service request failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

// Test 6: API Gateway - Assessment Service with JWT
async function testAssessmentWithJWT() {
  logTest('API Gateway → Assessment Service (JWT Token)');

  if (!jwtToken) {
    logError('JWT token not available');
    return false;
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/api/assessment/health`, {
      headers: { Authorization: `Bearer ${jwtToken}` }
    });
    
    if (response.data.success || response.status === 200) {
      logSuccess('Assessment service accessible with JWT token');
      logInfo(`Health status: ${response.data.status || 'OK'}`);
      return true;
    } else {
      logError('Assessment service request failed');
      return false;
    }
  } catch (error) {
    logError(`Assessment service request failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

// Test 7: API Gateway - Assessment Service with Firebase Token
async function testAssessmentWithFirebase() {
  logTest('API Gateway → Assessment Service (Firebase Token)');

  if (!firebaseToken) {
    logError('Firebase token not available');
    return false;
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/api/assessment/health`, {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    });

    if (response.data.success || response.status === 200) {
      logSuccess('Assessment service accessible with Firebase token');
      logInfo(`Health status: ${response.data.status || 'OK'}`);
      return true;
    } else {
      logError('Assessment service request failed');
      return false;
    }
  } catch (error) {
    logError(`Assessment service request failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

// Test 8: Admin Service with Admin JWT Token (via API Gateway)
async function testAdminService() {
  logTest('Admin Service via API Gateway (Admin JWT Token)');

  if (!adminToken) {
    logError('Admin token not available');
    return false;
  }

  try {
    // Admin service is accessed through API Gateway, not directly
    const response = await axios.get(`${API_BASE_URL}/api/archive/admin/users?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (response.data.success) {
      logSuccess('Admin service accessible with admin JWT token');
      logInfo(`Users count: ${response.data.data.users?.length || 0}`);
      return true;
    } else {
      logError('Admin service request failed');
      return false;
    }
  } catch (error) {
    logError(`Admin service request failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  log('\n' + '='.repeat(60), 'yellow');
  log('PHASE 1 UNIFIED AUTH TESTING', 'yellow');
  log('Testing API Gateway, Auth Service, and Admin Service', 'yellow');
  log('='.repeat(60) + '\n', 'yellow');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };
  
  const tests = [
    { name: 'JWT Login', fn: testJWTLogin },
    { name: 'Firebase Login', fn: testFirebaseLogin },
    { name: 'Admin Login', fn: testAdminLogin },
    { name: 'Archive with JWT', fn: testArchiveWithJWT },
    { name: 'Archive with Firebase', fn: testArchiveWithFirebase },
    { name: 'Assessment with JWT', fn: testAssessmentWithJWT },
    { name: 'Assessment with Firebase', fn: testAssessmentWithFirebase },
    { name: 'Admin Service', fn: testAdminService }
  ];
  
  for (const test of tests) {
    results.total++;
    const passed = await test.fn();
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
    await sleep(500); // Small delay between tests
  }
  
  // Summary
  log('\n' + '='.repeat(60), 'yellow');
  log('TEST SUMMARY', 'yellow');
  log('='.repeat(60), 'yellow');
  log(`Total Tests: ${results.total}`, 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(2)}%`, results.failed > 0 ? 'yellow' : 'green');
  log('='.repeat(60) + '\n', 'yellow');
  
  if (results.failed === 0) {
    log('✓ ALL TESTS PASSED! Phase 1 is complete.', 'green');
    process.exit(0);
  } else {
    log('✗ SOME TESTS FAILED. Please review the errors above.', 'red');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});

