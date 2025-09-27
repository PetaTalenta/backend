#!/usr/bin/env node

/**
 * Test script untuk memverifikasi cascade delete result -> job
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
    return false;
  }
}

async function getJobsWithResults() {
  console.log('\n📋 Getting jobs with results...');
  try {
    const response = await axios.get(`${ARCHIVE_URL}/archive/jobs`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      params: { limit: 5 }
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

async function testDeleteResult(resultId) {
  console.log(`\n🗑️ Testing delete result ${resultId}...`);
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

async function checkJobExists(jobId) {
  console.log(`\n🔍 Checking if job ${jobId} still exists...`);
  try {
    const response = await axios.get(`${ARCHIVE_URL}/archive/jobs/${jobId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    console.log('✅ Job still exists:', response.data.data);
    return true;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('✅ Job has been deleted (as expected)');
      return false;
    }
    console.error('❌ Error checking job:', error.response?.data?.error?.message || error.message);
    return null;
  }
}

async function main() {
  console.log('🧪 Testing Result Delete -> Job Cascade Delete\n');
  
  // Authenticate
  if (!await authenticate()) {
    process.exit(1);
  }
  
  // Get jobs with results
  const jobs = await getJobsWithResults();
  
  // Find a job with result_id
  const jobWithResult = jobs.find(job => job.result_id);
  
  if (!jobWithResult) {
    console.log('❌ No jobs with results found for testing');
    process.exit(1);
  }
  
  console.log(`\n🎯 Testing with job ${jobWithResult.job_id} and result ${jobWithResult.result_id}`);
  
  // Delete the result
  const deleteSuccess = await testDeleteResult(jobWithResult.result_id);
  
  if (deleteSuccess) {
    // Check if job still exists (should be deleted)
    await checkJobExists(jobWithResult.job_id);
  }
  
  console.log('\n✅ Test completed!');
}

// Run the test
main().catch(error => {
  console.error('💥 Test failed:', error.message);
  process.exit(1);
});
