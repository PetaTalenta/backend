// Unit tests for Assessment Name feature implementation
const path = require('path');

// Test assessment schema validation
async function testAssessmentSchemaValidation() {
  console.log('🧪 Testing Assessment Schema Validation');
  console.log('=====================================');

  try {
    // Load assessment schema
    const { assessmentSchema } = require('../assessment-service/src/schemas/assessment');
    
    // Test data with assessment name
    const testDataWithName = {
      riasec: {
        realistic: 75,
        investigative: 85,
        artistic: 60,
        social: 50,
        enterprising: 70,
        conventional: 55
      },
      ocean: {
        conscientiousness: 65,
        extraversion: 55,
        agreeableness: 45,
        neuroticism: 30,
        openness: 80
      },
      viaIs: {
        creativity: 85,
        curiosity: 78,
        judgment: 70,
        loveOfLearning: 82,
        perspective: 60,
        bravery: 65,
        perseverance: 70,
        honesty: 75,
        zest: 60,
        love: 55,
        kindness: 68,
        socialIntelligence: 72,
        teamwork: 65,
        fairness: 70,
        leadership: 60,
        forgiveness: 55,
        humility: 50,
        prudence: 65,
        selfRegulation: 70,
        appreciationOfBeauty: 75,
        gratitude: 80,
        hope: 70,
        humor: 65,
        spirituality: 45
      },
      assessmentName: 'AI-Based IQ Test'
    };

    // Test data without assessment name
    const testDataWithoutName = {
      riasec: {
        realistic: 75,
        investigative: 85,
        artistic: 60,
        social: 50,
        enterprising: 70,
        conventional: 55
      },
      ocean: {
        conscientiousness: 65,
        extraversion: 55,
        agreeableness: 45,
        neuroticism: 30,
        openness: 80
      },
      viaIs: {
        creativity: 85,
        curiosity: 78,
        judgment: 70,
        loveOfLearning: 82,
        perspective: 60,
        bravery: 65,
        perseverance: 70,
        honesty: 75,
        zest: 60,
        love: 55,
        kindness: 68,
        socialIntelligence: 72,
        teamwork: 65,
        fairness: 70,
        leadership: 60,
        forgiveness: 55,
        humility: 50,
        prudence: 65,
        selfRegulation: 70,
        appreciationOfBeauty: 75,
        gratitude: 80,
        hope: 70,
        humor: 65,
        spirituality: 45
      }
    };

    // Test data with invalid assessment name
    const testDataWithInvalidName = {
      ...testDataWithoutName,
      assessmentName: 'Invalid Assessment'
    };

    console.log('\n1. Testing valid data with assessment name...');
    const result1 = assessmentSchema.validate(testDataWithName);
    if (result1.error) {
      console.log('❌ FAIL: Valid data with assessment name failed validation');
      console.log('Error:', result1.error.details[0].message);
    } else {
      console.log('✅ PASS: Valid data with assessment name passed validation');
      console.log('Assessment Name:', result1.value.assessmentName);
    }

    console.log('\n2. Testing valid data without assessment name...');
    const result2 = assessmentSchema.validate(testDataWithoutName);
    if (result2.error) {
      console.log('❌ FAIL: Valid data without assessment name failed validation');
      console.log('Error:', result2.error.details[0].message);
    } else {
      console.log('✅ PASS: Valid data without assessment name passed validation');
      console.log('Assessment Name:', result2.value.assessmentName || 'undefined (optional)');
    }

    console.log('\n3. Testing data with invalid assessment name...');
    const result3 = assessmentSchema.validate(testDataWithInvalidName);
    if (result3.error) {
      console.log('✅ PASS: Invalid assessment name correctly rejected');
      console.log('Error:', result3.error.details[0].message);
    } else {
      console.log('❌ FAIL: Invalid assessment name was accepted');
    }

    console.log('\n4. Testing all valid assessment names...');
    const validNames = ['AI-Driven Talent Mapping', 'AI-Based IQ Test', 'Custom Assessment'];
    let allValid = true;
    
    for (const name of validNames) {
      const testData = { ...testDataWithoutName, assessmentName: name };
      const result = assessmentSchema.validate(testData);
      if (result.error) {
        console.log(`❌ FAIL: Valid assessment name '${name}' was rejected`);
        allValid = false;
      } else {
        console.log(`✅ PASS: Assessment name '${name}' accepted`);
      }
    }

    if (allValid) {
      console.log('✅ All valid assessment names passed validation');
    }

    return true;

  } catch (error) {
    console.log('❌ FAIL: Error loading assessment schema');
    console.log('Error:', error.message);
    return false;
  }
}

// Test archive service validation schemas
async function testArchiveValidationSchemas() {
  console.log('\n🧪 Testing Archive Service Validation Schemas');
  console.log('==============================================');

  try {
    // Load archive validation schemas
    const {
      createAnalysisJobSchema,
      createAnalysisResultSchema,
      assessmentNameSchema
    } = require('../archive-service/src/utils/validation');

    console.log('\n1. Testing assessmentNameSchema...');
    
    // Test valid assessment names
    const validNames = ['AI-Driven Talent Mapping', 'AI-Based IQ Test', 'Custom Assessment'];
    let allValid = true;
    
    for (const name of validNames) {
      const result = assessmentNameSchema.validate(name);
      if (result.error) {
        console.log(`❌ FAIL: Valid assessment name '${name}' was rejected`);
        allValid = false;
      } else {
        console.log(`✅ PASS: Assessment name '${name}' accepted`);
      }
    }

    // Test invalid assessment name
    const invalidResult = assessmentNameSchema.validate('Invalid Name');
    if (invalidResult.error) {
      console.log('✅ PASS: Invalid assessment name correctly rejected');
    } else {
      console.log('❌ FAIL: Invalid assessment name was accepted');
      allValid = false;
    }

    // Test default value
    const defaultResult = assessmentNameSchema.validate(undefined);
    if (!defaultResult.error && defaultResult.value === 'AI-Driven Talent Mapping') {
      console.log('✅ PASS: Default assessment name is correctly set');
    } else {
      console.log('❌ FAIL: Default assessment name is not working');
      allValid = false;
    }

    console.log('\n2. Testing createAnalysisJobSchema with assessment_name...');
    const jobData = {
      job_id: 'test-job-123',
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      assessment_data: { test: 'data' },
      assessment_name: 'AI-Based IQ Test'
    };

    const jobResult = createAnalysisJobSchema.validate(jobData);
    if (jobResult.error) {
      console.log('❌ FAIL: Valid job data with assessment_name was rejected');
      console.log('Error:', jobResult.error.details[0].message);
      allValid = false;
    } else {
      console.log('✅ PASS: Job data with assessment_name accepted');
      console.log('Assessment Name:', jobResult.value.assessment_name);
    }

    console.log('\n3. Testing createAnalysisResultSchema with assessment_name...');
    const resultData = {
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      assessment_data: { test: 'data' },
      persona_profile: {
        archetype: 'The Innovator',
        shortSummary: 'A creative and analytical individual',
        strengths: ['Creative thinking', 'Problem solving', 'Innovation'],
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
            careerName: 'Data Scientist',
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
          }
        ],
        insights: ['Strong analytical skills', 'Creative problem solver', 'Good leadership potential'],
        workEnvironment: 'Collaborative and innovative environment',
        roleModel: ['Elon Musk', 'Steve Jobs', 'Satya Nadella', 'Tim Cook']
      },
      assessment_name: 'Custom Assessment'
    };

    const resultResult = createAnalysisResultSchema.validate(resultData);
    if (resultResult.error) {
      console.log('❌ FAIL: Valid result data with assessment_name was rejected');
      console.log('Error:', resultResult.error.details[0].message);
      allValid = false;
    } else {
      console.log('✅ PASS: Result data with assessment_name accepted');
      console.log('Assessment Name:', resultResult.value.assessment_name);
    }

    return allValid;

  } catch (error) {
    console.log('❌ FAIL: Error loading archive validation schemas');
    console.log('Error:', error.message);
    return false;
  }
}

// Test analysis worker validation
async function testAnalysisWorkerValidation() {
  console.log('\n🧪 Testing Analysis Worker Validation');
  console.log('====================================');

  try {
    // Load worker validation
    const { validateJobMessage } = require('../analysis-worker/src/utils/validator');

    console.log('\n1. Testing job message with assessment name...');
    const jobMessage = {
      jobId: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      userEmail: 'test@example.com',
      assessmentData: { test: 'data' },
      assessmentName: 'AI-Based IQ Test',
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    const result1 = validateJobMessage(jobMessage);
    if (!result1.isValid) {
      console.log('❌ FAIL: Valid job message with assessment name was rejected');
      console.log('Error:', result1.error);
      return false;
    } else {
      console.log('✅ PASS: Job message with assessment name accepted');
      console.log('Assessment Name:', result1.value.assessmentName);
    }

    console.log('\n2. Testing job message without assessment name...');
    const jobMessageWithoutName = {
      jobId: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      userEmail: 'test@example.com',
      assessmentData: { test: 'data' },
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    const result2 = validateJobMessage(jobMessageWithoutName);
    if (!result2.isValid) {
      console.log('❌ FAIL: Valid job message without assessment name was rejected');
      console.log('Error:', result2.error);
      return false;
    } else {
      console.log('✅ PASS: Job message without assessment name accepted');
      console.log('Assessment Name:', result2.value.assessmentName || 'default will be used');
    }

    return true;

  } catch (error) {
    console.log('❌ FAIL: Error loading analysis worker validation');
    console.log('Error:', error.message);
    return false;
  }
}

// Main test runner
async function runUnitTests() {
  console.log('🚀 Starting Assessment Name Unit Tests');
  console.log('======================================');

  const results = [];

  // Test 1: Assessment Schema Validation
  const test1 = await testAssessmentSchemaValidation();
  results.push({ test: 'Assessment Schema Validation', passed: test1 });

  // Test 2: Archive Validation Schemas
  const test2 = await testArchiveValidationSchemas();
  results.push({ test: 'Archive Validation Schemas', passed: test2 });

  // Test 3: Analysis Worker Validation
  const test3 = await testAnalysisWorkerValidation();
  results.push({ test: 'Analysis Worker Validation', passed: test3 });

  // Summary
  console.log('\n🎉 Unit Tests Completed!');
  console.log('========================');
  console.log('Test Results Summary:');
  
  let allPassed = true;
  results.forEach(result => {
    console.log(`  ${result.test}: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
    if (!result.passed) allPassed = false;
  });

  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  console.log(`\nOverall: ${passedTests}/${totalTests} test suites passed`);

  if (allPassed) {
    console.log('🎊 All unit tests PASSED!');
    console.log('Assessment name implementation is working correctly.');
  } else {
    console.log('⚠️ Some unit tests FAILED!');
    console.log('Please check the implementation.');
  }

  return allPassed;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runUnitTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 Test execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  runUnitTests,
  testAssessmentSchemaValidation,
  testArchiveValidationSchemas,
  testAnalysisWorkerValidation
};
