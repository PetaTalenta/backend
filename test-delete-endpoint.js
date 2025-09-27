#!/usr/bin/env node

/**
 * Test script to check failed assessments and test delete endpoint
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

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

async function getAllResults() {
  console.log('\n📋 Getting all results...');
  try {
    const response = await axios.get(`${BASE_URL}/archive/results?limit=50&sort=created_at&order=DESC`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const results = response.data.data.results;
    console.log(`Found ${results.length} total results`);
    
    // Group by status
    const byStatus = results.reduce((acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📊 Results by status:', byStatus);
    
    return results;
  } catch (error) {
    console.error('❌ Failed to get results:', error.response?.data?.error?.message || error.message);
    return [];
  }
}

async function getFailedResults() {
  console.log('\n🔍 Getting failed results...');
  try {
    const response = await axios.get(`${BASE_URL}/archive/results?status=failed&limit=20&sort=created_at&order=DESC`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const results = response.data.data.results;
    console.log(`Found ${results.length} failed results`);
    
    results.forEach((result, index) => {
      console.log(`\n--- Failed Result ${index + 1} ---`);
      console.log('ID:', result.id);
      console.log('Assessment Name:', result.assessment_name);
      console.log('Created:', result.created_at);
      console.log('Status:', result.status);
      console.log('Error:', result.error_message || 'No error message');
    });
    
    return results;
  } catch (error) {
    console.error('❌ Failed to get failed results:', error.response?.data?.error?.message || error.message);
    return [];
  }
}

async function deleteResult(resultId) {
  console.log(`\n🗑️  Attempting to delete result ${resultId}...`);
  try {
    const response = await axios.delete(`${BASE_URL}/archive/results/${resultId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    console.log('✅ Delete successful');
    console.log('Response:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Delete failed:', error.response?.data?.error?.message || error.message);
    console.error('Status:', error.response?.status);
    console.error('Full error:', error.response?.data);
    return false;
  }
}

async function verifyDeletion(resultId) {
  console.log(`\n🔍 Verifying deletion of result ${resultId}...`);
  try {
    const response = await axios.get(`${BASE_URL}/archive/results/${resultId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    console.log('❌ Result still exists (deletion failed)');
    return false;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('✅ Result successfully deleted (404 Not Found)');
      return true;
    } else {
      console.error('❌ Unexpected error during verification:', error.response?.data?.error?.message || error.message);
      return false;
    }
  }
}

async function getFailedJobs() {
  console.log('\n📋 Getting failed jobs...');
  try {
    const response = await axios.get(`${BASE_URL}/archive/jobs?status=failed&limit=20&sort=created_at&order=DESC`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const jobs = response.data.data.jobs;
    console.log(`Found ${jobs.length} failed jobs`);
    
    jobs.forEach((job, index) => {
      console.log(`\n--- Failed Job ${index + 1} ---`);
      console.log('ID:', job.id);
      console.log('Job ID:', job.job_id);
      console.log('Assessment Name:', job.assessment_name);
      console.log('Created:', job.created_at);
      console.log('Status:', job.status);
      console.log('Error:', job.error_message || 'No error message');
      console.log('Result ID:', job.result_id || 'No result');
    });
    
    return jobs;
  } catch (error) {
    console.error('❌ Failed to get failed jobs:', error.response?.data?.error?.message || error.message);
    return [];
  }
}

async function deleteJob(jobId) {
  console.log(`\n🗑️  Attempting to delete job ${jobId}...`);
  try {
    const response = await axios.delete(`${BASE_URL}/archive/jobs/${jobId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    console.log('✅ Job delete successful');
    console.log('Response:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Job delete failed:', error.response?.data?.error?.message || error.message);
    console.error('Status:', error.response?.status);
    return false;
  }
}

async function main() {
  console.log('🧪 Testing Delete Endpoints and Cleaning Failed Assessments');
  console.log('===========================================================');
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    process.exit(1);
  }
  
  // Step 2: Get overview of all results
  const allResults = await getAllResults();
  
  // Step 3: Get failed results
  const failedResults = await getFailedResults();
  
  // Step 4: Get failed jobs
  const failedJobs = await getFailedJobs();
  
  // Step 5: Test delete endpoint with failed results
  if (failedResults.length > 0) {
    console.log('\n🧹 Testing delete endpoint with failed results...');
    
    for (let i = 0; i < Math.min(3, failedResults.length); i++) {
      const result = failedResults[i];
      console.log(`\n--- Deleting Failed Result ${i + 1} ---`);
      
      const deleteSuccess = await deleteResult(result.id);
      if (deleteSuccess) {
        await verifyDeletion(result.id);
      }
      
      // Wait a bit between deletions
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } else {
    console.log('\n✅ No failed results found to delete');
  }
  
  // Step 6: Test delete endpoint with failed jobs
  if (failedJobs.length > 0) {
    console.log('\n🧹 Testing delete endpoint with failed jobs...');
    
    for (let i = 0; i < Math.min(3, failedJobs.length); i++) {
      const job = failedJobs[i];
      console.log(`\n--- Deleting Failed Job ${i + 1} ---`);
      
      await deleteJob(job.job_id);
      
      // Wait a bit between deletions
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } else {
    console.log('\n✅ No failed jobs found to delete');
  }
  
  // Step 7: Final summary
  console.log('\n📊 Final Summary');
  console.log('================');
  const finalResults = await getAllResults();
  
  console.log('\n🏁 Test Results:');
  console.log('================');
  console.log('✅ Delete endpoints tested successfully');
  console.log(`📊 Total results before: ${allResults.length}`);
  console.log(`📊 Total results after: ${finalResults.length}`);
  console.log(`🧹 Results cleaned: ${allResults.length - finalResults.length}`);
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
