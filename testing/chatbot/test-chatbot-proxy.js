#!/usr/bin/env node

/**
 * Test script untuk menguji proxy routing dari API Gateway ke Chatbot Service
 * 
 * Script ini akan:
 * 1. Test health endpoints (public)
 * 2. Test authentication dengan auth service
 * 3. Test protected chatbot endpoints
 * 4. Test rate limiting
 */

const axios = require('axios');
const colors = require('colors');

// Configuration
const API_GATEWAY_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'test@example.com',
  password: 'Test123!@#',
  full_name: 'Test User',
  user_type: 'candidate'
};

let authToken = null;

/**
 * Helper function untuk logging dengan warna
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  switch (type) {
    case 'success':
      console.log(`[${timestamp}] ✅ ${message}`.green);
      break;
    case 'error':
      console.log(`[${timestamp}] ❌ ${message}`.red);
      break;
    case 'warning':
      console.log(`[${timestamp}] ⚠️  ${message}`.yellow);
      break;
    case 'info':
    default:
      console.log(`[${timestamp}] ℹ️  ${message}`.blue);
      break;
  }
}

/**
 * Helper function untuk HTTP request dengan error handling
 */
async function makeRequest(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${API_GATEWAY_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 10000
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data,
      headers: response.headers
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      data: error.response?.data || { message: error.message },
      headers: error.response?.headers || {}
    };
  }
}

/**
 * Test 1: Health Endpoints (Public)
 */
async function testHealthEndpoints() {
  log('🔍 Testing Health Endpoints...', 'info');
  
  const endpoints = [
    '/api/chatbot/health',
    '/api/chatbot/health/ready',
    '/api/chatbot/health/live',
    '/api/chatbot/health/metrics'
  ];

  for (const endpoint of endpoints) {
    const result = await makeRequest('GET', endpoint);
    
    if (result.success && result.status === 200) {
      log(`${endpoint}: OK (${result.status})`, 'success');
      if (result.data) {
        console.log(`   Response: ${JSON.stringify(result.data, null, 2)}`.gray);
      }
    } else {
      log(`${endpoint}: FAILED (${result.status}) - ${result.data.message || 'Unknown error'}`, 'error');
    }
  }
}

/**
 * Test 2: Authentication
 */
async function testAuthentication() {
  log('🔐 Testing Authentication...', 'info');
  
  // Register user (jika belum ada)
  log('Registering test user...', 'info');
  const registerResult = await makeRequest('POST', '/api/auth/register', TEST_USER);
  
  if (registerResult.success || registerResult.status === 409) {
    log('User registration: OK (user exists or created)', 'success');
  } else {
    log(`User registration failed: ${registerResult.data.message}`, 'error');
    return false;
  }

  // Login
  log('Logging in...', 'info');
  const loginResult = await makeRequest('POST', '/api/auth/login', {
    email: TEST_USER.email,
    password: TEST_USER.password
  });

  if (loginResult.success && loginResult.data.success) {
    authToken = loginResult.data.data.token;
    log('Login successful, token obtained', 'success');
    return true;
  } else {
    log(`Login failed: ${loginResult.data.message}`, 'error');
    return false;
  }
}

/**
 * Test 3: Protected Chatbot Endpoints
 */
async function testProtectedEndpoints() {
  log('🔒 Testing Protected Chatbot Endpoints...', 'info');
  
  if (!authToken) {
    log('No auth token available, skipping protected endpoint tests', 'error');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${authToken}`
  };

  // Test conversations endpoint
  log('Testing conversations endpoint...', 'info');
  const conversationsResult = await makeRequest('GET', '/api/chatbot/conversations', null, headers);
  
  if (conversationsResult.success) {
    log(`Conversations endpoint: OK (${conversationsResult.status})`, 'success');
    console.log(`   Response: ${JSON.stringify(conversationsResult.data, null, 2)}`.gray);
  } else {
    log(`Conversations endpoint: FAILED (${conversationsResult.status}) - ${conversationsResult.data.message}`, 'error');
  }

  // Test creating a new conversation
  log('Testing create conversation...', 'info');
  const createConversationResult = await makeRequest('POST', '/api/chatbot/conversations', {
    title: 'Test Conversation',
    initial_message: 'Hello, this is a test message'
  }, headers);
  
  if (createConversationResult.success) {
    log(`Create conversation: OK (${createConversationResult.status})`, 'success');
    console.log(`   Response: ${JSON.stringify(createConversationResult.data, null, 2)}`.gray);
  } else {
    log(`Create conversation: FAILED (${createConversationResult.status}) - ${createConversationResult.data.message}`, 'error');
  }
}

/**
 * Test 4: Rate Limiting
 */
async function testRateLimiting() {
  log('⏱️  Testing Rate Limiting...', 'info');
  
  if (!authToken) {
    log('No auth token available, skipping rate limiting tests', 'error');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${authToken}`
  };

  log('Making multiple rapid requests to test rate limiting...', 'info');
  
  let successCount = 0;
  let rateLimitedCount = 0;
  
  for (let i = 0; i < 10; i++) {
    const result = await makeRequest('GET', '/api/chatbot/conversations', null, headers);
    
    if (result.success) {
      successCount++;
    } else if (result.status === 429) {
      rateLimitedCount++;
      log(`Request ${i + 1}: Rate limited (429)`, 'warning');
      break;
    } else {
      log(`Request ${i + 1}: Failed with status ${result.status}`, 'error');
    }
  }
  
  log(`Rate limiting test completed: ${successCount} successful, ${rateLimitedCount} rate limited`, 'info');
}

/**
 * Test 5: Service Information
 */
async function testServiceInfo() {
  log('📋 Testing Service Information...', 'info');
  
  const result = await makeRequest('GET', '/api/chatbot');
  
  if (result.success) {
    log(`Service info: OK (${result.status})`, 'success');
    console.log(`   Response: ${JSON.stringify(result.data, null, 2)}`.gray);
  } else {
    log(`Service info: FAILED (${result.status}) - ${result.data.message}`, 'error');
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Chatbot Service Proxy Tests...\n'.cyan.bold);
  
  try {
    await testHealthEndpoints();
    console.log('');
    
    await testServiceInfo();
    console.log('');
    
    const authSuccess = await testAuthentication();
    console.log('');
    
    if (authSuccess) {
      await testProtectedEndpoints();
      console.log('');
      
      await testRateLimiting();
      console.log('');
    }
    
    log('🎉 All tests completed!', 'success');
    
  } catch (error) {
    log(`Test runner failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testHealthEndpoints,
  testAuthentication,
  testProtectedEndpoints,
  testRateLimiting,
  testServiceInfo
};
