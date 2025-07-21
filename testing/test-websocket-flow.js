// WebSocket flow testing for ATMA
const io = require('socket.io-client');
const { NOTIFICATION_SERVICE_URL } = require('./test-config');

// Global state for WebSocket testing
let socket = null;
let jobCompletionPromise = null;
let jobCompletionResolve = null;
let assessmentSubmissionTime = null;
let userAssessmentTimes = new Map(); // For mass testing

// Test WebSocket connection and authentication
async function testConnectWebSocket(authToken) {
  console.log('\n=== 4. WEBSOCKET CONNECTION ===');

  return new Promise((resolve) => {
    console.log(`Connecting to WebSocket at ${NOTIFICATION_SERVICE_URL}...`);

    socket = io(NOTIFICATION_SERVICE_URL, {
      transports: ['websocket'],
      timeout: 10000
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      console.log(`Socket ID: ${socket.id}`);

      // Authenticate the socket
      console.log('Authenticating WebSocket...');
      socket.emit('authenticate', { token: authToken });
    });

    socket.on('authenticated', (data) => {
      console.log('✅ WebSocket authenticated');
      console.log('Authentication Details:');
      if (data.userId) {
        console.log(`  User ID: ${data.userId}`);
      }
      if (data.message) {
        console.log(`  Message: ${data.message}`);
      }
      if (data.timestamp) {
        console.log(`  Timestamp: ${data.timestamp}`);
      }

      // Show full auth data only in debug mode
      if (process.env.DEBUG_RESPONSE === 'true') {
        console.log('\n=== FULL AUTH DATA (DEBUG) ===');
        console.log(JSON.stringify(data, null, 2));
        console.log('=== END DEBUG ===');
      }
      resolve(true);
    });

    socket.on('auth_error', (error) => {
      console.log('❌ WebSocket authentication failed');
      console.log('Error Details:');
      if (error.message) {
        console.log(`  Message: ${error.message}`);
      }
      if (error.code) {
        console.log(`  Code: ${error.code}`);
      }

      // Show full error only in debug mode
      if (process.env.DEBUG_RESPONSE === 'true') {
        console.log('\n=== FULL ERROR (DEBUG) ===');
        console.log(JSON.stringify(error, null, 2));
        console.log('=== END DEBUG ===');
      }
      resolve(false);
    });

    socket.on('connect_error', (error) => {
      console.log('❌ WebSocket connection failed');
      console.log('Error:', error.message);
      resolve(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
    });

    // Set up notification listeners
    setupNotificationListeners();

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!socket.connected) {
        console.log('❌ WebSocket connection timeout');
        resolve(false);
      }
    }, 10000);
  });
}

// Setup notification listeners for analysis completion
function setupNotificationListeners() {
  if (!socket) return;

  socket.on('analysis-complete', (data) => {
    const notificationTime = Date.now();
    console.log('\n🎉 ANALYSIS COMPLETE NOTIFICATION RECEIVED!');

    // Calculate and display processing time
    if (assessmentSubmissionTime) {
      const processingTime = notificationTime - assessmentSubmissionTime;
      console.log(`⏱️  Processing Time: ${processingTime}ms (${(processingTime / 1000).toFixed(2)}s)`);
      console.log(`   Submitted at: ${new Date(assessmentSubmissionTime).toISOString()}`);
      console.log(`   Completed at: ${new Date(notificationTime).toISOString()}`);
    }

    console.log('Notification Details:');
    if (data.jobId) {
      console.log(`  Job ID: ${data.jobId}`);
    }
    if (data.resultId) {
      console.log(`  Result ID: ${data.resultId}`);
    }
    if (data.userId) {
      console.log(`  User ID: ${data.userId}`);
    }
    if (data.message) {
      console.log(`  Message: ${data.message}`);
    }
    if (data.timestamp) {
      console.log(`  Timestamp: ${data.timestamp}`);
    }

    // Show full notification data only in debug mode
    if (process.env.DEBUG_RESPONSE === 'true') {
      console.log('\n=== FULL NOTIFICATION DATA (DEBUG) ===');
      console.log(JSON.stringify(data, null, 2));
      console.log('=== END DEBUG ===');
    }

    // Resolve job completion promise if waiting
    if (jobCompletionResolve) {
      jobCompletionResolve({ success: true, data });
    }
  });

  socket.on('analysis-failed', (data) => {
    const notificationTime = Date.now();
    console.log('\n❌ ANALYSIS FAILED NOTIFICATION RECEIVED!');

    // Calculate and display processing time even for failures
    if (assessmentSubmissionTime) {
      const processingTime = notificationTime - assessmentSubmissionTime;
      console.log(`⏱️  Processing Time: ${processingTime}ms (${(processingTime / 1000).toFixed(2)}s)`);
      console.log(`   Submitted at: ${new Date(assessmentSubmissionTime).toISOString()}`);
      console.log(`   Failed at: ${new Date(notificationTime).toISOString()}`);
    }

    console.log('Failure Details:');
    if (data.jobId) {
      console.log(`  Job ID: ${data.jobId}`);
    }
    if (data.error) {
      console.log(`  Error: ${data.error}`);
    }
    if (data.userId) {
      console.log(`  User ID: ${data.userId}`);
    }
    if (data.message) {
      console.log(`  Message: ${data.message}`);
    }
    if (data.timestamp) {
      console.log(`  Timestamp: ${data.timestamp}`);
    }

    // Show full notification data only in debug mode
    if (process.env.DEBUG_RESPONSE === 'true') {
      console.log('\n=== FULL NOTIFICATION DATA (DEBUG) ===');
      console.log(JSON.stringify(data, null, 2));
      console.log('=== END DEBUG ===');
    }

    // Resolve job completion promise if waiting
    if (jobCompletionResolve) {
      jobCompletionResolve({ success: false, data });
    }
  });
}

// Monitor job status via WebSocket notifications
async function testMonitorJobStatus(jobId) {
  console.log('\n=== 9. MONITOR JOB STATUS ===');

  if (!jobId) {
    console.log('❌ No job ID available');
    return false;
  }

  if (!socket || !socket.connected) {
    console.log('❌ WebSocket not connected');
    return false;
  }

  console.log(`Monitoring job: ${jobId}`);
  console.log('Waiting for WebSocket notifications...');
  console.log('📡 No more polling! Using real-time notifications via WebSocket.');

  // Create a promise that resolves when job completion notification is received
  jobCompletionPromise = new Promise((resolve) => {
    jobCompletionResolve = resolve;

    // Set a timeout for 5 minutes
    setTimeout(() => {
      if (jobCompletionResolve) {
        console.log('⏰ Timeout reached while waiting for job completion notification');
        resolve({ success: false, timeout: true });
      }
    }, 5 * 60 * 1000); // 5 minutes
  });

  try {
    const result = await jobCompletionPromise;

    // Clean up
    jobCompletionResolve = null;
    jobCompletionPromise = null;

    if (result.timeout) {
      return false;
    }

    if (result.success) {
      console.log('✅ Job completed successfully via notification!');
      if (result.data.resultId) {
        console.log(`Result ID: ${result.data.resultId}`);
      }
      return true;
    } else {
      console.log('❌ Job failed via notification!');
      if (result.data.error) {
        console.log(`Error: ${result.data.error}`);
      }
      return false;
    }
  } catch (error) {
    console.log('❌ Error while waiting for job completion:', error.message);
    return false;
  }
}

// Set assessment submission time for timing calculations
function setAssessmentSubmissionTime() {
  assessmentSubmissionTime = Date.now();
  console.log(`⏱️  Assessment submission started at: ${new Date(assessmentSubmissionTime).toISOString()}`);
}

// Get current socket instance
function getSocket() {
  return socket;
}

// Cleanup WebSocket connections
function cleanupWebSocket() {
  if (jobCompletionResolve) {
    jobCompletionResolve({ success: false, cleanup: true });
    jobCompletionResolve = null;
    jobCompletionPromise = null;
  }

  if (socket) {
    console.log('Disconnecting WebSocket...');
    socket.disconnect();
    socket = null;
  }

  assessmentSubmissionTime = null;
  userAssessmentTimes.clear();
}

module.exports = {
  testConnectWebSocket,
  setupNotificationListeners,
  testMonitorJobStatus,
  setAssessmentSubmissionTime,
  getSocket,
  cleanupWebSocket,
  userAssessmentTimes
};
