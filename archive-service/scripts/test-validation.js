/**
 * Validation Test Script
 * Tests the improved validation system in archive-service
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const BASE_URL = process.env.ARCHIVE_SERVICE_URL || 'http://localhost:3002';
const SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'f8c1af59d85da6581036e18b4b9e0ec35d1fdefe1a93837d5b4746c9984ea4c1';

// Test data - using existing user ID from database
const validUserId = 'a577cbc8-dd04-4ecd-bad9-7d485fee9020'; // azumacchi9@gmail.com
const invalidUserId = 'invalid-uuid';

const validPersonaProfile = {
  archetype: 'The Innovator',
  shortSummary: 'A creative and forward-thinking individual who thrives on innovation and change.',
  strengths: ['Creative thinking', 'Problem solving', 'Adaptability'],
  weaknesses: ['Impatience', 'Perfectionism', 'Overthinking'],
  careerRecommendation: [
    {
      careerName: 'Software Engineer',
      careerProspect: {
        jobAvailability: 'high',
        salaryPotential: 'high',
        careerProgression: 'high',
        industryGrowth: 'high',
        skillDevelopment: 'high'
      }
    },
    {
      careerName: 'Product Manager',
      careerProspect: {
        jobAvailability: 'moderate',
        salaryPotential: 'high',
        careerProgression: 'high',
        industryGrowth: 'moderate',
        skillDevelopment: 'high'
      }
    },
    {
      careerName: 'UX Designer',
      careerProspect: {
        jobAvailability: 'moderate',
        salaryPotential: 'moderate',
        careerProgression: 'moderate',
        industryGrowth: 'high',
        skillDevelopment: 'high'
      }
    }
  ],
  insights: ['Strong analytical skills', 'Natural leadership qualities', 'Excellent communication'],
  workEnvironment: 'Collaborative and dynamic environment with opportunities for growth',
  roleModel: ['Steve Jobs', 'Elon Musk', 'Satya Nadella', 'Tim Cook']
};

// HTTP client with service authentication
const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-Internal-Service': 'true',
    'X-Service-Key': SERVICE_KEY,
    'Content-Type': 'application/json'
  }
});

/**
 * Test validation scenarios
 */
const tests = [
  {
    name: 'Valid Create Request',
    method: 'POST',
    url: '/archive/results',
    data: {
      user_id: validUserId,
      assessment_data: { score: 85, category: 'high' },
      persona_profile: validPersonaProfile,
      status: 'completed',
      assessment_name: 'AI-Driven Talent Mapping'
    },
    expectedStatus: 201,
    shouldPass: true
  },
  {
    name: 'Invalid UUID',
    method: 'POST',
    url: '/archive/results',
    data: {
      user_id: invalidUserId,
      persona_profile: validPersonaProfile,
      status: 'completed'
    },
    expectedStatus: 400,
    shouldPass: false
  },
  {
    name: 'Missing Required Fields',
    method: 'POST',
    url: '/archive/results',
    data: {
      user_id: validUserId,
      status: 'completed'
      // Missing persona_profile for completed status
    },
    expectedStatus: 400,
    shouldPass: false
  },
  {
    name: 'Invalid Status',
    method: 'POST',
    url: '/archive/results',
    data: {
      user_id: validUserId,
      persona_profile: validPersonaProfile,
      status: 'invalid_status'
    },
    expectedStatus: 400,
    shouldPass: false
  },
  {
    name: 'Failed Status Without Error Message',
    method: 'POST',
    url: '/archive/results',
    data: {
      user_id: validUserId,
      status: 'failed'
      // Missing error_message for failed status
    },
    expectedStatus: 400,
    shouldPass: false
  },
  {
    name: 'Security Test - Dangerous Fields',
    method: 'POST',
    url: '/archive/results',
    data: {
      user_id: validUserId,
      assessment_data: {
        score: 85,
        password: 'should_be_removed',
        token: 'should_be_removed',
        secret: 'should_be_removed'
      },
      persona_profile: validPersonaProfile,
      status: 'completed'
    },
    expectedStatus: 201,
    shouldPass: true,
    checkSanitization: true
  },
  {
    name: 'Persona Profile Validation - Missing Fields',
    method: 'POST',
    url: '/archive/results',
    data: {
      user_id: validUserId,
      persona_profile: {
        archetype: 'Test',
        // Missing required fields
      },
      status: 'completed'
    },
    expectedStatus: 400,
    shouldPass: false
  },
  {
    name: 'Persona Profile Validation - Invalid Array Lengths',
    method: 'POST',
    url: '/archive/results',
    data: {
      user_id: validUserId,
      persona_profile: {
        ...validPersonaProfile,
        strengths: ['Only one'], // Should have at least 3
        weaknesses: ['Only', 'Two'] // Should have at least 3
      },
      status: 'completed'
    },
    expectedStatus: 400,
    shouldPass: false
  },
  {
    name: 'Query Parameter Validation',
    method: 'GET',
    url: '/archive/results?page=invalid&limit=abc',
    expectedStatus: 400,
    shouldPass: false
  },
  {
    name: 'Large Request Test',
    method: 'POST',
    url: '/archive/results',
    data: {
      user_id: validUserId,
      assessment_data: {
        largeField: 'x'.repeat(1000000) // 1MB string
      },
      persona_profile: validPersonaProfile,
      status: 'completed'
    },
    expectedStatus: 413, // Request too large
    shouldPass: false
  }
];

/**
 * Run validation tests
 */
async function runTests() {
  console.log('🧪 Archive Service Validation Tests\n');
  console.log('='.repeat(50));

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n🔍 Testing: ${test.name}`);
      
      let response;
      if (test.method === 'GET') {
        response = await client.get(test.url);
      } else if (test.method === 'POST') {
        response = await client.post(test.url, test.data);
      }

      if (test.shouldPass) {
        if (response.status === test.expectedStatus) {
          console.log(`✅ PASS - Status: ${response.status}`);
          
          // Check sanitization if required
          if (test.checkSanitization && response.data.data) {
            const hasPassword = JSON.stringify(response.data).includes('password');
            const hasToken = JSON.stringify(response.data).includes('token');
            const hasSecret = JSON.stringify(response.data).includes('secret');
            
            if (!hasPassword && !hasToken && !hasSecret) {
              console.log('✅ PASS - Dangerous fields sanitized');
            } else {
              console.log('❌ FAIL - Dangerous fields not sanitized');
              failed++;
              continue;
            }
          }
          
          passed++;
        } else {
          console.log(`❌ FAIL - Expected: ${test.expectedStatus}, Got: ${response.status}`);
          failed++;
        }
      } else {
        console.log(`❌ FAIL - Request should have failed but got status: ${response.status}`);
        failed++;
      }
    } catch (error) {
      if (!test.shouldPass && error.response?.status === test.expectedStatus) {
        console.log(`✅ PASS - Correctly rejected with status: ${error.response.status}`);
        console.log(`   Error: ${error.response.data.error?.message || 'Unknown error'}`);
        passed++;
      } else {
        console.log(`❌ FAIL - Unexpected error: ${error.message}`);
        if (error.response) {
          console.log(`   Status: ${error.response.status}`);
          console.log(`   Error: ${error.response.data.error?.message || 'Unknown error'}`);
        }
        failed++;
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All validation tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the validation implementation.');
  }
}

/**
 * Test security middleware
 */
async function testSecurityMiddleware() {
  console.log('\n🔒 Testing Security Middleware\n');
  console.log('='.repeat(30));

  const securityTests = [
    {
      name: 'XSS Protection Headers',
      test: async () => {
        const response = await client.get('/health');
        const headers = response.headers;
        return headers['x-xss-protection'] === '1; mode=block';
      }
    },
    {
      name: 'Frame Options Header',
      test: async () => {
        const response = await client.get('/health');
        return response.headers['x-frame-options'] === 'DENY';
      }
    },
    {
      name: 'Content Type Options',
      test: async () => {
        const response = await client.get('/health');
        return response.headers['x-content-type-options'] === 'nosniff';
      }
    }
  ];

  for (const test of securityTests) {
    try {
      const result = await test.test();
      console.log(`${result ? '✅' : '❌'} ${test.name}`);
    } catch (error) {
      console.log(`❌ ${test.name} - Error: ${error.message}`);
    }
  }
}

// Run tests
if (require.main === module) {
  runTests()
    .then(() => testSecurityMiddleware())
    .catch(error => {
      console.error('Test execution failed:', error.message);
      process.exit(1);
    });
}

module.exports = { runTests, testSecurityMiddleware };
