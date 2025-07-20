// Assessment Name Feature Testing for ATMA
const { makeRequest, displayResponse } = require('./test-helpers');
const { API_GATEWAY_URL } = require('./test-config');
const { runAuthFlow } = require('./test-auth-flow');
const { regenerateTestUser } = require('./test-config');

// Test assessment data with different assessment names
const assessmentDataBase = {
  riasec: {
    realistic: 75,
    investigative: 85,
    artistic: 60,
    social: 50,
    enterprising: 70,
    conventional: 55
  },
  ocean: {
    conscientiousness: 65,
    extraversion: 55,
    agreeableness: 45,
    neuroticism: 30,
    openness: 80
  },
  viaIs: {
    creativity: 85,
    curiosity: 78,
    judgment: 70,
    loveOfLearning: 82,
    perspective: 60,
    bravery: 65,
    perseverance: 70,
    honesty: 75,
    zest: 60,
    love: 55,
    kindness: 68,
    socialIntelligence: 72,
    teamwork: 65,
    fairness: 70,
    leadership: 60,
    forgiveness: 55,
    humility: 50,
    prudence: 65,
    selfRegulation: 70,
    appreciationOfBeauty: 75,
    gratitude: 80,
    hope: 70,
    humor: 65,
    spirituality: 45
  }
};

// Test submit assessment with specific assessment name
async function testSubmitAssessmentWithName(authToken, assessmentName) {
  console.log(`\n=== SUBMIT ASSESSMENT WITH NAME: ${assessmentName} ===`);

  if (!authToken) {
    console.log('❌ No auth token available');
    return { success: false };
  }

  const assessmentData = {
    ...assessmentDataBase,
    assessmentName: assessmentName
  };

  console.log(`Submitting assessment with name: ${assessmentName}`);

  const result = await makeRequest('POST', `${API_GATEWAY_URL}/api/assessment/submit`, assessmentData, {
    'Authorization': `Bearer ${authToken}`
  });

  displayResponse(`Submit Assessment (${assessmentName}) Result:`, result);

  if (result.success && result.data.data?.jobId) {
    const jobId = result.data.data.jobId;
    console.log(`✅ Job ID saved: ${jobId}`);
    return { success: true, jobId, assessmentName };
  }

  return { success: false };
}

// Test submit assessment without assessment name (should use default)
async function testSubmitAssessmentWithoutName(authToken) {
  console.log(`\n=== SUBMIT ASSESSMENT WITHOUT NAME (DEFAULT) ===`);

  if (!authToken) {
    console.log('❌ No auth token available');
    return { success: false };
  }

  console.log('Submitting assessment without assessmentName field (should default to AI-Driven Talent Mapping)');

  const result = await makeRequest('POST', `${API_GATEWAY_URL}/api/assessment/submit`, assessmentDataBase, {
    'Authorization': `Bearer ${authToken}`
  });

  displayResponse('Submit Assessment (Default) Result:', result);

  if (result.success && result.data.data?.jobId) {
    const jobId = result.data.data.jobId;
    console.log(`✅ Job ID saved: ${jobId}`);
    return { success: true, jobId, assessmentName: 'AI-Driven Talent Mapping' };
  }

  return { success: false };
}

// Test get job and verify assessment name
async function testGetJobAndVerifyAssessmentName(authToken, jobId, expectedAssessmentName) {
  console.log(`\n=== VERIFY JOB ASSESSMENT NAME: ${expectedAssessmentName} ===`);

  if (!jobId) {
    console.log('❌ No job ID available');
    return false;
  }

  console.log(`Getting job details for: ${jobId}`);
  const result = await makeRequest('GET', `${API_GATEWAY_URL}/api/archive/jobs/${jobId}`, null, {
    'Authorization': `Bearer ${authToken}`
  });

  console.log('\nGet Job Result:');
  console.log('Status:', result.success ? '✅ SUCCESS' : '❌ FAILED');
  console.log('HTTP Status:', result.status);

  if (result.success && result.data && result.data.data) {
    const job = result.data.data;
    console.log('Job Details:');
    console.log(`  Job ID: ${job.job_id || 'N/A'}`);
    console.log(`  Status: ${job.status || 'N/A'}`);
    console.log(`  Assessment Name: ${job.assessment_name || 'N/A'}`);
    console.log(`  Expected: ${expectedAssessmentName}`);

    // Verify assessment name
    if (job.assessment_name === expectedAssessmentName) {
      console.log('✅ Assessment name matches expected value');
      return true;
    } else {
      console.log('❌ Assessment name does not match expected value');
      return false;
    }
  } else {
    console.log('❌ Failed to get job details');
    return false;
  }
}

// Wait for job completion and get result with assessment name
async function waitForJobAndGetResult(authToken, jobId, expectedAssessmentName, timeout = 120000) {
  console.log(`\n=== WAIT FOR JOB COMPLETION AND GET RESULT ===`);
  
  const startTime = Date.now();
  
  // Poll job status until completion or timeout
  while (Date.now() - startTime < timeout) {
    const statusResult = await makeRequest('GET', `${API_GATEWAY_URL}/api/archive/jobs/${jobId}`, null, {
      'Authorization': `Bearer ${authToken}`
    });

    if (statusResult.success && statusResult.data.data) {
      const job = statusResult.data.data;

      if (job.status === 'completed') {
        console.log(`✅ Job completed, Result ID: ${job.result_id}`);
        
        // Get the result and verify assessment name
        if (job.result_id) {
          const resultResponse = await makeRequest('GET', `${API_GATEWAY_URL}/api/archive/results/${job.result_id}`, null, {
            'Authorization': `Bearer ${authToken}`
          });
          
          if (resultResponse.success && resultResponse.data.data) {
            const result = resultResponse.data.data;
            console.log('Result Details:');
            console.log(`  Result ID: ${result.id || 'N/A'}`);
            console.log(`  Status: ${result.status || 'N/A'}`);
            console.log(`  Assessment Name: ${result.assessment_name || 'N/A'}`);
            console.log(`  Expected: ${expectedAssessmentName}`);
            
            if (result.assessment_name === expectedAssessmentName) {
              console.log('✅ Result assessment name matches expected value');
              return { success: true, result };
            } else {
              console.log('❌ Result assessment name does not match expected value');
              return { success: false, error: 'Assessment name mismatch in result' };
            }
          }
        }
        
        return { success: true, job };
      } else if (job.status === 'failed') {
        console.log(`❌ Job failed: ${job.error_message || 'Unknown error'}`);
        return { success: false, error: 'Job failed' };
      }
    }

    // Wait 3 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Timeout reached
  console.log(`⏰ Job completion timeout after ${timeout}ms`);
  return { success: false, error: 'Job completion timeout' };
}

// Test filtering results by assessment name
async function testFilterResultsByAssessmentName(authToken, assessmentName) {
  console.log(`\n=== TEST FILTER RESULTS BY ASSESSMENT NAME: ${assessmentName} ===`);

  const result = await makeRequest('GET', `${API_GATEWAY_URL}/api/archive/results?assessment_name=${encodeURIComponent(assessmentName)}`, null, {
    'Authorization': `Bearer ${authToken}`
  });

  displayResponse(`Filter Results by Assessment Name (${assessmentName}):`, result);

  if (result.success && result.data.data) {
    const results = result.data.data;
    console.log(`Found ${results.length} results for assessment name: ${assessmentName}`);
    
    // Verify all results have the correct assessment name
    let allMatch = true;
    results.forEach((res, index) => {
      if (res.assessment_name !== assessmentName) {
        console.log(`❌ Result ${index} has wrong assessment name: ${res.assessment_name}`);
        allMatch = false;
      }
    });
    
    if (allMatch) {
      console.log('✅ All filtered results have correct assessment name');
      return true;
    } else {
      console.log('❌ Some filtered results have incorrect assessment name');
      return false;
    }
  }

  return false;
}

// Main test function for assessment name feature
async function runAssessmentNameTests() {
  console.log('🚀 Starting ATMA Assessment Name Feature Tests');
  console.log('==============================================');

  try {
    // Generate new test user
    const { testUser, profileData } = regenerateTestUser();

    // Run authentication flow
    const authResult = await runAuthFlow(testUser, profileData);
    if (!authResult.success) {
      console.log('\n❌ Authentication failed. Cannot proceed with assessment name tests.');
      return;
    }

    const { authToken } = authResult;
    const testResults = [];

    // Test 1: Submit assessment with 'AI-Driven Talent Mapping'
    console.log('\n📝 Test 1: Submit with AI-Driven Talent Mapping');
    const test1 = await testSubmitAssessmentWithName(authToken, 'AI-Driven Talent Mapping');
    if (test1.success) {
      const verify1 = await testGetJobAndVerifyAssessmentName(authToken, test1.jobId, 'AI-Driven Talent Mapping');
      testResults.push({ test: 'AI-Driven Talent Mapping', success: verify1 });
    }

    // Test 2: Submit assessment with 'AI-Based IQ Test'
    console.log('\n📝 Test 2: Submit with AI-Based IQ Test');
    const test2 = await testSubmitAssessmentWithName(authToken, 'AI-Based IQ Test');
    if (test2.success) {
      const verify2 = await testGetJobAndVerifyAssessmentName(authToken, test2.jobId, 'AI-Based IQ Test');
      testResults.push({ test: 'AI-Based IQ Test', success: verify2 });
    }

    // Test 3: Submit assessment with 'Custom Assessment'
    console.log('\n📝 Test 3: Submit with Custom Assessment');
    const test3 = await testSubmitAssessmentWithName(authToken, 'Custom Assessment');
    if (test3.success) {
      const verify3 = await testGetJobAndVerifyAssessmentName(authToken, test3.jobId, 'Custom Assessment');
      testResults.push({ test: 'Custom Assessment', success: verify3 });
    }

    // Test 4: Submit assessment without assessment name (should default)
    console.log('\n📝 Test 4: Submit without assessment name (default)');
    const test4 = await testSubmitAssessmentWithoutName(authToken);
    if (test4.success) {
      const verify4 = await testGetJobAndVerifyAssessmentName(authToken, test4.jobId, 'AI-Driven Talent Mapping');
      testResults.push({ test: 'Default (no name)', success: verify4 });
    }

    // Test 5: Wait for one job to complete and verify result assessment name
    if (test1.success) {
      console.log('\n📝 Test 5: Wait for job completion and verify result assessment name');
      const completionResult = await waitForJobAndGetResult(authToken, test1.jobId, 'AI-Driven Talent Mapping');
      testResults.push({ test: 'Result assessment name', success: completionResult.success });
    }

    // Test 6: Filter results by assessment name
    console.log('\n📝 Test 6: Filter results by assessment name');
    const filterResult = await testFilterResultsByAssessmentName(authToken, 'AI-Driven Talent Mapping');
    testResults.push({ test: 'Filter by assessment name', success: filterResult });

    // Summary
    console.log('\n🎉 Assessment Name Feature Tests Completed!');
    console.log('==========================================');
    console.log('Test Results Summary:');
    testResults.forEach(result => {
      console.log(`  ${result.test}: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
    });

    const passedTests = testResults.filter(r => r.success).length;
    const totalTests = testResults.length;
    console.log(`\nOverall: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
      console.log('🎊 All assessment name tests PASSED!');
    } else {
      console.log('⚠️ Some assessment name tests FAILED!');
    }

  } catch (error) {
    console.error('\n💥 Assessment name test execution failed:', error.message);
  }
}

module.exports = {
  testSubmitAssessmentWithName,
  testSubmitAssessmentWithoutName,
  testGetJobAndVerifyAssessmentName,
  waitForJobAndGetResult,
  testFilterResultsByAssessmentName,
  runAssessmentNameTests
};
