#!/usr/bin/env node

/**
 * Test script untuk memverifikasi konsistensi status antara jobs dan results
 * serta functionality cascade delete
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:3001';
const ARCHIVE_URL = process.env.ARCHIVE_URL || 'http://localhost:3002';
const TEST_EMAIL = 'kasykoi@gmail.com';
const TEST_PASSWORD = 'Anjas123';

let authToken = null;

async function authenticate() {
  console.log('🔐 Authenticating...');
  try {
    const response = await axios.post(`${AUTH_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    authToken = response.data.data.token;
    console.log('✅ Authentication successful');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data?.error?.message || error.message);
    console.error('Status:', error.response?.status);
    console.error('Full response:', error.response?.data);
    return false;
  }
}

async function getJobsWithResults() {
  console.log('\n📋 Getting jobs with results...');
  try {
    const response = await axios.get(`${ARCHIVE_URL}/archive/jobs`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      params: { limit: 10 }
    });

    const jobs = response.data.data.jobs;
    console.log(`✅ Found ${jobs.length} jobs`);

    // Show jobs with their status
    jobs.forEach(job => {
      console.log(`  Job ${job.job_id}: status=${job.status}, result_id=${job.result_id || 'none'}`);
    });

    return jobs;
  } catch (error) {
    console.error('❌ Failed to get jobs:', error.response?.data?.error?.message || error.message);
    return [];
  }
}

async function getResults() {
  console.log('\n📊 Getting results...');
  try {
    const response = await axios.get(`${ARCHIVE_URL}/archive/results`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      params: { limit: 10 }
    });

    const results = response.data.data.results;
    console.log(`✅ Found ${results.length} results`);

    // Show results with their status
    results.forEach(result => {
      console.log(`  Result ${result.id}: status=${result.status}, user_id=${result.user_id}`);
    });

    return results;
  } catch (error) {
    console.error('❌ Failed to get results:', error.response?.data?.error?.message || error.message);
    return [];
  }
}

async function testSyncStatus(jobId) {
  console.log(`\n🔄 Testing status sync for job ${jobId}...`);
  try {
    const response = await axios.post(`${ARCHIVE_URL}/archive/jobs/${jobId}/sync-status`, {}, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Internal-Service': 'true',
        'X-Service-Key': process.env.INTERNAL_SERVICE_KEY || 'f8c1af59d85da6581036e18b4b9e0ec35d1fdefe1a93837d5b4746c9984ea4c1'
      }
    });

    console.log('✅ Status sync successful');
    console.log('Sync actions:', response.data.data.syncActions);
    return response.data.data;
  } catch (error) {
    console.error('❌ Status sync failed:', error.response?.data?.error?.message || error.message);
    return null;
  }
}

async function testCascadeDeleteJob(jobId) {
  console.log(`\n🗑️ Testing cascade delete for job ${jobId}...`);
  try {
    const response = await axios.delete(`${ARCHIVE_URL}/archive/jobs/${jobId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    console.log('✅ Job delete successful');
    console.log('Response:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Job delete failed:', error.response?.data?.error?.message || error.message);
    return false;
  }
}

async function testCascadeDeleteResult(resultId) {
  console.log(`\n🗑️ Testing cascade delete for result ${resultId}...`);
  try {
    const response = await axios.delete(`${ARCHIVE_URL}/archive/results/${resultId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    console.log('✅ Result delete successful');
    console.log('Response:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Result delete failed:', error.response?.data?.error?.message || error.message);
    return false;
  }
}

async function testCleanupOrphanedJobs() {
  console.log('\n🧹 Testing cleanup orphaned jobs...');
  try {
    const response = await axios.post(`${ARCHIVE_URL}/archive/jobs/cleanup-orphaned`, {}, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Internal-Service': 'true',
        'X-Service-Key': process.env.INTERNAL_SERVICE_KEY || 'f8c1af59d85da6581036e18b4b9e0ec35d1fdefe1a93837d5b4746c9984ea4c1'
      }
    });

    console.log('✅ Cleanup orphaned jobs successful');
    console.log('Cleanup result:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Cleanup orphaned jobs failed:', error.response?.data?.error?.message || error.message);
    return null;
  }
}

async function checkStatusConsistency(jobs, results) {
  console.log('\n🔍 Checking status consistency...');
  
  const inconsistencies = [];
  
  for (const job of jobs) {
    if (job.result_id) {
      const result = results.find(r => r.id === job.result_id);
      if (result) {
        // Check if statuses are consistent
        const statusMapping = {
          'completed': 'completed',
          'failed': 'failed',
          'processing': 'processing',
          'queued': 'processing',
          'cancelled': 'failed'
        };
        
        const expectedResultStatus = statusMapping[job.status];
        if (result.status !== expectedResultStatus) {
          inconsistencies.push({
            jobId: job.job_id,
            jobStatus: job.status,
            resultId: result.id,
            resultStatus: result.status,
            expectedResultStatus
          });
        }
      } else {
        inconsistencies.push({
          jobId: job.job_id,
          jobStatus: job.status,
          resultId: job.result_id,
          issue: 'result_not_found'
        });
      }
    }
  }
  
  if (inconsistencies.length === 0) {
    console.log('✅ All statuses are consistent');
  } else {
    console.log(`❌ Found ${inconsistencies.length} inconsistencies:`);
    inconsistencies.forEach(inc => {
      console.log(`  Job ${inc.jobId} (${inc.jobStatus}) -> Result ${inc.resultId} (${inc.resultStatus || 'missing'})`);
      if (inc.expectedResultStatus) {
        console.log(`    Expected result status: ${inc.expectedResultStatus}`);
      }
    });
  }
  
  return inconsistencies;
}

async function main() {
  console.log('🧪 Testing Status Consistency and Cascade Delete\n');
  
  // Authenticate
  if (!await authenticate()) {
    process.exit(1);
  }
  
  // Get current data
  const jobs = await getJobsWithResults();
  const results = await getResults();
  
  // Check consistency
  const inconsistencies = await checkStatusConsistency(jobs, results);
  
  // Test sync status if there are inconsistencies
  if (inconsistencies.length > 0) {
    console.log('\n🔧 Testing status sync for inconsistent jobs...');
    for (const inc of inconsistencies.slice(0, 3)) { // Test first 3
      await testSyncStatus(inc.jobId);
    }
  }
  
  // Test cleanup orphaned jobs
  await testCleanupOrphanedJobs();

  // Test cascade delete (only if we have test data)
  const testJobs = jobs.filter(job => job.status === 'failed' || job.status === 'cancelled');
  if (testJobs.length > 0) {
    console.log('\n🧪 Testing cascade delete functionality...');
    const testJob = testJobs[0];
    console.log(`Using job ${testJob.job_id} for cascade delete test`);

    if (testJob.result_id) {
      // Test deleting result (should delete job)
      await testCascadeDeleteResult(testJob.result_id);
    } else {
      // Test deleting job
      await testCascadeDeleteJob(testJob.job_id);
    }
  }

  console.log('\n✅ Test completed!');
}

// Run the test
main().catch(error => {
  console.error('💥 Test failed:', error.message);
  process.exit(1);
});
