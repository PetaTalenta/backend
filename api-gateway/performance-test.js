const http = require('http');

/**
 * Simple performance test for API Gateway optimizations
 */

const TEST_CONFIG = {
  host: 'localhost',
  port: 3000,
  path: '/health',
  method: 'GET',
  concurrent: 50,
  totalRequests: 1000
};

let completedRequests = 0;
let totalResponseTime = 0;
let errors = 0;
const responseTimes = [];

console.log('🚀 Starting API Gateway Performance Test');
console.log(`📊 Configuration:`);
console.log(`   - Concurrent requests: ${TEST_CONFIG.concurrent}`);
console.log(`   - Total requests: ${TEST_CONFIG.totalRequests}`);
console.log(`   - Target: http://${TEST_CONFIG.host}:${TEST_CONFIG.port}${TEST_CONFIG.path}`);
console.log('');

const startTime = Date.now();

function makeRequest() {
  const requestStart = Date.now();
  
  const req = http.request(TEST_CONFIG, (res) => {
    const responseTime = Date.now() - requestStart;
    responseTimes.push(responseTime);
    totalResponseTime += responseTime;
    completedRequests++;
    
    // Consume response data
    res.on('data', () => {});
    res.on('end', () => {
      if (completedRequests % 100 === 0) {
        console.log(`✅ Completed: ${completedRequests}/${TEST_CONFIG.totalRequests} requests`);
      }
      
      if (completedRequests === TEST_CONFIG.totalRequests) {
        showResults();
      } else if (completedRequests < TEST_CONFIG.totalRequests) {
        // Launch next request
        setImmediate(makeRequest);
      }
    });
  });
  
  req.on('error', (err) => {
    errors++;
    completedRequests++;
    console.error(`❌ Request error: ${err.message}`);
    
    if (completedRequests === TEST_CONFIG.totalRequests) {
      showResults();
    } else if (completedRequests < TEST_CONFIG.totalRequests) {
      setImmediate(makeRequest);
    }
  });
  
  req.setTimeout(10000, () => {
    req.destroy();
    errors++;
    completedRequests++;
    console.error('❌ Request timeout');
  });
  
  req.end();
}

function showResults() {
  const totalTime = Date.now() - startTime;
  const avgResponseTime = totalResponseTime / (completedRequests - errors);
  const requestsPerSecond = (completedRequests - errors) / (totalTime / 1000);
  
  // Calculate percentiles
  responseTimes.sort((a, b) => a - b);
  const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
  const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
  const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];
  
  console.log('\n📈 Performance Test Results:');
  console.log('================================');
  console.log(`⏱️  Total time: ${totalTime}ms`);
  console.log(`✅ Successful requests: ${completedRequests - errors}`);
  console.log(`❌ Failed requests: ${errors}`);
  console.log(`📊 Requests/second: ${requestsPerSecond.toFixed(2)}`);
  console.log(`⚡ Average response time: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`📈 Response time percentiles:`);
  console.log(`   - P50: ${p50}ms`);
  console.log(`   - P95: ${p95}ms`);
  console.log(`   - P99: ${p99}ms`);
  console.log(`🎯 Error rate: ${((errors / completedRequests) * 100).toFixed(2)}%`);
  
  // Performance assessment
  console.log('\n🎯 Performance Assessment:');
  if (avgResponseTime < 10) {
    console.log('🟢 Excellent: Average response time < 10ms');
  } else if (avgResponseTime < 50) {
    console.log('🟡 Good: Average response time < 50ms');
  } else {
    console.log('🔴 Needs improvement: Average response time > 50ms');
  }
  
  if (requestsPerSecond > 500) {
    console.log('🟢 Excellent: Throughput > 500 req/s');
  } else if (requestsPerSecond > 200) {
    console.log('🟡 Good: Throughput > 200 req/s');
  } else {
    console.log('🔴 Needs improvement: Throughput < 200 req/s');
  }
  
  if (errors / completedRequests < 0.01) {
    console.log('🟢 Excellent: Error rate < 1%');
  } else if (errors / completedRequests < 0.05) {
    console.log('🟡 Good: Error rate < 5%');
  } else {
    console.log('🔴 Needs improvement: Error rate > 5%');
  }
  
  process.exit(0);
}

// Start concurrent requests
console.log('🏁 Starting requests...\n');
for (let i = 0; i < TEST_CONFIG.concurrent; i++) {
  makeRequest();
}
