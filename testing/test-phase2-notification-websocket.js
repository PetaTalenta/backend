/**
 * Phase 2 Unified Auth Migration Test - Notification Service WebSocket
 * Tests WebSocket authentication with both JWT and Firebase tokens
 */

const io = require('socket.io-client');
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const AUTH_V2_SERVICE_URL = process.env.AUTH_V2_SERVICE_URL || 'http://localhost:3008';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';

// Test credentials
const TEST_USER_JWT = {
  email: 'kasykoi@gmail.com',
  password: 'Anjas123'
};

const TEST_USER_FIREBASE = {
  email: 'kasykoi@gmail.com',
  password: 'Anjas123'
};

let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, message) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}: ${message}`);
  } else {
    testResults.failed++;
    console.error(`❌ ${name}: ${message}`);
  }
  testResults.tests.push({ name, passed, message });
}

async function getJWTToken() {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/auth/login`, {
      email: TEST_USER_JWT.email,
      password: TEST_USER_JWT.password
    });

    if (response.data.success && response.data.data.token) {
      return response.data.data.token;
    }
    throw new Error('Failed to get JWT token');
  } catch (error) {
    throw new Error(`JWT login failed: ${error.message}`);
  }
}

async function getFirebaseToken() {
  try {
    const response = await axios.post(`${AUTH_V2_SERVICE_URL}/v1/auth/login`, {
      email: TEST_USER_FIREBASE.email,
      password: TEST_USER_FIREBASE.password
    });

    if (response.data.success && response.data.data.idToken) {
      return response.data.data.idToken;
    }
    throw new Error('Failed to get Firebase token');
  } catch (error) {
    throw new Error(`Firebase login failed: ${error.message}`);
  }
}

function testWebSocketAuth(token, tokenType) {
  return new Promise((resolve, reject) => {
    const socket = io(NOTIFICATION_SERVICE_URL, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 10000
    });

    let authenticated = false;
    let authError = null;

    socket.on('connect', () => {
      console.log(`  → Socket connected for ${tokenType} test`);
      socket.emit('authenticate', { token });
    });

    socket.on('authenticated', (data) => {
      console.log(`  → Socket authenticated for ${tokenType}:`, data);
      authenticated = true;
      socket.disconnect();
      resolve({
        success: true,
        tokenType: data.tokenType,
        userId: data.userId,
        email: data.email
      });
    });

    socket.on('auth_error', (error) => {
      console.log(`  → Socket auth error for ${tokenType}:`, error);
      authError = error.message;
      socket.disconnect();
      resolve({
        success: false,
        error: authError
      });
    });

    socket.on('connect_error', (error) => {
      console.log(`  → Socket connection error for ${tokenType}:`, error.message);
      reject(new Error(`Connection error: ${error.message}`));
    });

    socket.on('disconnect', (reason) => {
      console.log(`  → Socket disconnected for ${tokenType}: ${reason}`);
      if (!authenticated && !authError) {
        reject(new Error(`Disconnected without authentication: ${reason}`));
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!authenticated && !authError) {
        socket.disconnect();
        reject(new Error('Authentication timeout'));
      }
    }, 10000);
  });
}

async function runTests() {
  console.log('\n🚀 Phase 2 Unified Auth Migration Test - Notification Service WebSocket\n');
  console.log('='.repeat(80));
  
  try {
    // Test 1: Get JWT Token
    console.log('\n📝 Test 1: Get JWT Token from Legacy Auth Service');
    let jwtToken;
    try {
      jwtToken = await getJWTToken();
      logTest('Get JWT Token', true, `Token obtained (length: ${jwtToken.length})`);
    } catch (error) {
      logTest('Get JWT Token', false, error.message);
      throw error;
    }

    // Test 2: Get Firebase Token
    console.log('\n📝 Test 2: Get Firebase Token from Auth-V2 Service');
    let firebaseToken;
    try {
      firebaseToken = await getFirebaseToken();
      logTest('Get Firebase Token', true, `Token obtained (length: ${firebaseToken.length})`);
    } catch (error) {
      logTest('Get Firebase Token', false, error.message);
      throw error;
    }

    // Test 3: WebSocket Authentication with JWT Token
    console.log('\n📝 Test 3: WebSocket Authentication with JWT Token');
    try {
      const result = await testWebSocketAuth(jwtToken, 'JWT');
      if (result.success) {
        logTest('WebSocket Auth (JWT)', true, 
          `Authenticated as ${result.email} (userId: ${result.userId}, tokenType: ${result.tokenType})`);
      } else {
        logTest('WebSocket Auth (JWT)', false, `Authentication failed: ${result.error}`);
      }
    } catch (error) {
      logTest('WebSocket Auth (JWT)', false, error.message);
    }

    // Test 4: WebSocket Authentication with Firebase Token
    console.log('\n📝 Test 4: WebSocket Authentication with Firebase Token');
    try {
      const result = await testWebSocketAuth(firebaseToken, 'Firebase');
      if (result.success) {
        logTest('WebSocket Auth (Firebase)', true, 
          `Authenticated as ${result.email} (userId: ${result.userId}, tokenType: ${result.tokenType})`);
      } else {
        logTest('WebSocket Auth (Firebase)', false, `Authentication failed: ${result.error}`);
      }
    } catch (error) {
      logTest('WebSocket Auth (Firebase)', false, error.message);
    }

    // Test 5: WebSocket Authentication with Invalid Token
    console.log('\n📝 Test 5: WebSocket Authentication with Invalid Token');
    try {
      const result = await testWebSocketAuth('invalid_token_12345', 'Invalid');
      if (!result.success) {
        logTest('WebSocket Auth (Invalid)', true, `Correctly rejected invalid token: ${result.error}`);
      } else {
        logTest('WebSocket Auth (Invalid)', false, 'Invalid token was accepted (should be rejected)');
      }
    } catch (error) {
      logTest('WebSocket Auth (Invalid)', true, `Correctly rejected: ${error.message}`);
    }

    // Test 6: Check Notification Service Health
    console.log('\n📝 Test 6: Check Notification Service Health');
    try {
      const response = await axios.get(`${NOTIFICATION_SERVICE_URL}/health`);
      if (response.data.success && response.data.status === 'healthy') {
        logTest('Notification Service Health', true, 
          `Service is healthy (connections: ${response.data.connections})`);
      } else {
        logTest('Notification Service Health', false, 'Service is not healthy');
      }
    } catch (error) {
      logTest('Notification Service Health', false, error.message);
    }

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Test Summary:');
  console.log(`   Total Tests: ${testResults.total}`);
  console.log(`   ✅ Passed: ${testResults.passed}`);
  console.log(`   ❌ Failed: ${testResults.failed}`);
  console.log(`   Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! Phase 2 migration for notification-service is successful!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the results above.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});

