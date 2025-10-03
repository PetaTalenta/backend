/**
 * End-to-End Integration Test Script
 * Tests the complete flow: Assessment → Analysis → Archive
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_GATEWAY_URL = 'http://localhost:3000';
const ASSESSMENT_SERVICE_URL = 'http://localhost:3003';
const ARCHIVE_SERVICE_URL = 'http://localhost:3002';

// Test credentials (you need to replace with actual JWT token)
const JWT_TOKEN = 'your_jwt_token_here'; // Replace with actual token

/**
 * Load sample assessment data
 */
function loadSampleData() {
  try {
    const dataPath = path.join(__dirname, '..', 'test-data', 'sample-assessment.json');
    const data = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Failed to load sample data:', error.message);
    return null;
  }
}

/**
 * Test service health
 */
async function testServicesHealth() {
  console.log('🏥 Testing services health...\n');
  
  const services = [
    { name: 'API Gateway', url: `${API_GATEWAY_URL}/health` },
    { name: 'Assessment Service', url: `${ASSESSMENT_SERVICE_URL}/health` },
    { name: 'Archive Service', url: `${ARCHIVE_SERVICE_URL}/health` }
  ];
  
  let allHealthy = true;
  
  for (const service of services) {
    try {
      const response = await axios.get(service.url, { timeout: 5000 });
      const status = response.data.status || 'unknown';
      
      if (status === 'healthy') {
        console.log(`✅ ${service.name}: ${status}`);
      } else {
        console.log(`⚠️  ${service.name}: ${status}`);
        allHealthy = false;
      }
    } catch (error) {
      console.log(`❌ ${service.name}: unreachable`);
      allHealthy = false;
    }
  }
  
  return allHealthy;
}

/**
 * Submit assessment data
 */
async function submitAssessment(assessmentData) {
  try {
    console.log('\n📝 Submitting assessment data...');
    
    const response = await axios.post(`${API_GATEWAY_URL}/assessments/submit`, assessmentData, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Assessment submitted successfully');
    console.log(`   Job ID: ${response.data.data.jobId}`);
    console.log(`   Status: ${response.data.data.status}`);
    console.log(`   Estimated processing time: ${response.data.data.estimatedProcessingTime}`);
    console.log(`   Remaining tokens: ${response.data.data.remainingTokens}`);
    
    return response.data.data.jobId;
  } catch (error) {
    console.error('❌ Assessment submission failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    return null;
  }
}

/**
 * Wait for analysis to complete and check results
 */
async function waitForResults(jobId, maxWaitMinutes = 10) {
  console.log(`\n⏳ Waiting for analysis to complete (max ${maxWaitMinutes} minutes)...`);
  
  const maxAttempts = maxWaitMinutes * 6; // Check every 10 seconds
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(`${API_GATEWAY_URL}/archive/results`, {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`
        },
        timeout: 5000
      });
      
      const results = response.data.data.results;
      const latestResult = results.find(result => 
        result.status === 'completed' && 
        new Date(result.created_at) > new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
      );
      
      if (latestResult) {
        console.log('✅ Analysis completed!');
        console.log(`   Result ID: ${latestResult.id}`);
        console.log(`   Status: ${latestResult.status}`);
        console.log(`   Created: ${latestResult.created_at}`);
        console.log(`   Archetype: ${latestResult.persona_profile[0]?.archetype || 'N/A'}`);
        
        return latestResult;
      }
      
      attempts++;
      const waitTime = 10; // seconds
      process.stdout.write(`   Attempt ${attempts}/${maxAttempts} - waiting ${waitTime}s...\r`);
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      
    } catch (error) {
      console.error(`\n❌ Error checking results: ${error.message}`);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  console.log('\n⏰ Timeout waiting for analysis to complete');
  return null;
}

/**
 * Get detailed result
 */
async function getDetailedResult(resultId) {
  try {
    console.log('\n📄 Getting detailed result...');
    
    const response = await axios.get(`${API_GATEWAY_URL}/archive/results/${resultId}`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });
    
    const result = response.data.data;
    console.log('✅ Detailed result retrieved');
    console.log(`   Archetype: ${result.persona_profile[0].archetype}`);
    console.log(`   Summary: ${result.persona_profile[0].shortSummary.substring(0, 100)}...`);
    console.log(`   Strengths: ${result.persona_profile[0].strengths.slice(0, 3).join(', ')}`);
    console.log(`   Career recommendations: ${result.persona_profile[0].careerRecommendation.length}`);
    
    return result;
  } catch (error) {
    console.error('❌ Failed to get detailed result:', error.message);
    return null;
  }
}

/**
 * Get user statistics
 */
async function getUserStats() {
  try {
    console.log('\n📊 Getting user statistics...');
    
    const response = await axios.get(`${API_GATEWAY_URL}/archive/stats`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });
    
    const stats = response.data.data;
    console.log('✅ Statistics retrieved');
    console.log(`   Total analyses: ${stats.total_analyses}`);
    console.log(`   Completed: ${stats.completed}`);
    console.log(`   Processing: ${stats.processing}`);
    console.log(`   Failed: ${stats.failed}`);
    console.log(`   Most common archetype: ${stats.most_common_archetype || 'N/A'}`);
    
    return stats;
  } catch (error) {
    console.error('❌ Failed to get statistics:', error.message);
    return null;
  }
}

/**
 * Main integration test
 */
async function runIntegrationTest() {
  console.log('🧪 ATMA End-to-End Integration Test\n');
  console.log('='.repeat(60));
  
  // Check JWT token
  if (JWT_TOKEN === 'your_jwt_token_here') {
    console.log('❌ Please set a valid JWT token in the script');
    console.log('   You can get a token by logging in through the auth service');
    return;
  }
  
  // Load sample data
  const assessmentData = loadSampleData();
  if (!assessmentData) {
    return;
  }
  
  // Test services health
  const allHealthy = await testServicesHealth();
  if (!allHealthy) {
    console.log('\n❌ Some services are not healthy. Please start all services first:');
    console.log('   - API Gateway (port 3000)');
    console.log('   - Assessment Service (port 3003)');
    console.log('   - Analysis Worker (background)');
    console.log('   - Archive Service (port 3002)');
    console.log('   - RabbitMQ (port 5672)');
    console.log('   - PostgreSQL (port 5432)');
    return;
  }
  
  // Submit assessment
  const jobId = await submitAssessment(assessmentData);
  if (!jobId) {
    return;
  }
  
  // Wait for results
  const result = await waitForResults(jobId);
  if (!result) {
    console.log('\n💡 Tips for troubleshooting:');
    console.log('   - Check Analysis Worker logs for processing errors');
    console.log('   - Verify Google AI API key is configured');
    console.log('   - Check RabbitMQ queue for stuck messages');
    return;
  }
  
  // Get detailed result
  await getDetailedResult(result.id);
  
  // Get statistics
  await getUserStats();
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 End-to-end integration test completed successfully!');
  console.log('\nThe complete flow worked:');
  console.log('  Client → API Gateway → Assessment Service → RabbitMQ');
  console.log('  → Analysis Worker → Archive Service → Client');
}

// Run test if this script is executed directly
if (require.main === module) {
  runIntegrationTest().catch(error => {
    console.error('💥 Integration test failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  runIntegrationTest,
  testServicesHealth,
  submitAssessment,
  waitForResults
};
