/**
 * Test Notification Service Flow
 * Menguji alur lengkap submit assessment dan pantau notifikasi
 */

const axios = require('axios');
const io = require('socket.io-client');

// Configuration
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';

// Test credentials
const TEST_USER = {
  email: 'kasykoi@gmail.com',
  password: 'Anjas123'
};

// Sample assessment data (valid RIASEC + OCEAN + VIA-IS for AI-Driven Talent Mapping)
const SAMPLE_ASSESSMENT = {
  assessment_name: 'AI-Driven Talent Mapping',
  assessment_data: {
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
      love_of_learning: 3.9,
      perspective: 3.7
    }
  },
  raw_responses: {
    riasec: [
      { questionId: 'R1', value: 4 },
      { questionId: 'I1', value: 4 },
      { questionId: 'A1', value: 2 }
    ],
    ocean: [
      { questionId: 'O1', value: 4 },
      { questionId: 'C1', value: 4 },
      { questionId: 'E1', value: 4 }
    ],
    viaIs: [
      { questionId: 'V1', value: 4 },
      { questionId: 'V2', value: 4 },
      { questionId: 'V3', value: 4 }
    ]
  }
};

let authToken = null;
let userId = null;
let socket = null;

/**
 * Step 1: Login to get authentication token
 */
async function login() {
  console.log('\n=== STEP 1: LOGIN ===');
  try {
    const response = await axios.post(`${API_GATEWAY_URL}/api/auth/login`, TEST_USER);
    
    if (response.data.success) {
      authToken = response.data.data.token;
      userId = response.data.data.user.id;
      
      console.log('✓ Login successful');
      console.log(`  User ID: ${userId}`);
      console.log(`  Token: ${authToken.substring(0, 20)}...`);
      console.log(`  Token Balance: ${response.data.data.user.token_balance}`);
      
      return true;
    } else {
      console.error('✗ Login failed:', response.data);
      return false;
    }
  } catch (error) {
    console.error('✗ Login error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Step 2: Connect to WebSocket notification service
 */
async function connectWebSocket() {
  console.log('\n=== STEP 2: CONNECT TO WEBSOCKET ===');
  
  return new Promise((resolve, reject) => {
    socket = io(NOTIFICATION_SERVICE_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('✓ WebSocket connected');
      console.log(`  Socket ID: ${socket.id}`);
      
      // Authenticate socket
      socket.emit('authenticate', { token: authToken });
    });

    socket.on('authenticated', (data) => {
      console.log('✓ WebSocket authenticated');
      console.log(`  User: ${data.user}`);
      resolve(true);
    });

    socket.on('authentication_error', (error) => {
      console.error('✗ WebSocket authentication failed:', error);
      reject(error);
    });

    socket.on('connect_error', (error) => {
      console.error('✗ WebSocket connection error:', error.message);
      reject(error);
    });

    socket.on('disconnect', (reason) => {
      console.log(`⚠ WebSocket disconnected: ${reason}`);
    });

    // Set up event listeners for notifications
    socket.on('analysis-started', (data) => {
      console.log('\n📢 NOTIFICATION RECEIVED: Analysis Started');
      console.log('  Data:', JSON.stringify(data, null, 2));
    });

    socket.on('analysis-complete', (data) => {
      console.log('\n📢 NOTIFICATION RECEIVED: Analysis Complete');
      console.log('  Data:', JSON.stringify(data, null, 2));
    });

    socket.on('analysis-failed', (data) => {
      console.log('\n📢 NOTIFICATION RECEIVED: Analysis Failed');
      console.log('  Data:', JSON.stringify(data, null, 2));
    });

    socket.on('error', (error) => {
      console.error('⚠ WebSocket error:', error);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!socket.connected) {
        reject(new Error('WebSocket connection timeout'));
      }
    }, 10000);
  });
}

/**
 * Step 3: Submit assessment
 */
async function submitAssessment() {
  console.log('\n=== STEP 3: SUBMIT ASSESSMENT ===');
  
  try {
    const response = await axios.post(
      `${API_GATEWAY_URL}/api/assessment/submit`,
      SAMPLE_ASSESSMENT,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      console.log('✓ Assessment submitted successfully');
      console.log(`  Job ID: ${response.data.data.jobId}`);
      console.log(`  Result ID: ${response.data.data.resultId}`);
      console.log(`  Status: ${response.data.data.status}`);
      console.log(`  Queue Position: ${response.data.data.queuePosition}`);
      console.log(`  Remaining Tokens: ${response.data.data.remainingTokens}`);
      
      return {
        jobId: response.data.data.jobId,
        resultId: response.data.data.resultId
      };
    } else {
      console.error('✗ Assessment submission failed:', response.data);
      return null;
    }
  } catch (error) {
    console.error('✗ Assessment submission error:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Step 4: Monitor job status
 */
async function monitorJobStatus(jobId, maxAttempts = 20) {
  console.log('\n=== STEP 4: MONITOR JOB STATUS ===');
  console.log(`Monitoring job ${jobId}...`);
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      
      const response = await axios.get(
        `${API_GATEWAY_URL}/api/assessment/status/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      if (response.data.success) {
        const status = response.data.data.status;
        console.log(`[${i + 1}/${maxAttempts}] Status: ${status}`);
        
        if (status === 'completed' || status === 'berhasil') {
          console.log('✓ Job completed successfully!');
          console.log('  Full data:', JSON.stringify(response.data.data, null, 2));
          return true;
        } else if (status === 'failed' || status === 'gagal') {
          console.log('✗ Job failed!');
          console.log('  Error:', response.data.data.error_message);
          return false;
        }
      }
    } catch (error) {
      console.error(`[${i + 1}/${maxAttempts}] Error checking status:`, error.message);
    }
  }
  
  console.log('⚠ Monitoring timeout - job may still be processing');
  return false;
}

/**
 * Step 5: Check notification service health
 */
async function checkNotificationHealth() {
  console.log('\n=== CHECKING NOTIFICATION SERVICE HEALTH ===');
  
  try {
    const response = await axios.get(`${NOTIFICATION_SERVICE_URL}/health`);
    
    if (response.data.success) {
      console.log('✓ Notification service is healthy');
      console.log(`  Status: ${response.data.status}`);
      console.log(`  Active Connections: ${response.data.connections}`);
      console.log(`  Event Consumer: ${response.data.eventConsumer}`);
      return true;
    }
  } catch (error) {
    console.error('✗ Notification service health check failed:', error.message);
    return false;
  }
}

/**
 * Main test flow
 */
async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  NOTIFICATION SERVICE FLOW TEST              ║');
  console.log('╚══════════════════════════════════════════════╝');
  
  try {
    // Check notification service health first
    await checkNotificationHealth();
    
    // Step 1: Login
    const loginSuccess = await login();
    if (!loginSuccess) {
      console.error('\n❌ Test failed: Cannot login');
      process.exit(1);
    }

    // Step 2: Connect to WebSocket
    try {
      await connectWebSocket();
    } catch (error) {
      console.error('\n❌ Test failed: Cannot connect to WebSocket');
      if (socket) socket.close();
      process.exit(1);
    }

    // Step 3: Submit assessment
    const jobData = await submitAssessment();
    if (!jobData) {
      console.error('\n❌ Test failed: Cannot submit assessment');
      if (socket) socket.close();
      process.exit(1);
    }

    // Step 4: Monitor job status
    console.log('\n⏳ Waiting for analysis to complete...');
    console.log('   Watch for real-time notifications above ^');
    
    await monitorJobStatus(jobData.jobId);

    // Give some time to receive final notifications
    console.log('\n⏳ Waiting 5 seconds for any remaining notifications...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║  TEST COMPLETED                              ║');
    console.log('╚══════════════════════════════════════════════╝');
    
    if (socket) {
      socket.close();
      console.log('\n✓ WebSocket connection closed');
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    if (socket) socket.close();
    process.exit(1);
  }
}

// Run the test
main();
