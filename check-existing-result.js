#!/usr/bin/env node

/**
 * Check existing result to verify assessment name is not duplicated
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const RESULT_ID = '3473523e-f078-4abc-b67f-a615df2670cb'; // From logs

// Test user credentials
const TEST_USER = {
  email: 'kasykoi@gmail.com',
  password: 'Anjas123'
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

async function checkResult(resultId) {
  console.log(`\n🔍 Checking result ${resultId} for assessment name duplication...`);
  try {
    const response = await axios.get(`${BASE_URL}/archive/results/${resultId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const result = response.data.data;
    
    console.log('\n📊 Result structure:');
    console.log('- ID:', result.id);
    console.log('- Assessment Name (column):', result.assessment_name);
    console.log('- Test Data keys:', Object.keys(result.test_data || {}));
    
    // Check for duplication
    const hasAssessmentNameInTestData = result.test_data && 
      (result.test_data.assessmentName || result.test_data.assessment_name);
    
    console.log('\n🔍 Duplication Check:');
    console.log('- assessment_name column:', result.assessment_name);
    console.log('- test_data.assessmentName:', result.test_data?.assessmentName || 'NOT FOUND');
    console.log('- test_data.assessment_name:', result.test_data?.assessment_name || 'NOT FOUND');
    
    if (hasAssessmentNameInTestData) {
      console.error('\n❌ DUPLICATION FOUND: assessmentName exists in test_data');
      console.error('   test_data.assessmentName:', result.test_data.assessmentName);
      console.error('   test_data.assessment_name:', result.test_data.assessment_name);
      return false;
    } else {
      console.log('\n✅ NO DUPLICATION: assessmentName only in assessment_name column');
      console.log('✅ test_data contains only assessment data without assessment name');
      
      // Show test_data structure
      console.log('\n📋 test_data structure:');
      if (result.test_data) {
        Object.keys(result.test_data).forEach(key => {
          if (typeof result.test_data[key] === 'object') {
            console.log(`- ${key}: object with ${Object.keys(result.test_data[key]).length} properties`);
          } else {
            console.log(`- ${key}: ${typeof result.test_data[key]}`);
          }
        });
      }
      
      return true;
    }
  } catch (error) {
    console.error('❌ Result check failed:', error.response?.data?.error?.message || error.message);
    return false;
  }
}

async function checkLatestResults() {
  console.log('\n📋 Checking latest results...');
  try {
    const response = await axios.get(`${BASE_URL}/archive/results?limit=5&sort=created_at&order=DESC`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const results = response.data.data.results;
    console.log(`Found ${results.length} recent results`);
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      console.log(`\n--- Result ${i + 1} ---`);
      console.log('ID:', result.id);
      console.log('Assessment Name:', result.assessment_name);
      console.log('Created:', result.created_at);
      console.log('Status:', result.status);
    }
    
    return results;
  } catch (error) {
    console.error('❌ Failed to get latest results:', error.response?.data?.error?.message || error.message);
    return [];
  }
}

async function main() {
  console.log('🧪 Checking Assessment Name Duplication Fix');
  console.log('===========================================');
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    process.exit(1);
  }
  
  // Step 2: Check latest results
  const results = await checkLatestResults();
  
  // Step 3: Check specific result if available
  if (RESULT_ID) {
    const isFixed = await checkResult(RESULT_ID);
    
    console.log('\n🏁 Test Results:');
    console.log('================');
    if (isFixed) {
      console.log('✅ PASS: Assessment name duplication is fixed');
      console.log('✅ Assessment name only exists in assessment_name column');
      console.log('✅ test_data contains only assessment data');
    } else {
      console.log('❌ FAIL: Assessment name duplication still exists');
    }
  } else if (results.length > 0) {
    // Check the most recent result
    const latestResult = results[0];
    const isFixed = await checkResult(latestResult.id);
    
    console.log('\n🏁 Test Results:');
    console.log('================');
    if (isFixed) {
      console.log('✅ PASS: Assessment name duplication is fixed');
    } else {
      console.log('❌ FAIL: Assessment name duplication still exists');
    }
  } else {
    console.log('\n⚠️  No results found to check');
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
