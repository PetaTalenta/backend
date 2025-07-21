// Assessment flow testing for ATMA
const { makeRequest, displayResponse } = require('./test-helpers');
const { API_GATEWAY_URL, assessmentData } = require('./test-config');
const { setAssessmentSubmissionTime } = require('./test-websocket-flow');

// Test submit assessment
async function testSubmitAssessment(authToken) {
  console.log('\n=== 8. SUBMIT ASSESSMENT ===');

  if (!authToken) {
    console.log('❌ No auth token available');
    return { success: false };
  }

  console.log('Submitting assessment data...');

  // Record submission time for timing measurement
  setAssessmentSubmissionTime();

  const result = await makeRequest('POST', `${API_GATEWAY_URL}/api/assessment/submit`, assessmentData, {
    'Authorization': `Bearer ${authToken}`
  });

  displayResponse('Submit Assessment Result:', result);

  if (result.success && result.data.data?.jobId) {
    const jobId = result.data.data.jobId;
    console.log(`\n✅ Job ID saved: ${jobId}`);
    return { success: true, jobId };
  }

  return { success: false };
}

// Test get job from archive
async function testGetJobFromArchive(authToken, jobId) {
  console.log('\n=== 10. GET JOB FROM ARCHIVE ===');

  if (!jobId) {
    console.log('❌ No job ID available');
    return false;
  }

  console.log(`Getting job details for: ${jobId}`);
  const result = await makeRequest('GET', `${API_GATEWAY_URL}/api/archive/jobs/${jobId}`, null, {
    'Authorization': `Bearer ${authToken}`
  });

  // Custom display for job details to match EX_API_DOCS.md format
  console.log('\nGet Job Result:');
  console.log('Status:', result.success ? '✅ SUCCESS' : '❌ FAILED');
  console.log('HTTP Status:', result.status);

  if (result.success && result.data) {
    if (result.data.success !== undefined) {
      console.log('API Success:', result.data.success ? '✅' : '❌');
    }

    if (result.data.data) {
      console.log('Job Details:');
      console.log(`  ID: ${result.data.data.id || 'N/A'}`);
      console.log(`  Job ID: ${result.data.data.job_id || 'N/A'}`);
      console.log(`  User ID: ${result.data.data.user_id || 'N/A'}`);
      console.log(`  Status: ${result.data.data.status || 'N/A'}`);
      console.log(`  Priority: ${result.data.data.priority || 'N/A'}`);
      console.log(`  Retry Count: ${result.data.data.retry_count || 'N/A'}`);
      console.log(`  Max Retries: ${result.data.data.max_retries || 'N/A'}`);
      console.log(`  Result ID: ${result.data.data.result_id || 'N/A'}`);
      console.log(`  Created: ${result.data.data.created_at || 'N/A'}`);
      console.log(`  Updated: ${result.data.data.updated_at || 'N/A'}`);
    }

    // Only show full response in debug mode
    if (process.env.DEBUG_RESPONSE === 'true') {
      console.log('\n=== FULL RESPONSE (DEBUG) ===');
      console.log(JSON.stringify(result.data, null, 2));
      console.log('=== END DEBUG ===');
    }
  } else {
    console.log('Error Details:');
    if (result.data.message) {
      console.log(`  Message: ${result.data.message}`);
    }
    if (result.data.error) {
      console.log(`  Error: ${result.data.error}`);
    }

    if (process.env.DEBUG_RESPONSE === 'true') {
      console.log('\n=== FULL ERROR RESPONSE (DEBUG) ===');
      console.log(JSON.stringify(result.data, null, 2));
      console.log('=== END DEBUG ===');
    }
  }

  return result.success;
}

// Submit assessment for mass testing
async function submitAssessmentForUser(userResult, delay = 0) {
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  if (!userResult.success) {
    return { success: false, userIndex: userResult.userIndex, error: 'User login failed' };
  }

  const { userIndex, authToken, userId } = userResult;
  const startTime = Date.now();

  try {
    console.log(`[User ${userIndex}] Submitting assessment...`);

    // Record submission time for timing measurement
    const submissionTime = Date.now();
    console.log(`[User ${userIndex}] ⏱️  Assessment submission started at: ${new Date(submissionTime).toISOString()}`);

    // Submit assessment
    const submitResult = await makeRequest('POST', `${API_GATEWAY_URL}/api/assessment/submit`, assessmentData, {
      'Authorization': `Bearer ${authToken}`
    });

    if (!submitResult.success) {
      console.log(`[User ${userIndex}] Assessment submission failed:`, submitResult.data?.message || 'Unknown error');
      return { success: false, userIndex, error: 'Assessment submission failed', userResult };
    }

    const jobId = submitResult.data.data?.jobId;
    if (!jobId) {
      console.log(`[User ${userIndex}] No job ID received from assessment submission`);
      return { success: false, userIndex, error: 'No job ID received', userResult };
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`[User ${userIndex}] ✅ Assessment submitted in ${duration}ms, Job ID: ${jobId}`);

    return {
      success: true,
      userIndex,
      userId,
      authToken,
      jobId,
      duration,
      submissionTime,
      userResult
    };

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`[User ${userIndex}] ❌ Assessment submission failed after ${duration}ms:`, error.message);
    return { success: false, userIndex, error: error.message, userResult, duration };
  }
}

// Wait for job completion by polling
async function waitForJobCompletion(assessmentResult, timeout = 300000) {
  if (!assessmentResult.success) {
    return { success: false, userIndex: assessmentResult.userIndex, error: 'Assessment submission failed' };
  }

  const { userIndex, jobId, authToken } = assessmentResult;
  const startTime = Date.now();

  try {
    console.log(`[User ${userIndex}] Waiting for job completion: ${jobId}`);

    // Poll job status until completion or timeout
    while (Date.now() - startTime < timeout) {
      const statusResult = await makeRequest('GET', `${API_GATEWAY_URL}/api/archive/jobs/${jobId}`, null, {
        'Authorization': `Bearer ${authToken}`
      });

      if (statusResult.success && statusResult.data.data) {
        const job = statusResult.data.data;

        if (job.status === 'completed') {
          const endTime = Date.now();
          const duration = endTime - startTime;

          console.log(`[User ${userIndex}] ✅ Job completed in ${duration}ms, Result ID: ${job.result_id}`);

          return {
            success: true,
            userIndex,
            jobId,
            resultId: job.result_id,
            duration,
            assessmentResult
          };
        } else if (job.status === 'failed') {
          console.log(`[User ${userIndex}] ❌ Job failed: ${job.error_message || 'Unknown error'}`);
          return { success: false, userIndex, error: 'Job failed', assessmentResult };
        }
      }

      // Wait 2 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Timeout reached
    console.log(`[User ${userIndex}] ⏰ Job completion timeout after ${timeout}ms`);
    return { success: false, userIndex, error: 'Job completion timeout', assessmentResult };

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`[User ${userIndex}] ❌ Error waiting for job completion after ${duration}ms:`, error.message);
    return { success: false, userIndex, error: error.message, assessmentResult, duration };
  }
}

// Complete assessment flow test
async function runAssessmentFlow(authToken) {
  console.log('🚀 Starting ATMA Assessment Flow Test');
  console.log('=====================================');

  try {
    // Submit assessment
    const submitResult = await testSubmitAssessment(authToken);
    if (!submitResult.success) {
      console.log('\n❌ Assessment submission failed');
      return { success: false, error: 'Assessment submission failed' };
    }

    const { jobId } = submitResult;

    // Get final job details from archive
    await testGetJobFromArchive(authToken, jobId);

    console.log('\n🎉 Assessment Flow Test Completed!');
    console.log('==================================');

    return {
      success: true,
      jobId
    };

  } catch (error) {
    console.error('\n💥 Assessment flow test failed:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  testSubmitAssessment,
  testGetJobFromArchive,
  submitAssessmentForUser,
  waitForJobCompletion,
  runAssessmentFlow
};
