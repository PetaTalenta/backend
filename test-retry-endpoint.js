#!/usr/bin/env node

/**
 * Test the retry endpoint using an existing result ID
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test user credentials
const TEST_USER = {
  email: 'kasykoi@gmail.com',
  password: 'Anjas123'
};

// Result ID from the database query we did earlier
const RESULT_ID = 'ff73e4ab-9061-4b85-b4d9-82b9e6adbb5b';

async function testRetryEndpoint() {
  console.log('🔄 Testing Retry Endpoint');
  console.log('=========================');
  
  try {
    // Step 1: Login and get token
    console.log('\n1. Getting authentication token...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    const token = loginResponse.data.data.token;
    console.log('✅ Token obtained successfully');
    
    // Step 2: Test retry endpoint
    console.log(`\n2. Testing retry endpoint with job ID: ${RESULT_ID}`);
    try {
      const retryResponse = await axios.post(`${BASE_URL}/assessment/retry`, 
        { jobId: RESULT_ID },
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Retry endpoint successful!');
      console.log('📋 Response:', JSON.stringify(retryResponse.data, null, 2));
      
      // Step 3: Check the new job status
      const newJobId = retryResponse.data.data.jobId;
      console.log(`\n3. Checking status of new job: ${newJobId}`);
      
      const statusResponse = await axios.get(`${BASE_URL}/assessment/status/${newJobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('✅ Job status retrieved');
      console.log('📋 Job Status:', JSON.stringify(statusResponse.data, null, 2));
      
    } catch (error) {
      console.error('❌ Retry endpoint failed:');
      console.error('Status:', error.response?.status);
      console.error('Error:', JSON.stringify(error.response?.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.error?.message || error.message);
  }
}

testRetryEndpoint();
