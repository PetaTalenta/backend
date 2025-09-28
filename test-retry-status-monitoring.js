#!/usr/bin/env node

/**
 * Comprehensive test for retry endpoint status monitoring
 * Tests that both job and result status are properly updated during retry process
 */

const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');

const BASE_URL = 'http://localhost:3000/api';
const execAsync = util.promisify(exec);

// Test user credentials
const TEST_USER = {
  email: 'kasykoi@gmail.com',
  password: 'Anjas123'
};

let authToken = null;

/**
 * Get authentication token
 */
async function login() {
  console.log('🔐 Getting authentication token...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    authToken = response.data.data.token;
    console.log('✅ Authentication successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.error?.message || error.message);
    return false;
  }
}

/**
 * Query database to get job and result status
 */
async function getJobAndResultStatus(jobId, resultId = null) {
  try {
    let query;
    if (resultId) {
      query = `
        SELECT 
          j.job_id,
          j.status as job_status,
          j.result_id as job_result_id,
          r.id as result_id,
          r.status as result_status,
          r.test_result IS NOT NULL as has_test_result,
          r.error_message as result_error,
          j.error_message as job_error,
          j.updated_at as job_updated,
          r.updated_at as result_updated
        FROM archive.analysis_jobs j
        LEFT JOIN archive.analysis_results r ON r.id = '${resultId}'
        WHERE j.job_id = '${jobId}';
      `;
    } else {
      query = `
        SELECT 
          j.job_id,
          j.status as job_status,
          j.result_id as job_result_id,
          r.id as result_id,
          r.status as result_status,
          r.test_result IS NOT NULL as has_test_result,
          r.error_message as result_error,
          j.error_message as job_error,
          j.updated_at as job_updated,
          r.updated_at as result_updated
        FROM archive.analysis_jobs j
        LEFT JOIN archive.analysis_results r ON j.result_id = r.id
        WHERE j.job_id = '${jobId}';
      `;
    }

    const { stdout } = await execAsync(`docker exec atma-postgres psql -U atma_user -d atma_db -t -c "${query}"`);
    
    if (stdout.trim()) {
      const parts = stdout.trim().split('|').map(p => p.trim());
      return {
        jobId: parts[0],
        jobStatus: parts[1],
        jobResultId: parts[2] || null,
        resultId: parts[3] || null,
        resultStatus: parts[4] || null,
        hasTestResult: parts[5] === 't',
        resultError: parts[6] || null,
        jobError: parts[7] || null,
        jobUpdated: parts[8],
        resultUpdated: parts[9]
      };
    }
    return null;
  } catch (error) {
    console.error('❌ Database query failed:', error.message);
    return null;
  }
}

/**
 * Create a test scenario by submitting an assessment first, then making it fail
 */
async function createTestScenario() {
  console.log('\n📝 Creating test scenario...');
  
  // Submit a new assessment
  const assessmentData = {
    assessment_name: "AI-Driven Talent Mapping",
    assessment_data: {
      riasec: {
        realistic: 3.2, investigative: 4.1, artistic: 2.8,
        social: 4.5, enterprising: 3.7, conventional: 2.9
      },
      ocean: {
        openness: 4.2, conscientiousness: 3.8, extraversion: 3.5,
        agreeableness: 4.0, neuroticism: 2.7
      },
      viaIs: {
        wisdom: 4, courage: 3, humanity: 4, justice: 4, temperance: 3, transcendence: 3
      }
    }
  };

  try {
    const response = await axios.post(`${BASE_URL}/assessment/submit`, assessmentData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `test-retry-${Date.now()}`
      }
    });

    const jobId = response.data.data.jobId;
    console.log(`✅ Assessment submitted with job ID: ${jobId}`);
    
    // Wait a bit for the job to start processing
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Now let's manually mark it as failed for testing
    await execAsync(`docker exec atma-postgres psql -U atma_user -d atma_db -c "
      UPDATE archive.analysis_jobs 
      SET status = 'failed', error_message = 'Test failure for retry testing'
      WHERE job_id = '${jobId}';
    "`);

    // Also create a result record with failed status
    const createResultQuery = `
      INSERT INTO archive.analysis_results (user_id, test_data, status, error_message, assessment_name)
      SELECT user_id, '{"test": "data"}'::jsonb, 'failed', 'Test failure', 'AI-Driven Talent Mapping'
      FROM archive.analysis_jobs 
      WHERE job_id = '${jobId}'
      RETURNING id;
    `;
    
    const { stdout } = await execAsync(`docker exec atma-postgres psql -U atma_user -d atma_db -t -c "${createResultQuery}"`);
    const resultId = stdout.trim();

    // Link the result to the job
    await execAsync(`docker exec atma-postgres psql -U atma_user -d atma_db -c "
      UPDATE archive.analysis_jobs 
      SET result_id = '${resultId}' 
      WHERE job_id = '${jobId}';
    "`);

    console.log(`✅ Created failed scenario - Job: ${jobId}, Result: ${resultId}`);
    return { jobId, resultId };
    
  } catch (error) {
    console.error('❌ Failed to create test scenario:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Monitor status during retry process
 */
async function monitorRetryProcess(jobId, resultId) {
  console.log('\n🔄 Starting retry process monitoring...');
  
  // Check initial status
  console.log('\n📊 Initial Status:');
  let status = await getJobAndResultStatus(jobId, resultId);
  if (status) {
    console.log(`   Job Status: ${status.jobStatus}`);
    console.log(`   Result Status: ${status.resultStatus}`);
    console.log(`   Has Test Result: ${status.hasTestResult}`);
  }

  // Trigger retry
  console.log('\n🔄 Triggering retry...');
  try {
    const retryResponse = await axios.post(`${BASE_URL}/assessment/retry`, 
      { jobId },
      {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Retry endpoint successful!');
    console.log('📋 Response:', JSON.stringify(retryResponse.data, null, 2));
    
    // Check status immediately after retry  
    console.log('\n📊 Status immediately after retry:');
    status = await getJobAndResultStatus(jobId, resultId);
    if (status) {
      console.log(`   Job Status: ${status.jobStatus}`);
      console.log(`   Result Status: ${status.resultStatus}`);
      console.log(`   Has Test Result: ${status.hasTestResult}`);
      console.log(`   Job Updated: ${status.jobUpdated}`);
      console.log(`   Result Updated: ${status.resultUpdated}`);
    }

    // Monitor processing for completion
    console.log('\n⏳ Monitoring processing status...');
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;
      
      status = await getJobAndResultStatus(jobId, resultId);
      if (status) {
        console.log(`📊 Status check ${attempts}/${maxAttempts}:`);
        console.log(`   Job Status: ${status.jobStatus}`);
        console.log(`   Result Status: ${status.resultStatus}`);
        console.log(`   Has Test Result: ${status.hasTestResult}`);
        
        // Check if completed
        if (status.jobStatus === 'completed' && status.resultStatus === 'completed') {
          console.log('✅ Analysis completed successfully!');
          console.log(`   Final Job Status: ${status.jobStatus}`);
          console.log(`   Final Result Status: ${status.resultStatus}`);
          console.log(`   Has Test Result: ${status.hasTestResult}`);
          break;
        } else if (status.jobStatus === 'failed' || status.resultStatus === 'failed') {
          console.log('❌ Analysis failed again');
          console.log(`   Job Error: ${status.jobError}`);
          console.log(`   Result Error: ${status.resultError}`);
          break;
        }
      }
    }
    
    if (attempts >= maxAttempts) {
      console.log('⚠️ Monitoring timed out');
    }
    
  } catch (error) {
    console.error('❌ Retry failed:');
    console.error('Status:', error.response?.status);
    console.error('Error:', JSON.stringify(error.response?.data, null, 2));
  }
}

/**
 * Test with existing failed assessment
 */
async function testExistingFailedAssessment() {
  console.log('\n🔍 Testing with existing failed result...');
  
  // Use the existing failed result we found
  const existingResultId = 'd7c3efe2-5d5a-4742-b7c6-5f39596468fd';
  const existingUserId = 'a577cbc8-dd04-4ecd-bad9-7d485fee9020';
  
  // First, create a job for this result
  const jobId = `job-retry-test-${Date.now()}`;
  
  try {
    await execAsync(`docker exec atma-postgres psql -U atma_user -d atma_db -c "
      INSERT INTO archive.analysis_jobs (job_id, user_id, status, result_id, error_message, assessment_name)
      VALUES ('${jobId}', '${existingUserId}', 'failed', '${existingResultId}', 'Test failure for retry', 'AI-Driven Talent Mapping');
    "`);
    
    console.log(`✅ Created test job ${jobId} linked to existing failed result`);
    
    // Now monitor the retry process
    await monitorRetryProcess(jobId, existingResultId);
    
  } catch (error) {
    console.error('❌ Failed to create test job:', error.message);
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('🧪 Comprehensive Retry Endpoint Status Monitoring Test');
  console.log('=====================================================');
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    process.exit(1);
  }
  
  // Step 2: Test with existing failed assessment
  await testExistingFailedAssessment();
  
  // Step 3: Create and test new scenario
  const scenario = await createTestScenario();
  if (scenario) {
    await monitorRetryProcess(scenario.jobId, scenario.resultId);
  }
  
  console.log('\n✅ Test completed!');
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
