const axios = require('axios');
const io = require('socket.io-client');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const SOCKET_URL = 'http://localhost:3000';

// Test data
const testUser = {
  email: `test${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'End-to-End Test User',
  username: `testuser${Date.now()}`
};

let authToken = null;
let userId = null;
let jobId = null;
let socket = null;
let notificationReceived = false;

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to log with timestamp
const log = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

// Step 1: Register new user
async function registerUser() {
  log('===== STEP 1: REGISTERING NEW USER =====');
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
      email: testUser.email,
      password: testUser.password,
      name: testUser.name,
      username: testUser.username
    });
    
    log('✓ User registered successfully', response.data);
    return true;
  } catch (error) {
    log('✗ Registration failed', error.response?.data || error.message);
    return false;
  }
}

// Step 2: Login
async function loginUser() {
  log('===== STEP 2: LOGGING IN =====');
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    // Handle different response structures
    const data = response.data.data || response.data;
    authToken = data.token;
    userId = data.user?.id || data.userId;
    
    log('✓ Login successful', {
      userId: userId,
      token: authToken.substring(0, 20) + '...',
      user: data.user
    });
    return true;
  } catch (error) {
    log('✗ Login failed', error.response?.data || error.message);
    return false;
  }
}

// Step 3: Connect to Socket.IO
async function connectWebSocket() {
  log('===== STEP 3: CONNECTING TO SOCKET.IO =====');
  
  return new Promise((resolve, reject) => {
    try {
      socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000
      });
      
      socket.on('connect', () => {
        log('✓ Socket.IO connected successfully', { socketId: socket.id });
        
        // Authenticate the socket
        socket.emit('authenticate', { token: authToken });
      });
      
      socket.on('authenticated', (data) => {
        log('✓ Socket authenticated', data);
        resolve(true);
      });
      
      socket.on('auth_error', (error) => {
        log('✗ Socket authentication error', error);
        reject(new Error(error.message || 'Authentication failed'));
      });
      
      socket.on('connect_error', (error) => {
        log('✗ Socket connection error', error.message);
        reject(error);
      });
      
      socket.on('disconnect', (reason) => {
        log('⚠ Socket disconnected', { reason });
      });
      
      socket.on('notification', (notification) => {
        log('📨 Notification received', notification);
        
        // Check if this is about our analysis job
        if (notification.type === 'analysis_complete' && notification.data?.jobId === jobId) {
          log('✓ Analysis completion notification received!', notification);
          notificationReceived = true;
        }
      });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (!socket.connected) {
          reject(new Error('Socket connection timeout'));
        }
      }, 10000);
    } catch (error) {
      log('✗ Socket setup failed', error.message);
      reject(error);
    }
  });
}

// Step 4: Submit assessment for analysis
async function createAnalysisJob() {
  log('===== STEP 4: SUBMITTING ASSESSMENT =====');
  
  try {
    // Sample assessment data based on documentation
    const assessmentData = {
      assessment_name: "AI-Driven Talent Mapping",
      assessment_data: {
        riasec: {
          realistic: 75,
          investigative: 80,
          artistic: 65,
          social: 70,
          enterprising: 85,
          conventional: 60
        },
        ocean: {
          openness: 80,
          conscientiousness: 75,
          extraversion: 70,
          agreeableness: 85,
          neuroticism: 40
        },
        viaIs: {
          creativity: 80,
          curiosity: 85,
          judgment: 75,
          loveOfLearning: 90,
          perspective: 70,
          bravery: 65,
          perseverance: 80,
          honesty: 85,
          zest: 75
        },
        industryScore: {
          teknologi: 24,
          kesehatan: 20,
          keuangan: 18
        }
      }
    };
    
    const response = await axios.post(
      `${API_BASE_URL}/api/assessment/submit`,
      assessmentData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    jobId = response.data.data?.jobId || response.data.jobId;
    log('✓ Assessment submitted successfully', response.data);
    return true;
  } catch (error) {
    log('✗ Failed to submit assessment', error.response?.data || error.message);
    return false;
  }
}

// Step 5: Wait for analysis to complete
async function waitForAnalysisCompletion() {
  log('===== STEP 5: WAITING FOR ANALYSIS COMPLETION =====');
  
  const maxWaitTime = 120000; // 2 minutes
  const checkInterval = 5000; // 5 seconds
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/assessment/status/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      const job = response.data.data || response.data;
      log(`Job status: ${job.status}`, { jobId, status: job.status, progress: job.progress });
      
      if (job.status === 'completed') {
        log('✓ Analysis completed successfully!', job);
        return true;
      } else if (job.status === 'failed') {
        log('✗ Analysis failed', job);
        return false;
      }
      
      // Wait before checking again
      await wait(checkInterval);
    } catch (error) {
      log('Error checking job status', error.response?.data || error.message);
      await wait(checkInterval);
    }
  }
  
  log('✗ Analysis timed out');
  return false;
}

// Step 6: Get analysis results
async function getAnalysisResults() {
  log('===== STEP 6: FETCHING ANALYSIS RESULTS =====');
  
  try {
    // First get job details to find the result_id
    const jobResponse = await axios.get(
      `${API_BASE_URL}/api/archive/jobs/${jobId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    const resultId = jobResponse.data.data?.result_id || jobResponse.data.result_id;
    
    if (!resultId) {
      log('⚠ Job does not have result_id yet');
      return null;
    }
    
    log(`Found result_id: ${resultId}`);
    
    // Now get the actual result using result_id
    const response = await axios.get(
      `${API_BASE_URL}/api/archive/results/${resultId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    log('✓ Analysis results retrieved', {
      resultId,
      archetype: response.data.data?.test_result?.archetype,
      status: response.data.data?.status
    });
    return response.data;
  } catch (error) {
    log('✗ Failed to get analysis results', error.response?.data || error.message);
    return null;
  }
}

// Step 7: Ask chatbot about the results
async function askChatbot() {
  log('===== STEP 7: TESTING CHATBOT INTERACTION =====');
  
  let conversationId = null;
  let successCount = 0;
  
  try {
    // First, create a conversation with profile persona
    log('\n📝 Creating conversation with profile persona...');
    const createConvResponse = await axios.post(
      `${API_BASE_URL}/api/chatbot/conversations`,
      {
        title: "End-to-End Test Conversation",
        profilePersona: {
          name: "Test User",
          education: "Computer Science Graduate",
          personality: "Analytical and creative problem solver",
          interests: ["Technology", "Innovation", "Career Development"],
          strengths: ["Problem-solving", "Communication"],
          careerGoals: "Understand my career potential based on assessment results"
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    conversationId = createConvResponse.data.data?.conversation?.id;
    log('✓ Conversation created', { conversationId });
    
    if (!conversationId) {
      log('✗ Failed to get conversation ID');
      return false;
    }
    
    // Check if there are initial messages
    if (createConvResponse.data.data?.initial_messages) {
      log('✓ Initial AI greeting received', {
        messageCount: createConvResponse.data.data.initial_messages.length
      });
      successCount++;
    }
    
    await wait(2000);
    
    // Now ask questions about the assessment
    const questions = [
      'Berdasarkan profil saya, apa kekuatan utama yang bisa saya manfaatkan dalam karir?',
      'Jalur karir apa yang cocok untuk kepribadian saya?',
      'Bagaimana saya bisa mengembangkan potensi saya lebih lanjut?'
    ];
    
    for (const question of questions) {
      log(`\n📝 Question: "${question}"`);
      
      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/chatbot/conversations/${conversationId}/messages`,
          {
            content: question,
            content_type: "text"
          },
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        const data = response.data.data;
        const answer = data?.assistant_message?.content || data?.response;
        
        log('✓ Chatbot response received');
        console.log('\n💬 Answer:', answer.substring(0, 200) + (answer.length > 200 ? '...' : ''));
        
        // Check if response is relevant (not empty and has reasonable length)
        if (answer && answer.length > 50) {
          log('✓ Response appears relevant and detailed', {
            length: answer.length,
            model: data?.usage?.model,
            tokens: data?.usage?.total_tokens
          });
          successCount++;
        } else {
          log('⚠ Response seems too short or generic');
        }
        
        // Wait a bit between questions
        await wait(2000);
      } catch (error) {
        log('✗ Chatbot message request failed', error.response?.data || error.message);
      }
    }
    
    log(`\n📊 Chatbot test summary: ${successCount}/${questions.length + 1} interactions successful`);
    return successCount > 0;
    
  } catch (error) {
    log('✗ Chatbot conversation creation failed', error.response?.data || error.message);
    return false;
  }
}

// Step 8: Cleanup
async function cleanup() {
  log('===== STEP 8: CLEANUP =====');
  
  if (socket) {
    socket.disconnect();
    log('✓ Socket connection closed');
  }
  
  log('✓ Test cleanup completed');
}

// Main test flow
async function runEndToEndTest() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        END-TO-END TESTING: ATMA BACKEND SYSTEM           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  let allTestsPassed = true;
  const testResults = {
    registration: false,
    login: false,
    websocket: false,
    jobCreation: false,
    jobCompletion: false,
    resultsRetrieval: false,
    chatbot: false
  };
  
  try {
    // Run all tests in sequence
    testResults.registration = await registerUser();
    if (!testResults.registration) {
      allTestsPassed = false;
      throw new Error('Registration failed');
    }
    
    await wait(2000);
    
    testResults.login = await loginUser();
    if (!testResults.login) {
      allTestsPassed = false;
      throw new Error('Login failed');
    }
    
    await wait(2000);
    
    // Try to connect WebSocket but don't fail if it doesn't work
    try {
      testResults.websocket = await connectWebSocket();
      await wait(2000);
    } catch (error) {
      log('⚠ WebSocket connection failed, but continuing test...', error.message);
      testResults.websocket = false;
    }
    
    testResults.jobCreation = await createAnalysisJob();
    if (!testResults.jobCreation) {
      allTestsPassed = false;
      throw new Error('Job creation failed');
    }
    
    await wait(3000);
    
    testResults.jobCompletion = await waitForAnalysisCompletion();
    if (!testResults.jobCompletion) {
      allTestsPassed = false;
      log('⚠ Analysis did not complete, but continuing with chatbot test...');
    }
    
    if (testResults.jobCompletion) {
      await wait(2000);
      const results = await getAnalysisResults();
      testResults.resultsRetrieval = results !== null;
    }
    
    await wait(2000);
    
    testResults.chatbot = await askChatbot();
    
  } catch (error) {
    log('❌ Test execution error', error.message);
    allTestsPassed = false;
  } finally {
    await cleanup();
  }
  
  // Print final summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  Object.entries(testResults).forEach(([test, passed]) => {
    const icon = passed ? '✓' : '✗';
    const status = passed ? 'PASSED' : 'FAILED';
    console.log(`  ${icon} ${test.toUpperCase().padEnd(20)} : ${status}`);
  });
  
  console.log('\n');
  const passedTests = Object.values(testResults).filter(v => v).length;
  const totalTests = Object.keys(testResults).length;
  console.log(`  Overall: ${passedTests}/${totalTests} tests passed`);
  console.log('\n');
  
  if (allTestsPassed && passedTests === totalTests) {
    console.log('  🎉 ALL TESTS PASSED! 🎉');
  } else {
    console.log('  ⚠ SOME TESTS FAILED');
  }
  console.log('\n');
  
  process.exit(allTestsPassed && passedTests === totalTests ? 0 : 1);
}

// Run the test
runEndToEndTest().catch(error => {
  console.error('Unhandled error:', error);
  cleanup();
  process.exit(1);
});
