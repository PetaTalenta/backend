#!/usr/bin/env node

/**
 * Test script for OpenRouter Integration
 * Tests the complete message flow with AI responses
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Test123!@#';

let authToken = null;
let conversationId = null;

/**
 * Helper function to make authenticated API requests
 */
async function apiRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`API Request failed: ${method} ${endpoint}`);
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Test authentication
 */
async function testAuthentication() {
  console.log('\n🔐 Testing Authentication...');

  try {
    // First, try to register the user (in case it doesn't exist)
    console.log('   Registering test user (if not exists)...');
    try {
      await apiRequest('POST', '/api/auth/register', {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        full_name: 'Test User',
        user_type: 'candidate'
      });
      console.log('   ✅ User registered successfully');
    } catch (registerError) {
      // User might already exist, which is fine
      if (registerError.response?.status === 409) {
        console.log('   ℹ️  User already exists, proceeding with login');
      } else {
        console.log('   ⚠️  Registration failed, trying login anyway');
      }
    }

    // Try to login
    const loginResponse = await apiRequest('POST', '/api/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    // Handle different response structures
    if (loginResponse.success && loginResponse.data) {
      authToken = loginResponse.data.token;
      console.log('✅ Authentication successful');
      console.log(`   User ID: ${loginResponse.data.user.id}`);
      console.log(`   Email: ${loginResponse.data.user.email}`);
    } else if (loginResponse.token) {
      authToken = loginResponse.token;
      console.log('✅ Authentication successful');
      console.log(`   User ID: ${loginResponse.user?.id || 'N/A'}`);
      console.log(`   Email: ${loginResponse.user?.email || TEST_EMAIL}`);
    } else {
      throw new Error('Invalid response structure');
    }

    return true;
  } catch (error) {
    console.log('❌ Authentication failed');
    console.log('   Error details:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test conversation creation
 */
async function testConversationCreation() {
  console.log('\n💬 Testing Conversation Creation...');
  
  try {
    const response = await apiRequest('POST', '/api/chatbot/conversations', {
      title: 'OpenRouter Integration Test',
      context_type: 'general'
    });



    // Handle different response structures
    if (response.success && response.data && response.data.conversation) {
      conversationId = response.data.conversation.id;
      console.log('✅ Conversation created successfully');
      console.log(`   Conversation ID: ${conversationId}`);
      console.log(`   Title: ${response.data.conversation.title}`);
    } else if (response.success && response.data) {
      conversationId = response.data.id;
      console.log('✅ Conversation created successfully');
      console.log(`   Conversation ID: ${conversationId}`);
      console.log(`   Title: ${response.data.title}`);
    } else if (response.conversation) {
      conversationId = response.conversation.id;
      console.log('✅ Conversation created successfully');
      console.log(`   Conversation ID: ${conversationId}`);
      console.log(`   Title: ${response.conversation.title}`);
    } else if (response.id) {
      conversationId = response.id;
      console.log('✅ Conversation created successfully');
      console.log(`   Conversation ID: ${conversationId}`);
      console.log(`   Title: ${response.title || 'N/A'}`);
    } else {
      console.log('❌ Unexpected response structure:', JSON.stringify(response, null, 2));
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('❌ Conversation creation failed');
    console.log('   Error details:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test sending message and getting AI response
 */
async function testMessageSending() {
  console.log('\n🤖 Testing Message Sending with AI Response...');
  
  if (!conversationId) {
    console.log('❌ No conversation ID available');
    return false;
  }

  try {
    const testMessage = 'Hello! Can you help me understand what ATMA is and how it works?';
    
    console.log(`   Sending message: "${testMessage}"`);
    
    const response = await apiRequest('POST', `/api/chatbot/conversations/${conversationId}/messages`, {
      content: testMessage,
      content_type: 'text'
    });

    console.log('✅ Message sent and AI response received');
    console.log(`   User Message ID: ${response.user_message.id}`);
    console.log(`   Assistant Message ID: ${response.assistant_message.id}`);
    console.log(`   AI Response: "${response.assistant_message.content.substring(0, 100)}..."`);
    console.log(`   Model Used: ${response.usage.isFreeModel ? '🆓 ' : '💰 '}${response.assistant_message.metadata.model}`);
    console.log(`   Token Usage: ${response.usage.total_tokens} tokens (${response.usage.prompt_tokens} prompt + ${response.usage.completion_tokens} completion)`);
    console.log(`   Processing Time: ${response.processing_time}ms`);
    console.log(`   Cost: ${response.usage.cost} credits`);
    
    return true;
  } catch (error) {
    console.log('❌ Message sending failed');
    return false;
  }
}

/**
 * Test getting conversation messages
 */
async function testMessageRetrieval() {
  console.log('\n📋 Testing Message Retrieval...');
  
  if (!conversationId) {
    console.log('❌ No conversation ID available');
    return false;
  }

  try {
    const response = await apiRequest('GET', `/api/chatbot/conversations/${conversationId}/messages?include_usage=true`);

    console.log('✅ Messages retrieved successfully');

    // Handle response structure - check if data is nested
    const messages = response.data ? response.data.messages : response.messages;
    const pagination = response.data ? response.data.pagination : response.pagination;

    if (!messages) {
      console.log('❌ No messages found in response');
      console.log('   Response structure:', JSON.stringify(response, null, 2));
      return false;
    }

    console.log(`   Total Messages: ${messages.length}`);
    console.log(`   Pagination: Page ${pagination.current_page} of ${pagination.total_pages}`);

    messages.forEach((msg, index) => {
      console.log(`   Message ${index + 1}: ${msg.sender_type} - "${msg.content.substring(0, 50)}..."`);
    });

    return true;
  } catch (error) {
    console.log('❌ Message retrieval failed');
    console.log('   Error details:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test usage statistics
 */
async function testUsageStatistics() {
  console.log('\n📊 Testing Usage Statistics...');
  
  try {
    const response = await apiRequest('GET', '/api/chatbot/usage/summary');

    console.log('✅ Usage statistics retrieved successfully');
    console.log(`   Weekly Requests: ${response.data.weekly.totalRequests}`);
    console.log(`   Weekly Tokens: ${response.data.weekly.totalTokens}`);
    console.log(`   Weekly Cost: ${response.data.weekly.totalCost} credits`);
    console.log(`   Free Model Usage: ${response.data.weekly.freeModelUsage} requests`);
    
    if (response.data.topModels.length > 0) {
      console.log('   Top Models:');
      response.data.topModels.slice(0, 3).forEach((model, index) => {
        console.log(`     ${index + 1}. ${model.model} - ${model.freeModelRequests + model.paidModelRequests} requests`);
      });
    }
    
    return true;
  } catch (error) {
    console.log('❌ Usage statistics retrieval failed');
    return false;
  }
}

/**
 * Test conversation usage statistics
 */
async function testConversationUsageStatistics() {
  console.log('\n📈 Testing Conversation Usage Statistics...');
  
  if (!conversationId) {
    console.log('❌ No conversation ID available');
    return false;
  }

  try {
    const response = await apiRequest('GET', `/api/chatbot/conversations/${conversationId}/usage`);

    console.log('✅ Conversation usage statistics retrieved successfully');
    console.log(`   Total Tokens: ${response.data.totalUsage.totalTokens}`);
    console.log(`   Total Requests: ${response.data.requestCount}`);
    console.log(`   Average Processing Time: ${response.data.messageStats.avgProcessingTime}ms`);
    
    if (response.data.modelBreakdown.length > 0) {
      console.log('   Model Breakdown:');
      response.data.modelBreakdown.forEach((model) => {
        console.log(`     ${model.model}: ${model.freeModelRequests + model.paidModelRequests} requests`);
      });
    }
    
    return true;
  } catch (error) {
    console.log('❌ Conversation usage statistics retrieval failed');
    return false;
  }
}

/**
 * Test health endpoints
 */
async function testHealthEndpoints() {
  console.log('\n🏥 Testing Health Endpoints...');
  
  try {
    const response = await apiRequest('GET', '/api/chatbot/health');

    console.log('✅ Health check successful');
    console.log(`   Service: ${response.service}`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Version: ${response.version}`);
    
    return true;
  } catch (error) {
    console.log('❌ Health check failed');
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting OpenRouter Integration Tests');
  console.log(`   API Base URL: ${API_BASE_URL}`);
  console.log(`   Test User: ${TEST_EMAIL}`);
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  const tests = [
    { name: 'Authentication', fn: testAuthentication },
    { name: 'Health Endpoints', fn: testHealthEndpoints },
    { name: 'Conversation Creation', fn: testConversationCreation },
    { name: 'Message Sending', fn: testMessageSending },
    { name: 'Message Retrieval', fn: testMessageRetrieval },
    { name: 'Usage Statistics', fn: testUsageStatistics },
    { name: 'Conversation Usage Statistics', fn: testConversationUsageStatistics }
  ];

  for (const test of tests) {
    results.total++;
    try {
      const success = await test.fn();
      if (success) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      results.failed++;
      console.log(`❌ Test "${test.name}" threw an error:`, error.message);
    }
  }

  // Summary
  console.log('\n📋 Test Summary');
  console.log('================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! OpenRouter integration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the logs above for details.');
  }

  process.exit(results.failed === 0 ? 0 : 1);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch((error) => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testAuthentication,
  testConversationCreation,
  testMessageSending,
  testMessageRetrieval,
  testUsageStatistics,
  testConversationUsageStatistics,
  testHealthEndpoints
};
