/**
 * Test script for jobs/stats endpoint
 * Tests both old and new endpoint locations
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000'; // API Gateway
const INTERNAL_SERVICE_KEY = 'f8c1af59d85da6581036e18b4b9e0ec35d1fdefe1a93837d5b4746c9984ea4c1'; // From .env file

// Test user credentials
const TEST_USER = {
  email: 'kasykoi@gmail.com',
  password: 'Anjas123'
};

async function getValidUserToken() {
  try {
    console.log('🔑 Getting valid user token...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });

    if (response.data.success && response.data.data.token) {
      console.log('✅ User token obtained successfully');
      return response.data.data.token;
    } else {
      console.log('❌ Failed to get user token');
      return null;
    }
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.error?.message || error.message);
    return null;
  }
}

async function testEndpoint(url, description, useUserToken = false) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`📍 URL: ${url}`);

  let headers = {};

  if (useUserToken) {
    const token = await getValidUserToken();
    if (!token) {
      console.log('❌ Cannot test user endpoint without valid token');
      return false;
    }
    headers = {
      'Authorization': `Bearer ${token}`
    };
  } else {
    headers = {
      'X-Service-Key': INTERNAL_SERVICE_KEY,
      'X-Internal-Service': 'true'
    };
  }

  try {
    const response = await axios.get(url, {
      headers,
      timeout: 10000
    });
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));
    
    // Check if success_rate field exists
    if (response.data.data && typeof response.data.data.success_rate !== 'undefined') {
      console.log(`🎯 Success rate field found: ${response.data.data.success_rate}`);
    } else {
      console.log(`⚠️  Success rate field missing`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Error: ${error.response?.status || error.code}`);
    console.log(`📝 Message: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting jobs/stats endpoint tests...\n');

  // Test new endpoint with user token (should work)
  const newEndpointWorks = await testEndpoint(
    `${BASE_URL}/api/archive/jobs/stats`,
    'New jobs/stats endpoint in directJobs.js (with user token)',
    true // use user token
  );

  // Test new endpoint with internal service token (should also work)
  const newEndpointInternalWorks = await testEndpoint(
    `${BASE_URL}/api/archive/jobs/stats`,
    'New jobs/stats endpoint in directJobs.js (with internal service token)',
    false // use internal service token
  );

  // Test old endpoint (should fail/not exist)
  const oldEndpointWorks = await testEndpoint(
    `${BASE_URL}/api/archive/results/jobs/stats`,
    'Old jobs/stats endpoint in results.js (should not exist)',
    true // use user token
  );

  console.log('\n📋 Test Summary:');
  console.log(`✅ New endpoint with user token: ${newEndpointWorks ? 'WORKING' : 'FAILED'}`);
  console.log(`✅ New endpoint with internal token: ${newEndpointInternalWorks ? 'WORKING' : 'FAILED'}`);
  console.log(`❌ Old endpoint: ${oldEndpointWorks ? 'STILL EXISTS (BAD)' : 'REMOVED (GOOD)'}`);

  if ((newEndpointWorks || newEndpointInternalWorks) && !oldEndpointWorks) {
    console.log('\n🎉 All tests passed! Endpoint migration successful.');
  } else {
    console.log('\n⚠️  Some issues found. Please check the results above.');
  }
}

// Run tests
runTests().catch(console.error);
