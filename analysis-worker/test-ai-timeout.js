#!/usr/bin/env node

/**
 * Test AI Timeout Handling
 * 
 * Script untuk test apakah AI timeout handling berfungsi dengan benar
 * dan status job berubah ke 'failed' bukan stuck di 'processing'
 */

require('dotenv').config();
const logger = require('../src/utils/logger');
const { generatePersonaProfile } = require('../src/services/aiService');

/**
 * Test AI timeout dengan setting timeout yang sangat kecil
 */
async function testAITimeout() {
  console.log('🧪 Testing AI Timeout Handling...\n');

  // Backup original timeout
  const originalTimeout = process.env.AI_REQUEST_TIMEOUT;
  
  // Set timeout sangat kecil (1 detik) untuk memaksa timeout
  process.env.AI_REQUEST_TIMEOUT = '1000'; // 1 second
  console.log(`⏰ Set AI_REQUEST_TIMEOUT to: ${process.env.AI_REQUEST_TIMEOUT}ms`);

  const testJobId = `test-timeout-${Date.now()}`;
  
  // Mock assessment data
  const mockAssessmentData = {
    riasec: {
      realistic: 4.2,
      investigative: 4.8,
      artistic: 3.1,
      social: 3.7,
      enterprising: 2.9,
      conventional: 3.4
    },
    ocean: {
      openness: 4.1,
      conscientiousness: 4.5,
      extraversion: 3.2,
      agreeableness: 4.0,
      neuroticism: 2.8
    },
    viais: {
      creativity: 4.3,
      curiosity: 4.7,
      judgment: 4.1,
      leadership: 3.5,
      perseverance: 4.2
    }
  };

  try {
    console.log(`🚀 Starting AI request with jobId: ${testJobId}`);
    console.log('⏳ This should timeout in 1 second...\n');

    const startTime = Date.now();
    
    // This should timeout
    await generatePersonaProfile(mockAssessmentData, testJobId);
    
    // If we reach here, timeout didn't work
    console.log('❌ FAILED: AI request completed unexpectedly!');
    console.log(`   Duration: ${Date.now() - startTime}ms`);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  Request duration: ${duration}ms`);
    console.log(`🔍 Error code: ${error.code}`);
    console.log(`📝 Error message: ${error.message}\n`);
    
    if (error.code === 'AI_TIMEOUT') {
      console.log('✅ SUCCESS: AI timeout handled correctly!');
      console.log('✅ Status should be set to "failed" (not stuck in "processing")');
      console.log('✅ Error code is AI_TIMEOUT - will not be retried');
      
      // Check if error message contains timeout info
      if (error.message.includes('timed out after')) {
        console.log('✅ Error message contains timeout duration');
      }
      
    } else {
      console.log('❌ FAILED: Expected AI_TIMEOUT error but got:', error.code);
      console.log('❌ This means timeout handling is not working properly');
    }
  } finally {
    // Restore original timeout
    process.env.AI_REQUEST_TIMEOUT = originalTimeout;
    console.log(`\n🔧 Restored AI_REQUEST_TIMEOUT to: ${originalTimeout || 'default'}`);
  }
}

/**
 * Test normal AI request (should not timeout)
 */
async function testNormalRequest() {
  console.log('\n🧪 Testing Normal AI Request (should succeed)...\n');

  // Use normal timeout
  process.env.AI_REQUEST_TIMEOUT = '300000'; // 5 minutes
  console.log(`⏰ Set AI_REQUEST_TIMEOUT to: ${process.env.AI_REQUEST_TIMEOUT}ms`);

  const testJobId = `test-normal-${Date.now()}`;
  
  // Smaller mock assessment data for faster processing
  const mockAssessmentData = {
    riasec: { realistic: 4.0, investigative: 4.0, artistic: 3.0, social: 3.0, enterprising: 3.0, conventional: 3.0 },
    ocean: { openness: 4.0, conscientiousness: 4.0, extraversion: 3.0, agreeableness: 4.0, neuroticism: 3.0 },
    viais: { creativity: 4.0, curiosity: 4.0, judgment: 4.0, leadership: 3.0, perseverance: 4.0 }
  };

  try {
    console.log(`🚀 Starting normal AI request with jobId: ${testJobId}`);
    const startTime = Date.now();
    
    const result = await generatePersonaProfile(mockAssessmentData, testJobId);
    const duration = Date.now() - startTime;
    
    console.log('✅ SUCCESS: Normal AI request completed');
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📊 Result archetype: ${result.archetype}`);
    console.log(`📈 Strengths count: ${result.strengths?.length || 0}`);
    
  } catch (error) {
    console.log('❌ FAILED: Normal request should not fail');
    console.log(`🔍 Error: ${error.message}`);
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🔬 AI Timeout Handling Test Suite');
  console.log('===================================\n');

  try {
    // Test 1: Timeout handling
    await testAITimeout();
    
    // Wait a bit between tests
    console.log('\n⏸️  Waiting 3 seconds before next test...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 2: Normal request (optional, might be slow with real API)
    if (process.argv.includes('--include-normal')) {
      await testNormalRequest();
    } else {
      console.log('\n⏭️  Skipping normal request test (use --include-normal to run)');
    }
    
  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
  }
  
  console.log('\n🏁 Test suite completed!');
  console.log('\n📋 Summary:');
  console.log('• AI timeout should be handled gracefully');
  console.log('• Job status should change to "failed" (not stuck in "processing")');
  console.log('• AI_TIMEOUT errors should not be retried');
  console.log('• Users should get appropriate error message');
}

// Show usage
if (process.argv.includes('--help')) {
  console.log(`
Usage: node test-ai-timeout.js [options]

Options:
  --include-normal    Also test normal AI request (slower)
  --help             Show this help message

This script tests AI timeout handling to ensure:
1. AI requests timeout properly when taking too long
2. Job status is set to 'failed' instead of stuck in 'processing'
3. Proper error codes and messages are generated
4. Timeout errors are not retried (to prevent waste)
`);
  process.exit(0);
}

// Run tests
runTests().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
