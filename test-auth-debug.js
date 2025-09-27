#!/usr/bin/env node

/**
 * Debug authentication and user access
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test user credentials
const TEST_USER = {
  email: 'kasykoi@gmail.com',
  password: 'Anjas123'
};

async function testAuth() {
  console.log('🔐 Testing Authentication');
  console.log('========================');
  
  // Step 1: Login and get token
  console.log('\n1. Login...');
  try {
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');
    
    // Decode token to see payload (basic base64 decode)
    const tokenParts = token.split('.');
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    console.log('📋 Token payload:');
    console.log('  User ID:', payload.id);
    console.log('  Email:', payload.email);
    console.log('  Type:', payload.type);
    console.log('  Issued at:', new Date(payload.iat * 1000));
    console.log('  Expires at:', new Date(payload.exp * 1000));
    
    // Step 2: Test profile endpoint
    console.log('\n2. Testing profile endpoint...');
    try {
      const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Profile endpoint works');
      console.log('📋 Profile data:', profileResponse.data.data);
    } catch (error) {
      console.error('❌ Profile endpoint failed:', error.response?.data?.error?.message || error.message);
    }
    
    // Step 3: Test a simple archive endpoint
    console.log('\n3. Testing archive results endpoint...');
    try {
      const resultsResponse = await axios.get(`${BASE_URL}/archive/results?limit=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Archive results endpoint works');
      console.log('📊 Results count:', resultsResponse.data.data.pagination.total);
    } catch (error) {
      console.error('❌ Archive results endpoint failed:', error.response?.data?.error?.message || error.message);
    }
    
    // Step 4: Test job listing endpoint
    console.log('\n4. Testing archive jobs endpoint...');
    try {
      const jobsResponse = await axios.get(`${BASE_URL}/archive/jobs?limit=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Archive jobs endpoint works');
      console.log('📊 Jobs count:', jobsResponse.data.data.pagination.total);
    } catch (error) {
      console.error('❌ Archive jobs endpoint failed:', error.response?.data?.error?.message || error.message);
    }
    
    // Step 5: Test getting a specific job
    console.log('\n5. Testing specific job endpoint...');
    const testJobId = '85c6e3f2-5769-4b1a-b79c-0fb12ba18fe9';
    try {
      const jobResponse = await axios.get(`${BASE_URL}/archive/jobs/${testJobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Specific job endpoint works');
      console.log('📋 Job data:');
      console.log('  Job ID:', jobResponse.data.data.job_id);
      console.log('  User ID:', jobResponse.data.data.user_id);
      console.log('  Status:', jobResponse.data.data.status);
      console.log('  Token User ID:', payload.id);
      console.log('  Match:', jobResponse.data.data.user_id === payload.id);
    } catch (error) {
      console.error('❌ Specific job endpoint failed:', error.response?.data?.error?.message || error.message);
    }
    
    // Step 6: Test delete with detailed error
    console.log('\n6. Testing job deletion with detailed error...');
    try {
      const deleteResponse = await axios.delete(`${BASE_URL}/archive/jobs/${testJobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Job deletion successful');
      console.log('Response:', deleteResponse.data);
    } catch (error) {
      console.error('❌ Job deletion failed');
      console.error('Status:', error.response?.status);
      console.error('Error:', error.response?.data);
      
      // Check if it's a validation error
      if (error.response?.status === 400) {
        console.log('🔍 This is a validation error');
      } else if (error.response?.status === 401) {
        console.log('🔍 This is an authentication error');
      } else if (error.response?.status === 403) {
        console.log('🔍 This is an authorization error');
      } else if (error.response?.status === 500) {
        console.log('🔍 This is a server error - likely a bug in the code');
      }
    }
    
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.error?.message || error.message);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run the test
testAuth().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
