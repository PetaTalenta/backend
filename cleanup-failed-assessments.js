#!/usr/bin/env node

/**
 * Script to cleanup failed assessments for kasykoi@gmail.com
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

async function getFailedResults() {
  console.log('\n📋 Getting all failed results...');
  try {
    const response = await axios.get(`${BASE_URL}/archive/results?status=failed&limit=100&sort=created_at&order=DESC`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const results = response.data.data.results;
    console.log(`Found ${results.length} failed results`);
    return results;
  } catch (error) {
    console.error('❌ Failed to get failed results:', error.response?.data?.error?.message || error.message);
    return [];
  }
}

async function deleteResult(resultId) {
  try {
    const response = await axios.delete(`${BASE_URL}/archive/results/${resultId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    return { success: true, message: response.data.message };
  } catch (error) {
    return { 
      success: false, 
      message: error.response?.data?.error?.message || error.message,
      status: error.response?.status 
    };
  }
}

async function deleteJob(jobId) {
  try {
    const response = await axios.delete(`${BASE_URL}/archive/jobs/${jobId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    return { success: true, message: response.data.message };
  } catch (error) {
    return { 
      success: false, 
      message: error.response?.data?.error?.message || error.message,
      status: error.response?.status,
      details: error.response?.data
    };
  }
}

async function getFailedJobs() {
  console.log('\n📋 Getting all failed jobs...');
  try {
    const response = await axios.get(`${BASE_URL}/archive/jobs?status=failed&limit=100&sort=created_at&order=DESC`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const jobs = response.data.data.jobs;
    console.log(`Found ${jobs.length} failed jobs`);
    return jobs;
  } catch (error) {
    console.error('❌ Failed to get failed jobs:', error.response?.data?.error?.message || error.message);
    return [];
  }
}

async function cleanupFailedResults(results) {
  console.log('\n🧹 Cleaning up failed results...');
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    console.log(`\n[${i + 1}/${results.length}] Deleting result ${result.id}...`);
    console.log(`  Created: ${result.created_at}`);
    console.log(`  Assessment: ${result.assessment_name}`);
    
    const deleteResponse = await deleteResult(result.id);
    if (deleteResponse.success) {
      console.log(`  ✅ Deleted successfully`);
      successCount++;
    } else {
      console.log(`  ❌ Failed: ${deleteResponse.message} (Status: ${deleteResponse.status})`);
      failCount++;
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 Results cleanup summary:`);
  console.log(`  ✅ Successfully deleted: ${successCount}`);
  console.log(`  ❌ Failed to delete: ${failCount}`);
  
  return { successCount, failCount };
}

async function cleanupFailedJobs(jobs) {
  console.log('\n🧹 Cleaning up failed jobs...');
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    console.log(`\n[${i + 1}/${jobs.length}] Deleting job ${job.job_id}...`);
    console.log(`  Created: ${job.created_at}`);
    console.log(`  Assessment: ${job.assessment_name}`);
    console.log(`  Error: ${job.error_message || 'No error message'}`);
    
    const deleteResponse = await deleteJob(job.job_id);
    if (deleteResponse.success) {
      console.log(`  ✅ Deleted successfully`);
      successCount++;
    } else {
      console.log(`  ❌ Failed: ${deleteResponse.message} (Status: ${deleteResponse.status})`);
      if (deleteResponse.details) {
        console.log(`  Details:`, JSON.stringify(deleteResponse.details, null, 2));
      }
      failCount++;
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 Jobs cleanup summary:`);
  console.log(`  ✅ Successfully deleted: ${successCount}`);
  console.log(`  ❌ Failed to delete: ${failCount}`);
  
  return { successCount, failCount };
}

async function getFinalStats() {
  console.log('\n📊 Getting final statistics...');
  try {
    const [resultsResponse, jobsResponse] = await Promise.all([
      axios.get(`${BASE_URL}/archive/results?limit=1`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }),
      axios.get(`${BASE_URL}/archive/jobs?limit=1`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
    ]);
    
    const totalResults = resultsResponse.data.data.pagination.total;
    const totalJobs = jobsResponse.data.data.pagination.total;
    
    // Get failed counts
    const [failedResultsResponse, failedJobsResponse] = await Promise.all([
      axios.get(`${BASE_URL}/archive/results?status=failed&limit=1`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }),
      axios.get(`${BASE_URL}/archive/jobs?status=failed&limit=1`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
    ]);
    
    const failedResults = failedResultsResponse.data.data.pagination.total;
    const failedJobs = failedJobsResponse.data.data.pagination.total;
    
    console.log(`📈 Final Statistics:`);
    console.log(`  Total Results: ${totalResults} (${failedResults} failed)`);
    console.log(`  Total Jobs: ${totalJobs} (${failedJobs} failed)`);
    
    return { totalResults, totalJobs, failedResults, failedJobs };
  } catch (error) {
    console.error('❌ Failed to get final stats:', error.message);
    return null;
  }
}

async function main() {
  console.log('🧹 Cleanup Failed Assessments for kasykoi@gmail.com');
  console.log('===================================================');
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    process.exit(1);
  }
  
  // Step 2: Get initial stats
  const initialStats = await getFinalStats();
  
  // Step 3: Get failed results and jobs
  const [failedResults, failedJobs] = await Promise.all([
    getFailedResults(),
    getFailedJobs()
  ]);
  
  // Step 4: Cleanup failed results
  let resultCleanup = { successCount: 0, failCount: 0 };
  if (failedResults.length > 0) {
    resultCleanup = await cleanupFailedResults(failedResults);
  } else {
    console.log('\n✅ No failed results to cleanup');
  }
  
  // Step 5: Cleanup failed jobs (test a few first)
  let jobCleanup = { successCount: 0, failCount: 0 };
  if (failedJobs.length > 0) {
    console.log('\n🧪 Testing job deletion with first 3 jobs...');
    const testJobs = failedJobs.slice(0, 3);
    jobCleanup = await cleanupFailedJobs(testJobs);
    
    if (jobCleanup.successCount > 0) {
      console.log('\n✅ Job deletion works! Proceeding with remaining jobs...');
      const remainingJobs = failedJobs.slice(3);
      if (remainingJobs.length > 0) {
        const remainingCleanup = await cleanupFailedJobs(remainingJobs);
        jobCleanup.successCount += remainingCleanup.successCount;
        jobCleanup.failCount += remainingCleanup.failCount;
      }
    } else {
      console.log('\n❌ Job deletion not working, skipping remaining jobs');
    }
  } else {
    console.log('\n✅ No failed jobs to cleanup');
  }
  
  // Step 6: Final stats
  const finalStats = await getFinalStats();
  
  // Step 7: Summary
  console.log('\n🏁 Cleanup Summary');
  console.log('==================');
  console.log(`📊 Results: ${resultCleanup.successCount} deleted, ${resultCleanup.failCount} failed`);
  console.log(`📊 Jobs: ${jobCleanup.successCount} deleted, ${jobCleanup.failCount} failed`);
  
  if (initialStats && finalStats) {
    console.log(`\n📈 Before/After:`);
    console.log(`  Results: ${initialStats.totalResults} → ${finalStats.totalResults} (${initialStats.totalResults - finalStats.totalResults} removed)`);
    console.log(`  Failed Results: ${initialStats.failedResults} → ${finalStats.failedResults} (${initialStats.failedResults - finalStats.failedResults} removed)`);
    console.log(`  Jobs: ${initialStats.totalJobs} → ${finalStats.totalJobs} (${initialStats.totalJobs - finalStats.totalJobs} removed)`);
    console.log(`  Failed Jobs: ${initialStats.failedJobs} → ${finalStats.failedJobs} (${initialStats.failedJobs - finalStats.failedJobs} removed)`);
  }
  
  console.log('\n✅ Cleanup completed!');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run the cleanup
main().catch(error => {
  console.error('❌ Cleanup failed:', error.message);
  process.exit(1);
});
