/**
 * Week 2 Implementation Test Script
 * Tests for Stuck Job Monitor and Enhanced Notifications
 * 
 * Prerequisites:
 * - All services running in Docker
 * - Database accessible
 * - Test user account available
 * 
 * Test Coverage:
 * 1. Stuck Job Detection (processing timeout)
 * 2. Stuck Job Detection (queued timeout)
 * 3. Token Refund for Stuck Jobs
 * 4. Enhanced Notifications with resultId
 * 5. End-to-end flow verification
 */

const axios = require('axios');
const { Pool } = require('pg');

// Configuration
const config = {
  assessmentService: process.env.ASSESSMENT_SERVICE_URL || 'http://localhost:3003',
  authService: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  archiveService: process.env.ARCHIVE_SERVICE_URL || 'http://localhost:3002',
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY || 'internal_service_secret_key_change_in_production',
  
  // Test user credentials
  testUser: {
    email: 'kasykoi@gmail.com',
    password: 'Anjas123'
  },
  
  // Database config
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'atma_db',
    user: process.env.DB_USER || 'atma_user',
    password: process.env.DB_PASSWORD || 'secret-passworrd'
  }
};

// Database pool
const pool = new Pool(config.db);

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Helper: Log test result
 */
function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (details) {
    console.log(`   ${details}`);
  }
  
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

/**
 * Helper: Login and get token
 */
async function login() {
  try {
    const response = await axios.post(`${config.authService}/auth/login`, {
      email: config.testUser.email,
      password: config.testUser.password
    });
    
    return {
      token: response.data.data.token,
      userId: response.data.data.user.id,
      email: response.data.data.user.email,
      tokenBalance: response.data.data.user.token_balance
    };
  } catch (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
}

/**
 * Helper: Create a stuck job in database (simulate)
 */
async function createStuckJob(userId, status, minutesAgo) {
  const client = await pool.connect();
  
  try {
    // Create job in archive.analysis_jobs
    const jobId = `test-stuck-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date(Date.now() - minutesAgo * 60 * 1000);
    
    const insertJobQuery = `
      INSERT INTO archive.analysis_jobs (job_id, user_id, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, job_id, user_id, status, created_at, updated_at
    `;
    
    const result = await client.query(insertJobQuery, [
      jobId,
      userId,
      status,
      timestamp,
      timestamp
    ]);
    
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Helper: Get job from database
 */
async function getJob(jobId) {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT * FROM archive.analysis_jobs
      WHERE job_id = $1
    `;
    
    const result = await client.query(query, [jobId]);
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Helper: Delete test job
 */
async function deleteTestJob(jobId) {
  const client = await pool.connect();
  
  try {
    await client.query('DELETE FROM archive.analysis_jobs WHERE job_id = $1', [jobId]);
  } finally {
    client.release();
  }
}

/**
 * Helper: Get user token balance
 */
async function getUserTokenBalance(userId, token) {
  try {
    const response = await axios.get(`${config.authService}/auth/token-balance`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data.data.token_balance;
  } catch (error) {
    throw new Error(`Failed to get token balance: ${error.message}`);
  }
}

/**
 * Test 1: Stuck Job Monitor - Processing Timeout
 */
async function testStuckJobProcessingTimeout(userInfo) {
  console.log('\n📋 Test 1: Stuck Job Monitor - Processing Timeout');
  
  let testJob = null;
  
  try {
    // Create a stuck job (processing for 15 minutes)
    testJob = await createStuckJob(userInfo.userId, 'processing', 15);
    console.log(`   Created test job: ${testJob.job_id}`);
    
    // Get initial token balance
    const initialBalance = await getUserTokenBalance(userInfo.userId, userInfo.token);
    console.log(`   Initial token balance: ${initialBalance}`);

    // Trigger stuck job monitor manually via API
    console.log('   Triggering stuck job monitor...');
    const triggerResponse = await axios.post(
      `${config.assessmentService}/health/stuck-jobs/check`,
      {},
      {
        headers: {
          'X-Internal-Service': 'true',
          'X-Service-Key': config.internalServiceKey
        }
      }
    );

    console.log(`   Monitor result: ${JSON.stringify(triggerResponse.data.data)}`);

    // Wait a bit for database to update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if job status changed to failed
    const updatedJob = await getJob(testJob.job_id);
    
    if (updatedJob.status === 'failed') {
      logTest('Stuck job detected and marked as failed', true, `Job ${testJob.job_id} status: ${updatedJob.status}`);
      
      // Check token refund
      const finalBalance = await getUserTokenBalance(userInfo.userId, userInfo.token);
      console.log(`   Final token balance: ${finalBalance}`);
      
      if (finalBalance > initialBalance) {
        logTest('Token refunded for stuck job', true, `Refunded: ${finalBalance - initialBalance} tokens`);
      } else {
        logTest('Token refunded for stuck job', false, 'Token balance did not increase');
      }
    } else {
      logTest('Stuck job detected and marked as failed', false, `Job status: ${updatedJob.status} (expected: failed)`);
    }
    
  } catch (error) {
    logTest('Stuck job processing timeout test', false, error.message);
  } finally {
    // Cleanup
    if (testJob) {
      await deleteTestJob(testJob.job_id);
      console.log(`   Cleaned up test job: ${testJob.job_id}`);
    }
  }
}

/**
 * Test 2: Stuck Job Monitor - Queued Timeout
 */
async function testStuckJobQueuedTimeout(userInfo) {
  console.log('\n📋 Test 2: Stuck Job Monitor - Queued Timeout');
  
  let testJob = null;
  
  try {
    // Create a stuck job (queued for 20 minutes)
    testJob = await createStuckJob(userInfo.userId, 'queued', 20);
    console.log(`   Created test job: ${testJob.job_id}`);

    // Trigger stuck job monitor manually via API
    console.log('   Triggering stuck job monitor...');
    const triggerResponse = await axios.post(
      `${config.assessmentService}/health/stuck-jobs/check`,
      {},
      {
        headers: {
          'X-Internal-Service': 'true',
          'X-Service-Key': config.internalServiceKey
        }
      }
    );

    console.log(`   Monitor result: ${JSON.stringify(triggerResponse.data.data)}`);

    // Wait a bit for database to update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if job status changed to failed
    const updatedJob = await getJob(testJob.job_id);
    
    if (updatedJob.status === 'failed') {
      logTest('Queued stuck job detected and marked as failed', true, `Job ${testJob.job_id} status: ${updatedJob.status}`);
    } else {
      logTest('Queued stuck job detected and marked as failed', false, `Job status: ${updatedJob.status} (expected: failed)`);
    }
    
  } catch (error) {
    logTest('Stuck job queued timeout test', false, error.message);
  } finally {
    // Cleanup
    if (testJob) {
      await deleteTestJob(testJob.job_id);
      console.log(`   Cleaned up test job: ${testJob.job_id}`);
    }
  }
}

/**
 * Test 3: Enhanced Notifications with resultId
 */
async function testEnhancedNotifications(userInfo) {
  console.log('\n📋 Test 3: Enhanced Notifications with resultId');

  try {
    // Submit a complete assessment to test notifications
    const assessmentData = {
      riasec: {
        R: 15,
        I: 20,
        A: 25,
        S: 30,
        E: 20,
        C: 15
      },
      ocean: {
        O: 70,
        C: 65,
        E: 75,
        A: 80,
        N: 40
      },
      disc: {
        D: 25,
        I: 20,
        S: 30,
        C: 25
      },
      viaIs: {
        creativity: 4,
        curiosity: 5,
        judgment: 4,
        love_of_learning: 5,
        perspective: 4,
        bravery: 3,
        perseverance: 4,
        honesty: 5,
        zest: 4,
        love: 5,
        kindness: 5,
        social_intelligence: 4,
        teamwork: 4,
        fairness: 5,
        leadership: 3,
        forgiveness: 4,
        humility: 4,
        prudence: 3,
        self_regulation: 4,
        appreciation_of_beauty: 4,
        gratitude: 5,
        hope: 4,
        humor: 3,
        spirituality: 3
      }
    };

    console.log('   Submitting complete assessment...');
    const response = await axios.post(
      `${config.assessmentService}/assessment/submit`,
      { assessment_data: assessmentData },
      {
        headers: {
          'Authorization': `Bearer ${userInfo.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      const jobId = response.data.data.jobId;
      const resultId = response.data.data.resultId;
      
      console.log(`   Job submitted: ${jobId}`);
      console.log(`   Result ID: ${resultId}`);
      
      if (resultId) {
        logTest('Assessment submission includes resultId', true, `resultId: ${resultId}`);
      } else {
        logTest('Assessment submission includes resultId', false, 'resultId is missing');
      }
      
      // Wait for processing to start
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check job status via Archive Service
      try {
        const jobResponse = await axios.get(
          `${config.archiveService}/archive/jobs/${jobId}`,
          {
            headers: {
              'X-Internal-Service': 'true',
              'X-Service-Key': config.internalServiceKey
            }
          }
        );

        const job = jobResponse.data.data;
        console.log(`   Job status: ${job.status}`);
        console.log(`   Job result_id: ${job.result_id}`);

        if (job.result_id === resultId) {
          logTest('Job linked to result via result_id', true, `result_id: ${job.result_id}`);
        } else {
          logTest('Job linked to result via result_id', false, `Expected: ${resultId}, Got: ${job.result_id}`);
        }

        // Check if job is processing or completed
        if (job.status === 'processing' || job.status === 'completed') {
          logTest('Job status updated correctly', true, `status: ${job.status}`);
        } else {
          logTest('Job status updated correctly', false, `status: ${job.status}`);
        }
      } catch (jobError) {
        logTest('Job verification', false, `Failed to get job: ${jobError.message}`);
      }
      
    } else {
      logTest('Enhanced notifications test', false, 'Assessment submission failed');
    }
    
  } catch (error) {
    logTest('Enhanced notifications test', false, error.message);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Week 2 Implementation Tests');
  console.log('================================\n');
  
  try {
    // Login
    console.log('🔐 Logging in...');
    const userInfo = await login();
    console.log(`✅ Logged in as: ${userInfo.email}`);
    console.log(`   User ID: ${userInfo.userId}`);
    console.log(`   Token Balance: ${userInfo.tokenBalance}`);
    
    // Run tests
    await testStuckJobProcessingTimeout(userInfo);
    await testStuckJobQueuedTimeout(userInfo);
    await testEnhancedNotifications(userInfo);
    
    // Print summary
    console.log('\n================================');
    console.log('📊 Test Summary');
    console.log('================================');
    console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`);
    
    // Close database pool
    await pool.end();
    
    process.exit(testResults.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

// Run tests
runTests();

