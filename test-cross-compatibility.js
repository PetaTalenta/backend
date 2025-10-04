const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test user credentials
const TEST_USER = {
  email: 'cross-test@example.com',
  password: 'TestPassword123',
  name: 'Cross Test User',
  username: 'crosstest'
};

async function testScenario1() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Scenario 1: Register with OLD, Login with NEW            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Step 1: Register with old auth-service
    console.log('Step 1: Registering with OLD auth-service...');
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      email: TEST_USER.email,
      password: TEST_USER.password,
      name: TEST_USER.name,
      username: TEST_USER.username
    });
    
    if (registerResponse.data.success) {
      console.log('✅ Registration successful with OLD auth-service');
      console.log(`   User ID: ${registerResponse.data.data.user.id}`);
      console.log(`   Email: ${registerResponse.data.data.user.email}`);
    }
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Try to login with new auth-v2-service
    console.log('\nStep 2: Attempting login with NEW auth-v2-service...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/v2/login`, {
        email: TEST_USER.email,
        password: TEST_USER.password
      });
      
      if (loginResponse.data.success) {
        console.log('✅ Login successful with NEW auth-v2-service');
        console.log(`   Token: ${loginResponse.data.data.idToken.substring(0, 50)}...`);
        return true;
      }
    } catch (loginError) {
      console.log('❌ Login FAILED with NEW auth-v2-service');
      console.log(`   Error: ${loginError.response?.data?.message || loginError.message}`);
      console.log(`   Status: ${loginError.response?.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testScenario2() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Scenario 2: Register with NEW, Login with OLD            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const TEST_USER_2 = {
    email: 'cross-test-2@example.com',
    password: 'TestPassword123',
    name: 'Cross Test User 2',
    username: 'crosstest2'
  };
  
  try {
    // Step 1: Register with new auth-v2-service
    console.log('Step 1: Registering with NEW auth-v2-service...');
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/v2/register`, {
      email: TEST_USER_2.email,
      password: TEST_USER_2.password
    });
    
    if (registerResponse.data.success) {
      console.log('✅ Registration successful with NEW auth-v2-service');
      console.log(`   UID: ${registerResponse.data.data.uid}`);
      console.log(`   Email: ${registerResponse.data.data.email}`);
    }
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Try to login with old auth-service
    console.log('\nStep 2: Attempting login with OLD auth-service...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: TEST_USER_2.email,
        password: TEST_USER_2.password
      });
      
      if (loginResponse.data.success) {
        console.log('✅ Login successful with OLD auth-service');
        console.log(`   Token: ${loginResponse.data.data.token.substring(0, 50)}...`);
        return true;
      }
    } catch (loginError) {
      console.log('❌ Login FAILED with OLD auth-service');
      console.log(`   Error: ${loginError.response?.data?.message || loginError.message}`);
      console.log(`   Status: ${loginError.response?.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    return false;
  }
}

async function checkDatabaseState() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Checking Database State                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('To check the database state, run:');
  console.log('docker compose exec postgres psql -U atma_user -d atma_db -c "SELECT id, email, username, auth_provider, firebase_uid, password_hash IS NOT NULL as has_password FROM auth.users WHERE email LIKE \'cross-test%\';"');
}

async function runTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Cross-Compatibility Testing                               ║');
  console.log('║  Testing if users can login across auth systems           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const results = {
    scenario1: false,
    scenario2: false
  };
  
  // Test Scenario 1
  results.scenario1 = await testScenario1();
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test Scenario 2
  results.scenario2 = await testScenario2();
  
  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Test Results Summary                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('Scenario 1 (Register OLD → Login NEW):');
  console.log(`  ${results.scenario1 ? '✅ PASS' : '❌ FAIL'} - ${results.scenario1 ? 'Cross-compatible' : 'NOT cross-compatible'}`);
  
  console.log('\nScenario 2 (Register NEW → Login OLD):');
  console.log(`  ${results.scenario2 ? '✅ PASS' : '❌ FAIL'} - ${results.scenario2 ? 'Cross-compatible' : 'NOT cross-compatible'}`);
  
  console.log('\n' + '='.repeat(60));
  
  if (!results.scenario1 && !results.scenario2) {
    console.log('\n⚠️  IMPORTANT FINDING:');
    console.log('Users registered in one auth system CANNOT login in the other.');
    console.log('This is because:');
    console.log('  - OLD auth-service stores passwords in PostgreSQL (bcrypt)');
    console.log('  - NEW auth-v2-service stores passwords in Firebase Auth');
    console.log('  - These are separate credential stores');
    console.log('\nSOLUTION: Implement user migration in Phase 4');
  } else if (results.scenario1 || results.scenario2) {
    console.log('\n✅ Some cross-compatibility exists!');
  }
  
  await checkDatabaseState();
  
  console.log('\n');
}

// Run tests
runTests()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test suite failed with error:', error);
    process.exit(1);
  });

