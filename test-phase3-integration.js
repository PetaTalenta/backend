const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const AUTH_SERVICE_URL = 'http://localhost:3001';
const AUTH_V2_SERVICE_URL = 'http://localhost:3008';

// Test credentials
const TEST_USER = {
  email: 'kasykoi@gmail.com',
  password: 'Anjas123'
};

const FIREBASE_USER = {
  email: 'test-firebase@example.com',
  password: 'TestPassword123'
};

let jwtToken = null;
let firebaseToken = null;

async function testJWTLogin() {
  console.log('\n=== Testing JWT Login (Old Auth Service) ===');
  try {
    // Login through API Gateway
    const response = await axios.post(`${BASE_URL}/api/auth/login`, TEST_USER);

    if (response.data.success && response.data.data.token) {
      jwtToken = response.data.data.token;
      console.log('✅ JWT Login successful');
      console.log(`   Token: ${jwtToken.substring(0, 50)}...`);
      console.log(`   User: ${response.data.data.user.email}`);
      return true;
    } else {
      console.log('❌ JWT Login failed: Invalid response');
      return false;
    }
  } catch (error) {
    console.log(`❌ JWT Login failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

async function testFirebaseLogin() {
  console.log('\n=== Testing Firebase Login (Auth-v2 Service) ===');
  try {
    // Try to register first (in case user doesn't exist)
    try {
      await axios.post(`${BASE_URL}/api/auth/v2/register`, FIREBASE_USER);
      console.log('   Firebase user registered');
    } catch (regError) {
      // User might already exist, that's okay
      console.log('   Firebase user already exists or registration failed (continuing...)');
    }

    // Now login
    const response = await axios.post(`${BASE_URL}/api/auth/v2/login`, FIREBASE_USER);

    if (response.data.success && response.data.data.idToken) {
      firebaseToken = response.data.data.idToken;
      console.log('✅ Firebase Login successful');
      console.log(`   Token: ${firebaseToken.substring(0, 50)}...`);
      console.log(`   User: ${response.data.data.email}`);
      return true;
    } else {
      console.log('❌ Firebase Login failed: Invalid response');
      return false;
    }
  } catch (error) {
    console.log(`❌ Firebase Login failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

async function testServiceWithToken(serviceName, endpoint, token, tokenType) {
  console.log(`\n=== Testing ${serviceName} with ${tokenType} token ===`);
  try {
    const response = await axios.get(`${BASE_URL}/api${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`✅ ${serviceName} accepted ${tokenType} token`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
    return true;
  } catch (error) {
    console.log(`❌ ${serviceName} rejected ${tokenType} token`);
    console.log(`   Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

async function testArchiveService(token, tokenType) {
  return await testServiceWithToken('Archive Service', '/archive/jobs?page=1&limit=10', token, tokenType);
}

async function testAssessmentService(token, tokenType) {
  return await testServiceWithToken('Assessment Service', '/assessment/health', token, tokenType);
}

async function testChatbotService(token, tokenType) {
  return await testServiceWithToken('Chatbot Service', '/chatbot/health', token, tokenType);
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Phase 3 Integration Testing: Dual Token Support          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const results = {
    jwtLogin: false,
    firebaseLogin: false,
    archiveJWT: false,
    archiveFirebase: false,
    assessmentJWT: false,
    assessmentFirebase: false,
    chatbotJWT: false,
    chatbotFirebase: false
  };
  
  // Step 1: Login with JWT
  results.jwtLogin = await testJWTLogin();
  
  // Step 2: Login with Firebase
  results.firebaseLogin = await testFirebaseLogin();
  
  // Step 3: Test services with JWT token
  if (jwtToken) {
    results.archiveJWT = await testArchiveService(jwtToken, 'JWT');
    results.assessmentJWT = await testAssessmentService(jwtToken, 'JWT');
    results.chatbotJWT = await testChatbotService(jwtToken, 'JWT');
  } else {
    console.log('\n⚠️  Skipping JWT token tests (no token available)');
  }
  
  // Step 4: Test services with Firebase token
  if (firebaseToken) {
    results.archiveFirebase = await testArchiveService(firebaseToken, 'Firebase');
    results.assessmentFirebase = await testAssessmentService(firebaseToken, 'Firebase');
    results.chatbotFirebase = await testChatbotService(firebaseToken, 'Firebase');
  } else {
    console.log('\n⚠️  Skipping Firebase token tests (no token available)');
  }
  
  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Test Results Summary                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const passed = Object.values(results).filter(r => r === true).length;
  const total = Object.keys(results).length;
  
  console.log('\nAuthentication:');
  console.log(`  JWT Login:              ${results.jwtLogin ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Firebase Login:         ${results.firebaseLogin ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\nArchive Service:');
  console.log(`  JWT Token:              ${results.archiveJWT ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Firebase Token:         ${results.archiveFirebase ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\nAssessment Service:');
  console.log(`  JWT Token:              ${results.assessmentJWT ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Firebase Token:         ${results.assessmentFirebase ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\nChatbot Service:');
  console.log(`  JWT Token:              ${results.chatbotJWT ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Firebase Token:         ${results.chatbotFirebase ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${passed}/${total} tests passed`);
  console.log('='.repeat(60));
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Phase 3 integration successful!');
    return 0;
  } else {
    console.log(`\n⚠️  ${total - passed} test(s) failed. Please review the logs above.`);
    return 1;
  }
}

// Run tests
runTests()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('\n❌ Test suite failed with error:', error);
    process.exit(1);
  });

