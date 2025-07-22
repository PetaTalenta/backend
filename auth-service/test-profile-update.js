/**
 * Quick test script to verify profile update validation fixes
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testProfileUpdate() {
  console.log('Testing profile update validation fixes...\n');

  // Test data that might have caused the validation error
  const testCases = [
    {
      name: 'Valid profile update',
      data: {
        username: 'testuser123',
        full_name: 'Test User',
        gender: 'male',
        date_of_birth: '1990-01-01'
      },
      shouldPass: true
    },
    {
      name: 'Empty full_name (should fail)',
      data: {
        full_name: '',
        gender: 'female'
      },
      shouldPass: false
    },
    {
      name: 'Invalid gender (should fail)',
      data: {
        full_name: 'Test User',
        gender: 'other'
      },
      shouldPass: false
    },
    {
      name: 'Invalid username (should fail)',
      data: {
        username: 'ab', // too short
        full_name: 'Test User'
      },
      shouldPass: false
    },
    {
      name: 'Non-alphanumeric username (should fail)',
      data: {
        username: 'test-user!',
        full_name: 'Test User'
      },
      shouldPass: false
    },
    {
      name: 'Null full_name (should pass)',
      data: {
        full_name: null,
        gender: 'male'
      },
      shouldPass: true
    }
  ];

  console.log('Note: This test requires a valid auth token.');
  console.log('Please run this manually with a real token or integrate into existing tests.\n');

  testCases.forEach((testCase, index) => {
    console.log(`${index + 1}. ${testCase.name}`);
    console.log(`   Data: ${JSON.stringify(testCase.data)}`);
    console.log(`   Expected: ${testCase.shouldPass ? 'PASS' : 'FAIL'}`);
    console.log('');
  });

  console.log('To run actual tests:');
  console.log('1. Get a valid auth token by logging in');
  console.log('2. Replace TOKEN_HERE with the actual token');
  console.log('3. Uncomment and run the actual test code below');
  console.log('');

  /*
  // Uncomment this section to run actual tests
  const token = 'TOKEN_HERE';
  
  for (const testCase of testCases) {
    try {
      console.log(`Testing: ${testCase.name}`);
      
      const response = await axios.put(`${API_BASE_URL}/auth/profile`, testCase.data, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (testCase.shouldPass) {
        console.log(`✅ PASS: ${testCase.name}`);
      } else {
        console.log(`❌ UNEXPECTED PASS: ${testCase.name} - should have failed`);
      }
      
    } catch (error) {
      if (!testCase.shouldPass) {
        console.log(`✅ EXPECTED FAIL: ${testCase.name} - ${error.response?.data?.error?.message || error.message}`);
      } else {
        console.log(`❌ UNEXPECTED FAIL: ${testCase.name} - ${error.response?.data?.error?.message || error.message}`);
      }
    }
    
    console.log('');
  }
  */
}

if (require.main === module) {
  testProfileUpdate().catch(console.error);
}

module.exports = { testProfileUpdate };
