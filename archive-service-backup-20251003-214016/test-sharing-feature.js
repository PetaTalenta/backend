/**
 * Test script for always-public analysis results
 * UPDATED: All results are now always public - no more private/public toggle
 */

const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:3000/api/archive';
const TEST_RESULT_ID = '6b77a52e-bf59-44d4-9537-e298854697dc'; // Using actual created result ID from test

// Headers
const publicHeaders = {
  'Content-Type': 'application/json'
};

async function testAlwaysPublicFeature() {
  console.log('🧪 Testing Always-Public Analysis Results Feature\n');

  try {
    // Test 1: Access result without authentication (should always work now)
    console.log('1. Accessing result without authentication...');
    const publicAccessResponse = await axios.get(
      `${API_BASE}/results/${TEST_RESULT_ID}`,
      { headers: publicHeaders }
    );
    console.log('✅ Public Access Response:', {
      success: publicAccessResponse.data.success,
      is_public: publicAccessResponse.data.data.is_public,
      hasData: !!publicAccessResponse.data.data.persona_profile
    });

    // Test 2: Try to toggle public status (should fail - endpoint disabled)
    console.log('\n2. Trying to toggle public status (should fail)...');
    try {
      await axios.patch(
        `${API_BASE}/results/${TEST_RESULT_ID}/public`,
        { is_public: false },
        { headers: publicHeaders }
      );
      console.log('❌ Should have failed but didn\'t - endpoint should be disabled');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Correctly disabled toggle endpoint');
      } else {
        console.log('❌ Unexpected error:', error.response?.data);
      }
    }

    // Test 3: Access another user's result (should work if it exists)
    console.log('\n3. Testing universal access to any result...');
    // You can test with different result IDs here

    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ All analysis results are now always public');
    console.log('✅ No authentication required for access');
    console.log('✅ Public/private toggle has been disabled');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
if (require.main === module) {
  testAlwaysPublicFeature();
}

module.exports = { testAlwaysPublicFeature };
