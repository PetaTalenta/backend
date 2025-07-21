// Authentication flow testing for ATMA
const { makeRequest, displayResponse } = require('./test-helpers');
const { API_GATEWAY_URL } = require('./test-config');

// Test health check for all services
async function testHealthCheck() {
  console.log('\n=== 1. HEALTH CHECK ===');

  const services = [
    { name: 'API Gateway', url: `${API_GATEWAY_URL}/health` },
    { name: 'Auth Service', url: `${API_GATEWAY_URL}/api/auth/health` },
    { name: 'Assessment Service', url: `${API_GATEWAY_URL}/api/assessment/health` },
    { name: 'Archive Service', url: `${API_GATEWAY_URL}/api/archive/health` },
    { name: 'Notification Service', url: `${API_GATEWAY_URL.replace('3000', '3005')}/health` }
  ];

  let allHealthy = true;

  for (const service of services) {
    console.log(`\nChecking ${service.name}...`);
    const result = await makeRequest('GET', service.url);
    const status = result.success ? '✅ HEALTHY' : '❌ UNHEALTHY';
    console.log(`${service.name}: ${status}`);

    if (result.success && result.data) {
      // Display health info according to EX_API_DOCS.md format
      if (result.data.status) {
        console.log(`  Status: ${result.data.status}`);
      }
      if (result.data.service) {
        console.log(`  Service: ${result.data.service}`);
      }
      if (result.data.version) {
        console.log(`  Version: ${result.data.version}`);
      }
      if (result.data.uptime) {
        console.log(`  Uptime: ${result.data.uptime}s`);
      }
    } else {
      allHealthy = false;
      console.log('  Error Details:');
      if (result.data.message) {
        console.log(`    Message: ${result.data.message}`);
      }
      if (result.data.error) {
        console.log(`    Error: ${result.data.error}`);
      }
    }
  }

  console.log(`\n=== HEALTH CHECK SUMMARY ===`);
  console.log(`Overall Status: ${allHealthy ? '✅ ALL SERVICES HEALTHY' : '❌ SOME SERVICES UNHEALTHY'}`);

  return allHealthy;
}

// Test user registration
async function testRegister(testUser) {
  console.log('\n=== 2. USER REGISTRATION ===');

  const result = await makeRequest('POST', `${API_GATEWAY_URL}/api/auth/register`, testUser);

  displayResponse('Registration Result:', result);

  if (result.success && result.data.data?.token) {
    console.log('\n✅ Auth token received from registration');
    return {
      success: true,
      authToken: result.data.data.token,
      userId: result.data.data.user?.id
    };
  }

  return { success: false };
}

// Test user login
async function testLogin(testUser) {
  console.log('\n=== 3. USER LOGIN ===');

  const result = await makeRequest('POST', `${API_GATEWAY_URL}/api/auth/login`, testUser);

  displayResponse('Login Result:', result);

  if (result.success && result.data.data?.token) {
    console.log('\n✅ Auth token received from login');
    return {
      success: true,
      authToken: result.data.data.token,
      userId: result.data.data.user?.id
    };
  }

  return { success: false };
}

// Test get user profile
async function testGetProfile(authToken) {
  console.log('\n=== 5. GET USER PROFILE ===');

  if (!authToken) {
    console.log('❌ No auth token available');
    return false;
  }

  const result = await makeRequest('GET', `${API_GATEWAY_URL}/api/auth/profile`, null, {
    'Authorization': `Bearer ${authToken}`
  });

  displayResponse('Get Profile Result:', result);

  return result.success;
}

// Test update user profile
async function testUpdateProfile(authToken, profileData) {
  console.log('\n=== 6. UPDATE USER PROFILE ===');

  if (!authToken) {
    console.log('❌ No auth token available');
    return false;
  }

  const result = await makeRequest('PUT', `${API_GATEWAY_URL}/api/auth/profile`, profileData, {
    'Authorization': `Bearer ${authToken}`
  });

  displayResponse('Update Profile Result:', result);

  return result.success;
}

// Test delete user profile
async function testDeleteProfile(authToken) {
  console.log('\n=== 11. DELETE USER PROFILE ===');

  if (!authToken) {
    console.log('❌ No auth token available');
    return false;
  }

  const result = await makeRequest('DELETE', `${API_GATEWAY_URL}/api/auth/profile`, null, {
    'Authorization': `Bearer ${authToken}`
  });

  displayResponse('Delete Profile Result:', result);

  return result.success;
}

// Complete authentication flow test
async function runAuthFlow(testUser, profileData) {
  console.log('🚀 Starting ATMA Authentication Flow Test');
  console.log('==========================================');

  try {
    // Check all services health
    const servicesHealthy = await testHealthCheck();
    if (!servicesHealthy) {
      console.log('\n⚠️ Some services are not healthy. Please start all services before testing.');
      return { success: false, error: 'Services not healthy' };
    }

    // Authenticate user (register first, then login if registration fails)
    let authResult = await testRegister(testUser);
    if (!authResult.success) {
      console.log('\n⚠️ Registration failed, trying login instead...');
      authResult = await testLogin(testUser);
      if (!authResult.success) {
        console.log('\n❌ Authentication failed.');
        return { success: false, error: 'Authentication failed' };
      }
    }

    const { authToken, userId } = authResult;

    // Get and update profile
    await testGetProfile(authToken);
    const profileUpdateSuccess = await testUpdateProfile(authToken, profileData);

    // Get profile again to see the updated data
    console.log('\n=== 7. GET UPDATED PROFILE ===');
    const result = await makeRequest('GET', `${API_GATEWAY_URL}/api/auth/profile`, null, {
      'Authorization': `Bearer ${authToken}`
    });
    displayResponse('Get Updated Profile Result:', result);

    console.log('\n🎉 Authentication Flow Test Completed!');
    console.log('======================================');

    return {
      success: true,
      authToken,
      userId,
      profileUpdateSuccess
    };

  } catch (error) {
    console.error('\n💥 Authentication flow test failed:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  testHealthCheck,
  testRegister,
  testLogin,
  testGetProfile,
  testUpdateProfile,
  testDeleteProfile,
  runAuthFlow
};
