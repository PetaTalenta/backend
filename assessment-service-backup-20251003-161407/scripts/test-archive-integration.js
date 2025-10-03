/**
 * Archive Service Integration Test Script
 * Script untuk testing integrasi Assessment Service dengan Archive Service
 */

require('dotenv').config();
const archiveService = require('../src/services/archiveService');
const { v4: uuidv4 } = require('uuid');

// Test configuration
const TEST_CONFIG = {
  userId: uuidv4(),
  jobId: uuidv4(),
  assessmentData: {
    riasec: {
      realistic: 4.2,
      investigative: 3.8,
      artistic: 2.1,
      social: 4.5,
      enterprising: 3.2,
      conventional: 2.8
    },
    ocean: {
      openness: 4.1,
      conscientiousness: 3.9,
      extraversion: 3.5,
      agreeableness: 4.2,
      neuroticism: 2.3
    },
    viaIs: {
      creativity: 4.0,
      curiosity: 3.8,
      judgment: 3.5,
      love_of_learning: 4.2,
      perspective: 3.7
    }
  },
  personaProfile: {
    archetype: "The Helper",
    personality_summary: "Individu yang memiliki kecenderungan sosial tinggi dengan kemampuan komunikasi interpersonal yang baik. Memiliki empati yang tinggi dan senang membantu orang lain mencapai potensi mereka.",
    career_recommendations: [
      "Human Resources Manager",
      "Social Worker",
      "Teacher",
      "Counselor",
      "Community Outreach Coordinator"
    ],
    strengths: [
      "Komunikasi interpersonal yang baik",
      "Empati tinggi",
      "Kemampuan bekerja dalam tim",
      "Kepedulian terhadap orang lain",
      "Kemampuan mendengarkan aktif"
    ],
    development_areas: [
      "Pengembangan keterampilan teknis",
      "Manajemen waktu",
      "Kepemimpinan strategis",
      "Pengambilan keputusan yang tegas"
    ],
    personality_traits: {
      dominant_riasec: "Social",
      dominant_ocean: "Agreeableness",
      key_strengths: ["Empathy", "Communication", "Teamwork"],
      growth_areas: ["Technical Skills", "Time Management"]
    }
  }
};

/**
 * Test Archive Service Health
 */
const testHealthCheck = async () => {
  console.log('🔍 Testing Archive Service Health...');
  try {
    const isHealthy = await archiveService.checkHealth();
    if (isHealthy) {
      console.log('✅ Archive Service is healthy');
      return true;
    } else {
      console.log('❌ Archive Service is not healthy');
      return false;
    }
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
};

/**
 * Test Job Creation
 */
const testJobCreation = async () => {
  console.log('\n📝 Testing Job Creation...');
  try {
    const job = await archiveService.createJob(
      TEST_CONFIG.jobId,
      TEST_CONFIG.userId,
      TEST_CONFIG.assessmentData,
      'AI-Driven Talent Mapping'
    );

    console.log('✅ Job created successfully');
    console.log(`   Job ID: ${job.job_id}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Created At: ${job.created_at}`);
    
    return job;
  } catch (error) {
    console.error('❌ Job creation failed:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    throw error;
  }
};

/**
 * Test Job Status Retrieval
 */
const testJobStatusRetrieval = async (jobId) => {
  console.log('\n📊 Testing Job Status Retrieval...');
  try {
    const jobStatus = await archiveService.getJobStatus(jobId);
    
    if (jobStatus) {
      console.log('✅ Job status retrieved successfully');
      console.log(`   Job ID: ${jobStatus.job_id}`);
      console.log(`   Status: ${jobStatus.status}`);
      console.log(`   User ID: ${jobStatus.user_id}`);
    } else {
      console.log('⚠️  Job not found');
    }
    
    return jobStatus;
  } catch (error) {
    console.error('❌ Job status retrieval failed:', error.message);
    throw error;
  }
};

/**
 * Test Analysis Result Creation
 */
const testAnalysisResultCreation = async () => {
  console.log('\n📋 Testing Analysis Result Creation...');
  try {
    const result = await archiveService.createAnalysisResult(
      TEST_CONFIG.userId,
      TEST_CONFIG.assessmentData,
      TEST_CONFIG.personaProfile,
      'AI-Driven Talent Mapping',
      'completed'
    );

    console.log('✅ Analysis result created successfully');
    console.log(`   Result ID: ${result.id}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   User ID: ${result.user_id}`);
    console.log(`   Created At: ${result.created_at}`);
    
    return result;
  } catch (error) {
    console.error('❌ Analysis result creation failed:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    throw error;
  }
};

/**
 * Test Analysis Result Retrieval
 */
const testAnalysisResultRetrieval = async (resultId) => {
  console.log('\n📖 Testing Analysis Result Retrieval...');
  try {
    const result = await archiveService.getAnalysisResult(resultId);
    
    if (result) {
      console.log('✅ Analysis result retrieved successfully');
      console.log(`   Result ID: ${result.id}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Archetype: ${result.persona_profile?.archetype}`);
    } else {
      console.log('⚠️  Analysis result not found');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Analysis result retrieval failed:', error.message);
    throw error;
  }
};

/**
 * Test Analysis Result Update
 */
const testAnalysisResultUpdate = async (resultId) => {
  console.log('\n✏️  Testing Analysis Result Update...');
  try {
    const updateData = {
      persona_profile: {
        ...TEST_CONFIG.personaProfile,
        archetype: "The Updated Helper",
        personality_summary: "Updated: " + TEST_CONFIG.personaProfile.personality_summary
      }
    };

    const updatedResult = await archiveService.updateAnalysisResult(resultId, updateData);
    
    console.log('✅ Analysis result updated successfully');
    console.log(`   Result ID: ${updatedResult.id}`);
    console.log(`   Updated At: ${updatedResult.updated_at}`);
    
    return updatedResult;
  } catch (error) {
    console.error('❌ Analysis result update failed:', error.message);
    throw error;
  }
};

/**
 * Test Job Status Sync
 */
const testJobStatusSync = async (jobId, resultId) => {
  console.log('\n🔄 Testing Job Status Sync...');
  try {
    const syncResult = await archiveService.syncJobStatus(
      jobId,
      'completed',
      {
        result_id: resultId,
        processing_time: 45.5,
        completion_timestamp: new Date().toISOString()
      }
    );

    console.log('✅ Job status synced successfully');
    console.log(`   Message: ${syncResult.message}`);
    
    return syncResult;
  } catch (error) {
    console.error('❌ Job status sync failed:', error.message);
    throw error;
  }
};

/**
 * Test Failed Analysis Result Creation
 */
const testFailedAnalysisResultCreation = async () => {
  console.log('\n❌ Testing Failed Analysis Result Creation...');
  try {
    const failedResult = await archiveService.createAnalysisResult(
      uuidv4(), // Different user ID
      { incomplete: 'data' },
      null, // No persona profile
      'AI-Driven Talent Mapping',
      'failed',
      'Insufficient assessment data provided'
    );

    console.log('✅ Failed analysis result created successfully');
    console.log(`   Result ID: ${failedResult.id}`);
    console.log(`   Status: ${failedResult.status}`);
    console.log(`   Error Message: ${failedResult.error_message}`);
    
    return failedResult;
  } catch (error) {
    console.error('❌ Failed analysis result creation failed:', error.message);
    throw error;
  }
};

/**
 * Run All Integration Tests
 */
const runIntegrationTests = async () => {
  console.log('🚀 Starting Archive Service Integration Tests');
  console.log('='.repeat(60));
  
  let testResults = {
    passed: 0,
    failed: 0,
    total: 0
  };

  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Job Creation', fn: testJobCreation },
    { name: 'Job Status Retrieval', fn: () => testJobStatusRetrieval(TEST_CONFIG.jobId) },
    { name: 'Analysis Result Creation', fn: testAnalysisResultCreation },
    { name: 'Failed Analysis Result Creation', fn: testFailedAnalysisResultCreation }
  ];

  let createdJob = null;
  let createdResult = null;

  for (const test of tests) {
    testResults.total++;
    try {
      const result = await test.fn();
      
      // Store results for subsequent tests
      if (test.name === 'Job Creation') createdJob = result;
      if (test.name === 'Analysis Result Creation') createdResult = result;
      
      testResults.passed++;
    } catch (error) {
      testResults.failed++;
      console.error(`\n💥 Test "${test.name}" failed:`, error.message);
    }
  }

  // Run dependent tests if we have the required data
  if (createdResult) {
    const dependentTests = [
      { name: 'Analysis Result Retrieval', fn: () => testAnalysisResultRetrieval(createdResult.id) },
      { name: 'Analysis Result Update', fn: () => testAnalysisResultUpdate(createdResult.id) }
    ];

    if (createdJob) {
      dependentTests.push({
        name: 'Job Status Sync',
        fn: () => testJobStatusSync(createdJob.job_id, createdResult.id)
      });
    }

    for (const test of dependentTests) {
      testResults.total++;
      try {
        await test.fn();
        testResults.passed++;
      } catch (error) {
        testResults.failed++;
        console.error(`\n💥 Test "${test.name}" failed:`, error.message);
      }
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total:  ${testResults.total}`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! Archive Service integration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the Archive Service configuration and connectivity.');
  }

  return testResults;
};

// Run tests if this file is executed directly
if (require.main === module) {
  runIntegrationTests()
    .then((results) => {
      process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Integration test runner failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  runIntegrationTests,
  testHealthCheck,
  testJobCreation,
  testJobStatusRetrieval,
  testAnalysisResultCreation,
  testAnalysisResultRetrieval,
  testAnalysisResultUpdate,
  testJobStatusSync,
  testFailedAnalysisResultCreation
};
