#!/usr/bin/env node

/**
 * Simple test script untuk menguji proxy routing chatbot service
 */

const axios = require('axios');
const colors = require('colors');

const API_GATEWAY_URL = 'http://localhost:3000';

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
 * Helper function untuk HTTP request
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
 * Test chatbot endpoints
 */
async function testChatbotEndpoints() {
  console.log('🤖 Testing Chatbot Service Proxy Routing...\n'.cyan.bold);
  
  const endpoints = [
    {
      name: 'Service Info',
      method: 'GET',
      url: '/api/chatbot',
      description: 'Root endpoint untuk informasi service'
    },
    {
      name: 'Health Check',
      method: 'GET',
      url: '/api/chatbot/health',
      description: 'Health check endpoint'
    },
    {
      name: 'Readiness Probe',
      method: 'GET',
      url: '/api/chatbot/health/ready',
      description: 'Kubernetes readiness probe'
    },
    {
      name: 'Liveness Probe',
      method: 'GET',
      url: '/api/chatbot/health/live',
      description: 'Kubernetes liveness probe'
    },
    {
      name: 'Metrics',
      method: 'GET',
      url: '/api/chatbot/health/metrics',
      description: 'Service metrics endpoint'
    }
  ];

  let successCount = 0;
  let totalCount = endpoints.length;

  for (const endpoint of endpoints) {
    log(`Testing ${endpoint.name} (${endpoint.method} ${endpoint.url})...`, 'info');
    
    const result = await makeRequest(endpoint.method, endpoint.url);
    
    if (result.success && result.status === 200) {
      log(`${endpoint.name}: ✅ SUCCESS (${result.status})`, 'success');
      console.log(`   📝 ${endpoint.description}`.gray);
      
      // Show response preview
      if (result.data) {
        const preview = JSON.stringify(result.data, null, 2);
        const lines = preview.split('\n');
        if (lines.length > 10) {
          console.log(`   📄 Response (first 8 lines):`.gray);
          lines.slice(0, 8).forEach(line => console.log(`      ${line}`.gray));
          console.log(`      ... (${lines.length - 8} more lines)`.gray);
        } else {
          console.log(`   📄 Response:`.gray);
          lines.forEach(line => console.log(`      ${line}`.gray));
        }
      }
      
      successCount++;
    } else {
      log(`${endpoint.name}: ❌ FAILED (${result.status}) - ${result.data.message || 'Unknown error'}`, 'error');
    }
    
    console.log(''); // Empty line for readability
  }

  // Summary
  console.log('📊 Test Summary:'.cyan.bold);
  console.log(`   ✅ Successful: ${successCount}/${totalCount}`.green);
  console.log(`   ❌ Failed: ${totalCount - successCount}/${totalCount}`.red);
  
  if (successCount === totalCount) {
    console.log('\n🎉 All chatbot proxy tests passed! Chatbot service is properly accessible through API Gateway.'.green.bold);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the configuration.'.yellow.bold);
  }

  // Additional info
  console.log('\n📋 Proxy Configuration Summary:'.cyan.bold);
  console.log('   🔗 API Gateway: http://localhost:3000'.blue);
  console.log('   🤖 Chatbot Service: http://localhost:3006 (direct)'.blue);
  console.log('   🌐 Proxy Path: /api/chatbot/* -> chatbot-service:3006/*'.blue);
  console.log('   🔄 Path Rewrite: /api/chatbot/health -> /health, /api/chatbot -> /'.blue);
}

/**
 * Test direct access to chatbot service
 */
async function testDirectAccess() {
  console.log('\n🔗 Testing Direct Access to Chatbot Service...'.cyan.bold);
  
  try {
    const result = await axios.get('http://localhost:3006/health', { timeout: 5000 });
    log('Direct access to chatbot service: ✅ SUCCESS', 'success');
    console.log(`   📄 Response: ${JSON.stringify(result.data, null, 2)}`.gray);
  } catch (error) {
    log(`Direct access to chatbot service: ❌ FAILED - ${error.message}`, 'error');
  }
}

/**
 * Main test runner
 */
async function runTests() {
  try {
    await testDirectAccess();
    await testChatbotEndpoints();
    
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
  testChatbotEndpoints,
  testDirectAccess
};
