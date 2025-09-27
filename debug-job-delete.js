#!/usr/bin/env node

/**
 * Debug script to investigate job deletion issue
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

async function getJobDetails(jobId) {
  console.log(`\n🔍 Getting details for job ${jobId}...`);
  try {
    const response = await axios.get(`${BASE_URL}/archive/jobs/${jobId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const job = response.data.data;
    console.log('📋 Job Details:');
    console.log('  ID:', job.id);
    console.log('  Job ID:', job.job_id);
    console.log('  User ID:', job.user_id);
    console.log('  Status:', job.status);
    console.log('  Assessment Name:', job.assessment_name);
    console.log('  Created:', job.created_at);
    console.log('  Updated:', job.updated_at);
    console.log('  Result ID:', job.result_id || 'None');
    console.log('  Error:', job.error_message || 'None');
    
    return job;
  } catch (error) {
    console.error('❌ Failed to get job details:', error.response?.data?.error?.message || error.message);
    return null;
  }
}

async function deleteJobWithDetails(jobId) {
  console.log(`\n🗑️  Attempting to delete job ${jobId} with detailed error handling...`);
  
  try {
    const response = await axios.delete(`${BASE_URL}/archive/jobs/${jobId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    console.log('✅ Delete successful');
    console.log('Response:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Delete failed');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Headers:', error.response?.headers);
    
    if (error.response?.data?.error?.details) {
      console.error('Error Details:', JSON.stringify(error.response.data.error.details, null, 2));
    }
    
    return { 
      success: false, 
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    };
  }
}

async function testJobDeletion() {
  console.log('\n🧪 Testing Job Deletion with Debug Info');
  console.log('======================================');
  
  // Get a few failed jobs to test
  console.log('📋 Getting failed jobs...');
  try {
    const response = await axios.get(`${BASE_URL}/archive/jobs?status=failed&limit=3&sort=created_at&order=DESC`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const jobs = response.data.data.jobs;
    console.log(`Found ${jobs.length} failed jobs to test`);
    
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      console.log(`\n--- Testing Job ${i + 1} ---`);
      
      // Get detailed job info
      const jobDetails = await getJobDetails(job.job_id);
      
      if (jobDetails) {
        // Try to delete
        const deleteResult = await deleteJobWithDetails(job.job_id);
        
        if (!deleteResult.success) {
          console.log('\n🔍 Analyzing failure...');
          
          // Check if it's a permission issue
          if (deleteResult.status === 403) {
            console.log('❌ Permission denied - user may not own this job');
          } else if (deleteResult.status === 404) {
            console.log('❌ Job not found');
          } else if (deleteResult.status === 500) {
            console.log('❌ Server error - likely database constraint or code bug');
          }
        }
      }
      
      // Wait between attempts
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error('❌ Failed to get jobs for testing:', error.message);
  }
}

async function checkUserInfo() {
  console.log('\n👤 Checking user info...');
  try {
    const response = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const user = response.data.data;
    console.log('📋 User Details:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Username:', user.username);
    
    return user;
  } catch (error) {
    console.error('❌ Failed to get user info:', error.message);
    return null;
  }
}

async function main() {
  console.log('🔧 Debug Job Delete Issue');
  console.log('=========================');
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    process.exit(1);
  }
  
  // Step 2: Check user info
  const user = await checkUserInfo();
  
  // Step 3: Test job deletion with detailed debugging
  await testJobDeletion();
  
  console.log('\n🏁 Debug completed');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run the debug
main().catch(error => {
  console.error('❌ Debug failed:', error.message);
  process.exit(1);
});
