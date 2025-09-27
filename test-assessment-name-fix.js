#!/usr/bin/env node

/**
 * Test script to verify that assessment name is not duplicated
 * in test_data and assessment_name column
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test user credentials
const TEST_USER = {
  email: 'kasykoi@gmail.com',
  password: 'Anjas123'
};

// Sample assessment data (without assessmentName inside)
const SAMPLE_ASSESSMENT = {
  assessment_name: 'AI-Driven Talent Mapping',
  assessment_data: {
    riasec: {
      realistic: 75,
      investigative: 85,
      artistic: 65,
      social: 70,
      enterprising: 80,
      conventional: 60
    },
    ocean: {
      openness: 88,
      conscientiousness: 75,
      extraversion: 72,
      agreeableness: 85,
      neuroticism: 35
    },
    viaIs: {
      creativity: 82,
      curiosity: 90,
      judgment: 78,
      loveOfLearning: 95,
      perspective: 75,
      bravery: 68,
      perseverance: 85,
      honesty: 88,
      zest: 76,
      love: 82,
      kindness: 87,
      socialIntelligence: 74,
      teamwork: 79,
      fairness: 86,
      leadership: 72,
      forgiveness: 77,
      humility: 81,
      prudence: 73,
      selfRegulation: 84,
      appreciationOfBeauty: 69,
      gratitude: 89,
      hope: 83,
      humor: 71,
      spirituality: 58
    }
  }
};

let authToken = null;

async function login() {
  console.log('🔐 Logging in...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    authToken = response.data.data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.error?.message || error.message);
    return false;
  }
}

async function submitAssessment() {
  console.log('\n📝 Submitting assessment...');
  try {
    const response = await axios.post(`${BASE_URL}/assessment/submit`, SAMPLE_ASSESSMENT, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      }
    });
    
    const jobId = response.data.data.jobId;
    console.log('✅ Assessment submitted successfully');
    console.log('📋 Job ID:', jobId);
    return jobId;
  } catch (error) {
    console.error('❌ Assessment submission failed:', error.response?.data?.error?.message || error.message);
    return null;
  }
}

async function waitForCompletion(jobId) {
  console.log('\n⏳ Waiting for analysis completion...');
  const maxAttempts = 30; // 5 minutes max
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(`${BASE_URL}/assessment/status/${jobId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      const status = response.data.data.status;
      console.log(`📊 Status: ${status} (attempt ${attempts + 1}/${maxAttempts})`);
      
      if (status === 'completed') {
        console.log('✅ Analysis completed');
        return response.data.data.resultId;
      } else if (status === 'failed') {
        console.error('❌ Analysis failed');
        return null;
      }
      
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;
    } catch (error) {
      console.error('❌ Status check failed:', error.response?.data?.error?.message || error.message);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  console.error('❌ Timeout waiting for completion');
  return null;
}

async function checkResult(resultId) {
  console.log('\n🔍 Checking result for assessment name duplication...');
  try {
    const response = await axios.get(`${BASE_URL}/archive/results/${resultId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const result = response.data.data;
    
    console.log('📊 Result structure:');
    console.log('- ID:', result.id);
    console.log('- Assessment Name (column):', result.assessment_name);
    console.log('- Test Data keys:', Object.keys(result.test_data || {}));
    
    // Check for duplication
    const hasAssessmentNameInTestData = result.test_data && 
      (result.test_data.assessmentName || result.test_data.assessment_name);
    
    if (hasAssessmentNameInTestData) {
      console.error('❌ DUPLICATION FOUND: assessmentName exists in test_data');
      console.error('   test_data.assessmentName:', result.test_data.assessmentName);
      console.error('   test_data.assessment_name:', result.test_data.assessment_name);
      return false;
    } else {
      console.log('✅ NO DUPLICATION: assessmentName only in assessment_name column');
      console.log('✅ test_data contains only assessment data without assessment name');
      return true;
    }
  } catch (error) {
    console.error('❌ Result check failed:', error.response?.data?.error?.message || error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Testing Assessment Name Duplication Fix');
  console.log('==========================================');
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    process.exit(1);
  }
  
  // Step 2: Submit assessment
  const jobId = await submitAssessment();
  if (!jobId) {
    process.exit(1);
  }
  
  // Step 3: Wait for completion
  const resultId = await waitForCompletion(jobId);
  if (!resultId) {
    process.exit(1);
  }
  
  // Step 4: Check result
  const isFixed = await checkResult(resultId);
  
  console.log('\n🏁 Test Results:');
  console.log('================');
  if (isFixed) {
    console.log('✅ PASS: Assessment name duplication is fixed');
    console.log('✅ Assessment name only exists in assessment_name column');
    console.log('✅ test_data contains only assessment data');
    process.exit(0);
  } else {
    console.log('❌ FAIL: Assessment name duplication still exists');
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run the test
main().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
