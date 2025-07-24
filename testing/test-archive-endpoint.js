const axios = require('axios');
const { faker } = require('@faker-js/faker');

async function testArchiveEndpoint() {
  console.log('🧪 Testing Archive Endpoint GET /archive/results/:id');
  console.log('=================================================');
  
  const baseURL = 'http://localhost:3000';
  
  try {
    // Step 1: Create test user
    const timestamp = Date.now();
    const testUser = {
      email: `testuser${timestamp}@example.com`,
      username: `testuser${timestamp}`,
      password: 'TestPassword123!',
      full_name: faker.person.fullName()
    };
    
    console.log('👤 Step 1: Creating test user...');
    const registerResponse = await axios.post(`${baseURL}/api/auth/register`, testUser);
    console.log('✅ User created:', registerResponse.data.data.user.id);
    
    // Step 2: Login
    console.log('🔐 Step 2: Logging in...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');
    
    // Step 3: Submit assessment
    console.log('📊 Step 3: Submitting assessment...');
    const assessmentData = {
      assessmentName: "AI-Driven Talent Mapping",
      riasec: {
        realistic: 4, investigative: 5, artistic: 3,
        social: 4, enterprising: 3, conventional: 2
      },
      ocean: {
        openness: 4, conscientiousness: 5, extraversion: 3,
        agreeableness: 4, neuroticism: 2
      },
      viaIs: {
        creativity: 4, curiosity: 5, judgment: 4,
        loveOfLearning: 5, perspective: 4, bravery: 3,
        perseverance: 4, honesty: 5, zest: 3,
        love: 4, kindness: 4, socialIntelligence: 3,
        teamwork: 4, fairness: 5, leadership: 3,
        forgiveness: 4, humility: 4, prudence: 5,
        selfRegulation: 4, appreciationOfBeauty: 3, gratitude: 4,
        hope: 4, humor: 3, spirituality: 2
      }
    };
    
    const assessmentResponse = await axios.post(`${baseURL}/api/assessment/submit`, assessmentData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const jobId = assessmentResponse.data.data.jobId;
    console.log('✅ Assessment submitted, jobId:', jobId);
    
    // Step 4: Wait for completion and get result ID
    console.log('⏳ Step 4: Waiting for assessment completion...');
    let resultId = null;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds
    
    while (!resultId && attempts < maxAttempts) {
      try {
        const jobResponse = await axios.get(`${baseURL}/api/archive/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (jobResponse.data.data.status === 'completed' && jobResponse.data.data.result_id) {
          resultId = jobResponse.data.data.result_id;
          console.log('✅ Assessment completed, resultId:', resultId);
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
        
        if (attempts % 10 === 0) {
          console.log(`⏳ Still waiting... (${attempts}s)`);
        }
      } catch (error) {
        console.log('⚠️ Error checking job status:', error.response?.data || error.message);
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }
    
    if (!resultId) {
      throw new Error('Assessment did not complete within timeout');
    }
    
    // Step 5: Test the endpoint
    console.log('🎯 Step 5: Testing GET /archive/results/:id endpoint...');
    
    // Add small delay to ensure data is fully committed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const resultResponse = await axios.get(`${baseURL}/api/archive/results/${resultId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Endpoint test successful!');
    console.log('📊 Response details:');
    console.log('   - Status:', resultResponse.status);
    console.log('   - Success:', resultResponse.data.success);
    console.log('   - Has persona_profile:', !!resultResponse.data.data.persona_profile);
    console.log('   - Archetype:', resultResponse.data.data.persona_profile?.archetype || 'N/A');
    console.log('   - Career recommendations:', resultResponse.data.data.persona_profile?.careerRecommendation?.length || 0);
    
    // Step 6: Test with different user (should fail)
    console.log('🔒 Step 6: Testing access control...');
    const otherUser = {
      email: `other${timestamp}@example.com`,
      username: `other${timestamp}`,
      password: 'TestPassword123!',
      full_name: faker.person.fullName()
    };
    
    const otherRegisterResponse = await axios.post(`${baseURL}/api/auth/register`, otherUser);
    const otherLoginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: otherUser.email,
      password: otherUser.password
    });
    const otherToken = otherLoginResponse.data.data.token;
    
    try {
      await axios.get(`${baseURL}/api/archive/results/${resultId}`, {
        headers: { Authorization: `Bearer ${otherToken}` }
      });
      console.log('❌ Access control failed - other user can access result');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Access control working - other user cannot access result');
      } else {
        console.log('⚠️ Unexpected error:', error.response?.status, error.response?.data);
      }
    }
    
    console.log('\n🎉 All tests completed successfully!');
    return {
      success: true,
      resultId: resultId,
      testUser: testUser
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.status, error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Run the test
testArchiveEndpoint().then(result => {
  console.log('\n📊 Final Result:', result);
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});
