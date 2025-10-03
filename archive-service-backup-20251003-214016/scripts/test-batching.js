/**
 * Batch Processing Test Script
 * Tests the new batching functionality in archive-service
 * 
 * Usage: node scripts/test-batching.js [test_type] [concurrent_users]
 * Examples:
 *   node scripts/test-batching.js individual 50    # Test individual processing
 *   node scripts/test-batching.js batch 50         # Test batch processing
 *   node scripts/test-batching.js compare 50       # Compare both methods
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  ARCHIVE_SERVICE_URL: process.env.ARCHIVE_SERVICE_URL || 'http://localhost:3002',
  SERVICE_SECRET: process.env.INTERNAL_SERVICE_KEY || 'internal_service_secret_key_change_in_production',
  CONCURRENT_USERS: parseInt(process.argv[3]) || 20,
  TEST_TYPE: process.argv[2] || 'compare'
};

// Sample assessment data
const SAMPLE_ASSESSMENT = {
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
    perspective: 60
  }
};

// Sample persona profile
const SAMPLE_PERSONA = {
  title: "The Innovative Analyst",
  description: "A creative problem-solver with strong analytical skills",
  strengths: ["Creative thinking", "Data analysis", "Problem solving"],
  career_suggestions: ["Data Scientist", "Research Analyst", "Product Manager"],
  development_areas: ["Leadership skills", "Communication", "Team collaboration"]
};

/**
 * Generate test data for analysis result
 */
function generateTestData(index) {
  const userId = `test-user-${Date.now()}-${index}`;
  
  return {
    user_id: userId,
    assessment_data: {
      ...SAMPLE_ASSESSMENT,
      // Add some variation
      riasec: {
        ...SAMPLE_ASSESSMENT.riasec,
        realistic: Math.max(0, Math.min(100, SAMPLE_ASSESSMENT.riasec.realistic + (Math.random() - 0.5) * 20))
      }
    },
    persona_profile: {
      ...SAMPLE_PERSONA,
      title: `${SAMPLE_PERSONA.title} ${index}`
    },
    status: 'completed',
    processing_time: Math.floor(Math.random() * 5000) + 1000,
    ai_model_version: '1.0.0',
    confidence_score: Math.random() * 0.3 + 0.7
  };
}

/**
 * Create single analysis result
 */
async function createSingleResult(data, useBatching = true) {
  const url = `${CONFIG.ARCHIVE_SERVICE_URL}/archive/results${useBatching ? '' : '?batch=false'}`;
  
  try {
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Service': 'true',
        'X-Service-Key': CONFIG.SERVICE_SECRET
      },
      timeout: 30000
    });
    
    return {
      success: true,
      data: response.data,
      timing: response.headers['x-response-time'] || 0
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      timing: 0
    };
  }
}

/**
 * Create batch of analysis results
 */
async function createBatchResults(dataArray) {
  const url = `${CONFIG.ARCHIVE_SERVICE_URL}/archive/results/batch`;
  
  try {
    const response = await axios.post(url, { results: dataArray }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Service': 'true',
        'X-Service-Key': CONFIG.SERVICE_SECRET
      },
      timeout: 60000
    });
    
    return {
      success: true,
      data: response.data,
      timing: response.headers['x-response-time'] || 0
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      timing: 0
    };
  }
}

/**
 * Get batch processing statistics
 */
async function getBatchStats() {
  const url = `${CONFIG.ARCHIVE_SERVICE_URL}/archive/batch/stats`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        'X-Service-Secret': CONFIG.SERVICE_SECRET
      },
      timeout: 10000
    });
    
    return response.data.data;
  } catch (error) {
    console.error('Failed to get batch stats:', error.message);
    return null;
  }
}

/**
 * Test individual processing
 */
async function testIndividualProcessing(userCount) {
  console.log(`\n🔄 Testing Individual Processing (${userCount} users)`);
  console.log('='.repeat(60));
  
  const startTime = performance.now();
  const promises = [];
  
  // Generate test data
  for (let i = 0; i < userCount; i++) {
    const data = generateTestData(i);
    promises.push(createSingleResult(data, false)); // Disable batching
  }
  
  // Execute all requests concurrently
  const results = await Promise.allSettled(promises);
  const endTime = performance.now();
  
  // Analyze results
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.length - successful;
  const totalTime = endTime - startTime;
  
  console.log(`✅ Individual Processing Results:`);
  console.log(`   Total Time: ${Math.round(totalTime)}ms`);
  console.log(`   Successful: ${successful}/${userCount}`);
  console.log(`   Failed: ${failed}/${userCount}`);
  console.log(`   Success Rate: ${(successful/userCount*100).toFixed(1)}%`);
  console.log(`   Throughput: ${(successful/(totalTime/1000)).toFixed(2)} requests/second`);
  
  return {
    method: 'individual',
    totalTime,
    successful,
    failed,
    userCount,
    throughput: successful/(totalTime/1000)
  };
}

/**
 * Test batch processing
 */
async function testBatchProcessing(userCount) {
  console.log(`\n🔄 Testing Batch Processing (${userCount} users)`);
  console.log('='.repeat(60));
  
  const startTime = performance.now();
  
  // Generate test data
  const testData = [];
  for (let i = 0; i < userCount; i++) {
    testData.push(generateTestData(i));
  }
  
  // Send as single batch request
  const result = await createBatchResults(testData);
  const endTime = performance.now();
  
  const totalTime = endTime - startTime;
  
  if (result.success) {
    const successful = result.data.data.successful;
    const failed = result.data.data.failed;
    
    console.log(`✅ Batch Processing Results:`);
    console.log(`   Total Time: ${Math.round(totalTime)}ms`);
    console.log(`   Successful: ${successful}/${userCount}`);
    console.log(`   Failed: ${failed}/${userCount}`);
    console.log(`   Success Rate: ${(successful/userCount*100).toFixed(1)}%`);
    console.log(`   Throughput: ${(successful/(totalTime/1000)).toFixed(2)} requests/second`);
    
    return {
      method: 'batch',
      totalTime,
      successful,
      failed,
      userCount,
      throughput: successful/(totalTime/1000)
    };
  } else {
    console.log(`❌ Batch Processing Failed:`, result.error);
    return {
      method: 'batch',
      totalTime,
      successful: 0,
      failed: userCount,
      userCount,
      throughput: 0
    };
  }
}

/**
 * Test concurrent individual requests with batching enabled
 */
async function testConcurrentWithBatching(userCount) {
  console.log(`\n🔄 Testing Concurrent Requests with Batching (${userCount} users)`);
  console.log('='.repeat(60));
  
  const startTime = performance.now();
  const promises = [];
  
  // Generate test data and send concurrent requests
  for (let i = 0; i < userCount; i++) {
    const data = generateTestData(i);
    promises.push(createSingleResult(data, true)); // Enable batching
  }
  
  // Execute all requests concurrently
  const results = await Promise.allSettled(promises);
  const endTime = performance.now();
  
  // Wait a bit for batch processing to complete
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Get final batch stats
  const batchStats = await getBatchStats();
  
  // Analyze results
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.length - successful;
  const totalTime = endTime - startTime;
  
  console.log(`✅ Concurrent with Batching Results:`);
  console.log(`   Total Time: ${Math.round(totalTime)}ms`);
  console.log(`   Successful: ${successful}/${userCount}`);
  console.log(`   Failed: ${failed}/${userCount}`);
  console.log(`   Success Rate: ${(successful/userCount*100).toFixed(1)}%`);
  console.log(`   Throughput: ${(successful/(totalTime/1000)).toFixed(2)} requests/second`);
  
  if (batchStats) {
    console.log(`   Final Queue Size: ${batchStats.batch_processing.queueSize}`);
    console.log(`   Batch Config: ${JSON.stringify(batchStats.batch_processing.config)}`);
  }
  
  return {
    method: 'concurrent_batching',
    totalTime,
    successful,
    failed,
    userCount,
    throughput: successful/(totalTime/1000),
    batchStats
  };
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🎯 Archive Service Batch Processing Test');
  console.log('==========================================');
  console.log(`Configuration:`);
  console.log(`  Archive Service URL: ${CONFIG.ARCHIVE_SERVICE_URL}`);
  console.log(`  Concurrent Users: ${CONFIG.CONCURRENT_USERS}`);
  console.log(`  Test Type: ${CONFIG.TEST_TYPE}`);
  
  const results = [];
  
  try {
    // Get initial batch stats
    const initialStats = await getBatchStats();
    if (initialStats) {
      console.log(`\n📊 Initial Batch Stats:`, JSON.stringify(initialStats, null, 2));
    }
    
    switch (CONFIG.TEST_TYPE) {
      case 'individual':
        results.push(await testIndividualProcessing(CONFIG.CONCURRENT_USERS));
        break;
        
      case 'batch':
        results.push(await testBatchProcessing(CONFIG.CONCURRENT_USERS));
        break;
        
      case 'concurrent':
        results.push(await testConcurrentWithBatching(CONFIG.CONCURRENT_USERS));
        break;
        
      case 'compare':
      default:
        results.push(await testIndividualProcessing(CONFIG.CONCURRENT_USERS));
        results.push(await testConcurrentWithBatching(CONFIG.CONCURRENT_USERS));
        results.push(await testBatchProcessing(CONFIG.CONCURRENT_USERS));
        break;
    }
    
    // Print comparison
    if (results.length > 1) {
      console.log(`\n📊 Performance Comparison:`);
      console.log('='.repeat(80));
      
      results.forEach(result => {
        console.log(`${result.method.padEnd(20)} | ${Math.round(result.totalTime).toString().padStart(8)}ms | ${result.throughput.toFixed(2).padStart(8)} req/s | ${(result.successful/result.userCount*100).toFixed(1).padStart(6)}%`);
      });
      
      // Find best performing method
      const bestThroughput = Math.max(...results.map(r => r.throughput));
      const bestMethod = results.find(r => r.throughput === bestThroughput);
      
      console.log(`\n🏆 Best Performance: ${bestMethod.method} (${bestMethod.throughput.toFixed(2)} req/s)`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testIndividualProcessing,
  testBatchProcessing,
  testConcurrentWithBatching
};
