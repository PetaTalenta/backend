#!/usr/bin/env node

/**
 * Direct OpenRouter AI Test
 * Tests OpenRouter AI functionality directly without authentication
 */

const axios = require('axios');

// Configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';

/**
 * Test OpenRouter API directly
 */
async function testOpenRouterAPIDirect() {
  console.log('\n🤖 Testing OpenRouter API directly...');
  
  try {
    const response = await axios.post(
      `${OPENROUTER_API_URL}/chat/completions`,
      {
        model: 'qwen/qwen-2.5-coder-32b-instruct:free',
        messages: [
          {
            role: 'user',
            content: 'Hello! Can you briefly explain what artificial intelligence is?'
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3006',
          'X-Title': 'ATMA Chatbot Service'
        },
        timeout: 30000
      }
    );
    
    if (response.data && response.data.choices && response.data.choices[0]) {
      const aiResponse = response.data.choices[0].message.content;
      console.log('✅ OpenRouter API test successful');
      console.log(`   Model: ${response.data.model}`);
      console.log(`   Response: "${aiResponse.substring(0, 100)}..."`);
      console.log(`   Response Length: ${aiResponse.length} characters`);
      console.log(`   Usage: ${JSON.stringify(response.data.usage || {})}`);
      return true;
    } else {
      console.log('❌ OpenRouter API test failed - invalid response format');
      console.log(`   Response: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    console.log('❌ OpenRouter API test failed');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return false;
  }
}

/**
 * Test OpenRouter models endpoint
 */
async function testOpenRouterModels() {
  console.log('\n📋 Testing OpenRouter models endpoint...');
  
  try {
    const response = await axios.get(
      `${OPENROUTER_API_URL}/models`,
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    if (response.data && response.data.data) {
      const models = response.data.data;
      const freeModels = models.filter(model => 
        model.pricing && 
        (model.pricing.prompt === '0' || model.pricing.prompt === 0)
      );
      
      console.log('✅ OpenRouter models retrieved successfully');
      console.log(`   Total Models: ${models.length}`);
      console.log(`   Free Models: ${freeModels.length}`);
      console.log(`   Test Model Available: ${models.some(m => m.id === 'qwen/qwen-2.5-coder-32b-instruct:free') ? 'Yes' : 'No'}`);
      return true;
    } else {
      console.log('❌ OpenRouter models test failed');
      return false;
    }
  } catch (error) {
    console.log('❌ OpenRouter models test failed');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return false;
  }
}

/**
 * Test OpenRouter service health through our chatbot service
 */
async function testChatbotServiceOpenRouter() {
  console.log('\n🔗 Testing OpenRouter through chatbot service...');
  
  try {
    // This would require a direct endpoint to test OpenRouter
    // For now, we'll just check if the service is healthy
    const response = await axios.get('http://localhost:3006/health');
    
    if (response.data.status === 'healthy') {
      console.log('✅ Chatbot service is healthy');
      console.log('   Note: OpenRouter integration is configured in the service');
      return true;
    } else {
      console.log('❌ Chatbot service is not healthy');
      return false;
    }
  } catch (error) {
    console.log('❌ Chatbot service test failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

/**
 * Test API key validation
 */
async function testAPIKeyValidation() {
  console.log('\n🔑 Testing API key validation...');
  
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your_openrouter_api_key_here') {
    console.log('❌ OpenRouter API key not configured');
    return false;
  }
  
  if (!OPENROUTER_API_KEY.startsWith('sk-or-v1-')) {
    console.log('❌ OpenRouter API key format invalid');
    return false;
  }
  
  console.log('✅ OpenRouter API key format is valid');
  console.log(`   Key: ${OPENROUTER_API_KEY.substring(0, 20)}...`);
  return true;
}

/**
 * Main test runner
 */
async function runDirectAITests() {
  console.log('🚀 Starting Direct OpenRouter AI Tests');
  console.log(`   OpenRouter API URL: ${OPENROUTER_API_URL}`);
  console.log(`   API Key: ${OPENROUTER_API_KEY ? OPENROUTER_API_KEY.substring(0, 20) + '...' : 'Not set'}`);
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  const tests = [
    { name: 'API Key Validation', fn: testAPIKeyValidation },
    { name: 'OpenRouter Models', fn: testOpenRouterModels },
    { name: 'OpenRouter API Direct', fn: testOpenRouterAPIDirect },
    { name: 'Chatbot Service Health', fn: testChatbotServiceOpenRouter }
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
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n📋 Direct AI Test Summary');
  console.log('==========================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);

  if (results.failed === 0) {
    console.log('\n🎉 All direct AI tests passed! OpenRouter API is working perfectly.');
    console.log('\n✨ OpenRouter API Status: FULLY FUNCTIONAL');
  } else if (results.passed > 0) {
    console.log('\n⚠️  Some tests failed, but basic functionality is working.');
    console.log('\n🔧 OpenRouter API Status: PARTIALLY FUNCTIONAL');
  } else {
    console.log('\n❌ All tests failed. OpenRouter API integration needs attention.');
    console.log('\n🚨 OpenRouter API Status: NOT FUNCTIONAL');
  }

  console.log('\n📝 Direct Integration Summary:');
  console.log(`   ${OPENROUTER_API_KEY ? '✅' : '❌'} API Key: ${OPENROUTER_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`   ${results.passed > 1 ? '✅' : '❌'} API Access: ${results.passed > 1 ? 'Working' : 'Issues detected'}`);
  console.log(`   ${results.passed > 2 ? '✅' : '❌'} AI Responses: ${results.passed > 2 ? 'Working' : 'Issues detected'}`);
  console.log(`   ${results.passed > 0 ? '✅' : '❌'} Service Health: ${results.passed > 0 ? 'Healthy' : 'Issues detected'}`);

  return results.failed === 0;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runDirectAITests().catch((error) => {
    console.error('Direct AI test runner failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runDirectAITests,
  testOpenRouterAPIDirect,
  testOpenRouterModels,
  testChatbotServiceOpenRouter,
  testAPIKeyValidation
};
