// Admin authentication testing for ATMA
const { makeRequest, displayResponse } = require('./test-helpers');
const { API_GATEWAY_URL } = require('./test-config');

// Test admin login
async function testAdminLogin() {
  console.log('\n=== ADMIN LOGIN TEST ===');

  const adminCredentials = {
    username: 'superadmin',
    password: 'admin123'
  };

  const result = await makeRequest('POST', `${API_GATEWAY_URL}/api/admin/login`, adminCredentials);

  displayResponse('Admin Login Result:', result);

  if (result.success && result.data.data?.token) {
    console.log('\n✅ Admin auth token received from login');
    console.log(`Admin User Type: ${result.data.data.user?.user_type}`);
    console.log(`Admin Username: ${result.data.data.user?.username}`);
    console.log(`Admin Email: ${result.data.data.user?.email}`);
    
    return {
      success: true,
      authToken: result.data.data.token,
      adminUser: result.data.data.user
    };
  }

  console.log('\n❌ Admin login failed');
  return { success: false };
}

// Test admin profile access
async function testAdminProfile(authToken) {
  console.log('\n=== ADMIN PROFILE ACCESS TEST ===');

  if (!authToken) {
    console.log('❌ No admin auth token available');
    return false;
  }

  const result = await makeRequest('GET', `${API_GATEWAY_URL}/api/admin/profile`, null, {
    'Authorization': `Bearer ${authToken}`
  });

  displayResponse('Admin Profile Result:', result);

  return result.success;
}

// Test admin health check access
async function testAdminHealthCheck() {
  console.log('\n=== ADMIN HEALTH CHECK TEST ===');

  const result = await makeRequest('GET', `${API_GATEWAY_URL}/api/admin/health`);

  displayResponse('Admin Health Check Result:', result);

  return result.success;
}

// Complete admin authentication flow test
async function runAdminAuthFlow() {
  console.log('🚀 Starting ATMA Admin Authentication Test');
  console.log('==========================================');

  try {
    // Test admin health check first
    await testAdminHealthCheck();

    // Test admin login
    const loginResult = await testAdminLogin();
    if (!loginResult.success) {
      console.log('\n❌ Admin authentication failed.');
      return { success: false, error: 'Admin authentication failed' };
    }

    const { authToken, adminUser } = loginResult;

    // Test admin profile access
    const profileSuccess = await testAdminProfile(authToken);

    console.log('\n🎉 Admin Authentication Test Completed!');
    console.log('=======================================');
    
    if (profileSuccess) {
      console.log('✅ Test Result: SUCCESS - Admin login and profile access working');
    } else {
      console.log('⚠️ Test Result: PARTIAL - Admin login successful but profile access failed');
    }

    return {
      success: true,
      authToken,
      adminUser,
      profileSuccess
    };

  } catch (error) {
    console.error('\n💥 Admin authentication test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  runAdminAuthFlow();
}

module.exports = {
  testAdminLogin,
  testAdminProfile,
  testAdminHealthCheck,
  runAdminAuthFlow
};
