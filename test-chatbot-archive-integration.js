#!/usr/bin/env node

/**
 * Test script for chatbot-archive integration
 * Tests the flow: POST /chatbot/conversations with resultsId -> verify chatbot_id in archive.analysis_results -> GET archive/results/:id returns chatbot_id
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_PASSWORD = 'password123';

// Test data
const testAssessmentData = {
  riasec: {
    realistic: [4, 5, 3, 4, 5],
    investigative: [5, 4, 5, 4, 3],
    artistic: [3, 4, 5, 5, 4],
    social: [5, 5, 4, 3, 4],
    enterprising: [4, 3, 4, 5, 5],
    conventional: [3, 3, 4, 4, 3]
  },
  ocean: {
    openness: [4, 5, 4, 3, 5],
    conscientiousness: [5, 4, 5, 4, 4],
    extraversion: [3, 4, 3, 5, 4],
    agreeableness: [5, 5, 4, 4, 3],
    neuroticism: [2, 3, 2, 3, 2]
  }
};

const testPersonaProfile = {
  archetype: "The Innovator",
  personality_summary: "Creative and analytical problem solver",
  strengths: ["Innovation", "Problem-solving", "Adaptability"],
  weaknesses: ["Impatience", "Perfectionism"],
  careerRecommendations: ["Software Developer", "Data Scientist", "Product Manager"],
  riasec: {
    primary: "Investigative",
    secondary: "Artistic",
    scores: { realistic: 4.2, investigative: 4.4, artistic: 4.2, social: 4.2, enterprising: 4.2, conventional: 3.4 }
  },
  ocean: {
    openness: 4.2,
    conscientiousness: 4.4,
    extraversion: 3.8,
    agreeableness: 4.2,
    neuroticism: 2.4
  }
};

let authToken = null;
let testUserId = null;

async function authenticate() {
  try {
    console.log('🔐 Authenticating test user...');
    
    // Try to login first
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD
      });
      
      authToken = loginResponse.data.data.token;
      testUserId = loginResponse.data.data.user.id;
      console.log('✅ Login successful');
      return;
    } catch (loginError) {
      if (loginError.response?.status !== 401) {
        throw loginError;
      }
      console.log('ℹ️  User not found, creating new test user...');
    }
    
    // Create test user if login failed
    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      full_name: 'Test User',
      date_of_birth: '1990-01-01',
      gender: 'other'
    });
    
    authToken = registerResponse.data.data.token;
    testUserId = registerResponse.data.data.user.id;
    console.log('✅ User created and authenticated');
    
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    throw error;
  }
}

async function createAnalysisResult() {
  try {
    console.log('📊 Creating test analysis result...');
    
    const response = await axios.post(`${API_BASE_URL}/archive/results`, {
      user_id: testUserId,
      assessment_data: testAssessmentData,
      persona_profile: testPersonaProfile,
      status: 'completed',
      assessment_name: 'AI-Driven Talent Mapping'
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const resultId = response.data.data.id;
    console.log('✅ Analysis result created:', resultId);
    return resultId;
    
  } catch (error) {
    console.error('❌ Failed to create analysis result:', error.response?.data || error.message);
    throw error;
  }
}

async function createConversationWithResultsId(resultsId) {
  try {
    console.log('💬 Creating conversation with resultsId...');
    
    const response = await axios.post(`${API_BASE_URL}/chatbot/conversations`, {
      title: 'Test Conversation with Results Link',
      resultsId: resultsId,
      profilePersona: {
        name: 'Test User',
        archetype: 'The Innovator'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const conversationId = response.data.data.conversation.id;
    console.log('✅ Conversation created:', conversationId);
    return conversationId;
    
  } catch (error) {
    console.error('❌ Failed to create conversation:', error.response?.data || error.message);
    throw error;
  }
}

async function verifyAnalysisResultHasChatbotId(resultsId, expectedChatbotId) {
  try {
    console.log('🔍 Verifying analysis result has chatbot_id...');
    
    // Wait a bit for the async update to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response = await axios.get(`${API_BASE_URL}/archive/results/${resultsId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const result = response.data.data;
    console.log('📋 Analysis result data:', {
      id: result.id,
      chatbot_id: result.chatbot_id,
      user_id: result.user_id,
      status: result.status
    });
    
    if (result.chatbot_id === expectedChatbotId) {
      console.log('✅ Chatbot ID correctly linked to analysis result');
      return true;
    } else {
      console.log('❌ Chatbot ID mismatch:', {
        expected: expectedChatbotId,
        actual: result.chatbot_id
      });
      return false;
    }
    
  } catch (error) {
    console.error('❌ Failed to verify analysis result:', error.response?.data || error.message);
    throw error;
  }
}

async function runIntegrationTest() {
  try {
    console.log('🧪 Starting chatbot-archive integration test...\n');
    
    // Step 1: Authenticate
    await authenticate();
    
    // Step 2: Create analysis result
    const resultsId = await createAnalysisResult();
    
    // Step 3: Create conversation with resultsId
    const conversationId = await createConversationWithResultsId(resultsId);
    
    // Step 4: Verify the link
    const isLinked = await verifyAnalysisResultHasChatbotId(resultsId, conversationId);
    
    if (isLinked) {
      console.log('\n🎉 Integration test PASSED! All steps completed successfully.');
      console.log('✅ Analysis result is correctly linked to chatbot conversation');
    } else {
      console.log('\n❌ Integration test FAILED! Chatbot ID was not properly linked.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Integration test FAILED with error:', error.message);
    process.exit(1);
  }
}

// Run the test
runIntegrationTest();
