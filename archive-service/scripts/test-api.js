/**
 * API Integration Test Script
 * Tests the Archive Service API endpoints
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = `http://localhost:${process.env.PORT || 3002}`;
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'internal_service_secret_key_change_in_production';

// Test data
const testUserId = '550e8400-e29b-41d4-a716-446655440001';
const testAnalysisResult = {
  user_id: testUserId,
  assessment_data: {
    riasec: {
      realistic: 75,
      investigative: 85,
      artistic: 60,
      social: 50,
      enterprising: 70,
      conventional: 55
    },
    ocean: {
      openness: 80,
      conscientiousness: 65,
      extraversion: 55,
      agreeableness: 45,
      neuroticism: 30
    }
  },
  persona_profile: [{
    archetype: "The Test Innovator",
    shortSummary: "A test profile for API testing",
    strengths: ["Testing", "Debugging", "Problem solving"],
    weakness: ["Impatience with bugs"],
    careerRecommendation: [{
      career: "QA Engineer",
      reason: "Great at finding issues"
    }],
    insights: ["Focus on test automation"],
    workEnvironment: "Collaborative testing environment",
    roleModel: ["Test Guru"]
  }],
  status: "completed"
};

/**
 * Test health endpoint
 */
async function testHealth() {
  try {
    console.log('🏥 Testing health endpoint...');
    const response = await axios.get(`${BASE_URL}/health`);
    
    console.log(`✅ Health check: ${response.data.status}`);
    console.log(`   Service: ${response.data.service}`);
    console.log(`   Database: ${response.data.database}`);
    console.log(`   Version: ${response.data.version}`);
    
    return response.data.status === 'healthy';
  } catch (error) {
    console.error(`❌ Health check failed: ${error.message}`);
    return false;
  }
}

/**
 * Test root endpoint
 */
async function testRoot() {
  try {
    console.log('\n🏠 Testing root endpoint...');
    const response = await axios.get(`${BASE_URL}/`);
    
    console.log(`✅ Root endpoint: ${response.data.message}`);
    console.log(`   Version: ${response.data.version}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Root endpoint failed: ${error.message}`);
    return false;
  }
}

/**
 * Test internal service authentication
 */
async function testInternalAuth() {
  try {
    console.log('\n🔐 Testing internal service authentication...');
    
    // Test without headers (should fail)
    try {
      await axios.post(`${BASE_URL}/archive/results`, testAnalysisResult);
      console.log('❌ Should have failed without auth headers');
      return false;
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Correctly rejected request without auth headers');
      } else {
        console.log(`❌ Unexpected error: ${error.response?.status} ${error.message}`);
        return false;
      }
    }
    
    // Test with correct headers
    const response = await axios.post(`${BASE_URL}/archive/results`, testAnalysisResult, {
      headers: {
        'X-Internal-Service': 'true',
        'X-Service-Key': INTERNAL_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Internal service authentication successful');
    console.log(`   Created result ID: ${response.data.data.id}`);
    
    return response.data.data.id;
  } catch (error) {
    console.error(`❌ Internal auth test failed: ${error.response?.status} ${error.message}`);
    if (error.response?.data) {
      console.error(`   Response: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

/**
 * Test getting results (requires user auth simulation)
 */
async function testGetResults(resultId) {
  try {
    console.log('\n📋 Testing get results endpoint...');
    
    // Simulate API Gateway headers
    const response = await axios.get(`${BASE_URL}/archive/results`, {
      headers: {
        'X-User-ID': testUserId,
        'X-User-Email': 'test@example.com'
      }
    });
    
    console.log('✅ Get results successful');
    console.log(`   Found ${response.data.data.results.length} result(s)`);
    console.log(`   Total: ${response.data.data.pagination.total}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Get results failed: ${error.response?.status} ${error.message}`);
    if (error.response?.data) {
      console.error(`   Response: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

/**
 * Test getting specific result
 */
async function testGetResultById(resultId) {
  try {
    console.log('\n📄 Testing get result by ID endpoint...');
    
    const response = await axios.get(`${BASE_URL}/archive/results/${resultId}`, {
      headers: {
        'X-User-ID': testUserId,
        'X-User-Email': 'test@example.com'
      }
    });
    
    console.log('✅ Get result by ID successful');
    console.log(`   Result ID: ${response.data.data.id}`);
    console.log(`   Status: ${response.data.data.status}`);
    console.log(`   Archetype: ${response.data.data.persona_profile[0].archetype}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Get result by ID failed: ${error.response?.status} ${error.message}`);
    return false;
  }
}

/**
 * Test statistics endpoint
 */
async function testStats() {
  try {
    console.log('\n📊 Testing statistics endpoint...');
    
    const response = await axios.get(`${BASE_URL}/archive/stats`, {
      headers: {
        'X-User-ID': testUserId,
        'X-User-Email': 'test@example.com'
      }
    });
    
    console.log('✅ Statistics endpoint successful');
    console.log(`   Total analyses: ${response.data.data.total_analyses}`);
    console.log(`   Completed: ${response.data.data.completed}`);
    console.log(`   Most common archetype: ${response.data.data.most_common_archetype}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Statistics failed: ${error.response?.status} ${error.message}`);
    return false;
  }
}

/**
 * Test updating result
 */
async function testUpdateResult(resultId) {
  try {
    console.log('\n✏️ Testing update result endpoint...');
    
    const updateData = {
      status: 'completed',
      persona_profile: [{
        ...testAnalysisResult.persona_profile[0],
        archetype: "The Updated Test Innovator"
      }]
    };
    
    const response = await axios.put(`${BASE_URL}/archive/results/${resultId}`, updateData, {
      headers: {
        'X-Internal-Service': 'true',
        'X-Service-Key': INTERNAL_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Update result successful');
    console.log(`   Updated result ID: ${response.data.data.id}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Update result failed: ${error.response?.status} ${error.message}`);
    return false;
  }
}

/**
 * Main test function
 */
async function runAPITests() {
  console.log('🧪 Archive Service API Integration Tests\n');
  console.log('='.repeat(60));
  
  let allTestsPassed = true;
  let createdResultId = null;
  
  // Test health
  const healthOk = await testHealth();
  if (!healthOk) allTestsPassed = false;
  
  // Test root
  const rootOk = await testRoot();
  if (!rootOk) allTestsPassed = false;
  
  // Test internal auth and create result
  createdResultId = await testInternalAuth();
  if (!createdResultId) {
    allTestsPassed = false;
  } else {
    // Test get results
    const getResultsOk = await testGetResults(createdResultId);
    if (!getResultsOk) allTestsPassed = false;
    
    // Test get result by ID
    const getResultByIdOk = await testGetResultById(createdResultId);
    if (!getResultByIdOk) allTestsPassed = false;
    
    // Test statistics
    const statsOk = await testStats();
    if (!statsOk) allTestsPassed = false;
    
    // Test update result
    const updateOk = await testUpdateResult(createdResultId);
    if (!updateOk) allTestsPassed = false;
  }
  
  console.log('\n' + '='.repeat(60));
  if (allTestsPassed) {
    console.log('🎉 All API tests passed! Archive Service is working correctly.');
    if (createdResultId) {
      console.log(`\n💡 Test result created with ID: ${createdResultId}`);
      console.log('   You can clean it up manually if needed.');
    }
  } else {
    console.log('💥 Some API tests failed. Please check the errors above.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAPITests().catch(error => {
    console.error('💥 Test runner failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  runAPITests,
  testHealth,
  testRoot,
  testInternalAuth
};
