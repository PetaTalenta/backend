import axios from 'axios';
import { io } from 'socket.io-client';
import { config } from './config.js';
import logger from './logger.js';
import { generateTestEmail, testPassword, assessmentData } from './test-data.js';
import fs from 'fs';

// Test state
const state = {
  email: generateTestEmail(),
  password: testPassword,
  uid: null,
  idToken: null,
  refreshToken: null,
  userId: null,
  jobId: null,
  resultId: null,
  conversationId: null,
  socket: null,
  wsAuthenticated: false,
  wsEvents: []
};

// Test results
const results = [];

// Axios instance
const api = axios.create({
  baseURL: config.baseURL,
  timeout: config.timeout.http,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Helper function to add auth header
function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${state.idToken}`
  };
}

// Helper function to sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Phase 1: User Registration
async function phase1_register() {
  logger.startPhase(1, 'User Registration');
  const startTime = Date.now();

  try {
    logger.info(`Registering user: ${state.email}`);

    const response = await api.post('/api/auth/v2/register', {
      email: state.email,
      password: state.password,
      displayName: 'Test User'
    });

    if (response.status === 200 || response.status === 201) {
      // Handle different response formats
      const responseData = response.data;

      // Check if response has nested data structure
      const data = responseData.data || responseData;

      // Check if data has the expected structure
      if (data.idToken) {
        state.uid = data.uid;
        state.idToken = data.idToken;
        state.refreshToken = data.refreshToken;

        logger.success('Registration successful');
        logger.data('UID', state.uid);
        logger.data('Email', data.email);
        logger.data('Token received', state.idToken ? 'Yes' : 'No');

        logger.endPhase(true);
        results.push({ name: 'User Registration', success: true, duration: Date.now() - startTime });
        return true;
      } else {
        logger.error('Response missing required fields (idToken)');
        logger.json(responseData);
        throw new Error('Invalid response format - missing idToken');
      }
    } else {
      throw new Error(`Unexpected status code: ${response.status}`);
    }
  } catch (error) {
    logger.error('Registration failed', error);
    logger.endPhase(false);
    results.push({ name: 'User Registration', success: false, duration: Date.now() - startTime, error: error.message });
    return false;
  }
}

// Phase 2: First Logout
async function phase2_logout() {
  logger.startPhase(2, 'First Logout');
  const startTime = Date.now();
  
  try {
    logger.info('Logging out...');
    
    const response = await api.post('/api/auth/v2/logout', {
      refreshToken: state.refreshToken
    }, {
      headers: getAuthHeaders()
    });
    
    if (response.status === 200) {
      logger.success('Logout successful');
      
      logger.endPhase(true);
      results.push({ name: 'First Logout', success: true, duration: Date.now() - startTime });
      return true;
    } else {
      throw new Error('Invalid response');
    }
  } catch (error) {
    logger.error('Logout failed', error);
    logger.endPhase(false);
    results.push({ name: 'First Logout', success: false, duration: Date.now() - startTime, error: error.message });
    return false;
  }
}

// Phase 3: Re-login
async function phase3_login() {
  logger.startPhase(3, 'Re-login');
  const startTime = Date.now();

  try {
    logger.info(`Logging in with: ${state.email}`);

    const response = await api.post('/api/auth/v2/login', {
      email: state.email,
      password: state.password
    });

    if (response.status === 200) {
      // Handle nested data structure
      const responseData = response.data;
      const data = responseData.data || responseData;

      if (data.idToken) {
        state.uid = data.uid;
        state.idToken = data.idToken;
        state.refreshToken = data.refreshToken;

        logger.success('Login successful');
        logger.data('New token received', 'Yes');

        logger.endPhase(true);
        results.push({ name: 'Re-login', success: true, duration: Date.now() - startTime });
        return true;
      } else {
        throw new Error('Invalid response format - missing idToken');
      }
    } else {
      throw new Error(`Unexpected status code: ${response.status}`);
    }
  } catch (error) {
    logger.error('Login failed', error);
    logger.endPhase(false);
    results.push({ name: 'Re-login', success: false, duration: Date.now() - startTime, error: error.message });
    return false;
  }
}

// Phase 4: WebSocket Connection
async function phase4_websocket() {
  logger.startPhase(4, 'WebSocket Connection');
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    try {
      logger.info('Connecting to WebSocket...');
      
      state.socket = io(config.wsURL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000
      });
      
      // Connection timeout
      const connectTimeout = setTimeout(() => {
        logger.error('WebSocket connection timeout');
        logger.endPhase(false);
        results.push({ name: 'WebSocket Connection', success: false, duration: Date.now() - startTime, error: 'Connection timeout' });
        resolve(false);
      }, config.timeout.wsConnect);
      
      state.socket.on('connect', () => {
        clearTimeout(connectTimeout);
        logger.success('WebSocket connected');
        logger.info('Authenticating...');
        
        // Authenticate
        state.socket.emit('authenticate', { token: state.idToken });
        
        // Authentication timeout
        const authTimeout = setTimeout(() => {
          logger.error('WebSocket authentication timeout');
          logger.endPhase(false);
          results.push({ name: 'WebSocket Connection', success: false, duration: Date.now() - startTime, error: 'Authentication timeout' });
          resolve(false);
        }, config.timeout.wsAuth);
        
        state.socket.on('authenticated', (data) => {
          clearTimeout(authTimeout);
          state.wsAuthenticated = true;
          state.userId = data.userId;
          
          logger.success('WebSocket authenticated');
          logger.data('User ID', data.userId);
          logger.data('Email', data.email);
          
          // Setup event listeners
          setupWebSocketListeners();
          
          logger.endPhase(true);
          results.push({ name: 'WebSocket Connection', success: true, duration: Date.now() - startTime });
          resolve(true);
        });
        
        state.socket.on('auth_error', (error) => {
          clearTimeout(authTimeout);
          logger.error('WebSocket authentication failed', error);
          logger.endPhase(false);
          results.push({ name: 'WebSocket Connection', success: false, duration: Date.now() - startTime, error: 'Authentication failed' });
          resolve(false);
        });
      });
      
      state.socket.on('connect_error', (error) => {
        clearTimeout(connectTimeout);
        logger.error('WebSocket connection error', error);
        logger.endPhase(false);
        results.push({ name: 'WebSocket Connection', success: false, duration: Date.now() - startTime, error: error.message });
        resolve(false);
      });
      
    } catch (error) {
      logger.error('WebSocket setup failed', error);
      logger.endPhase(false);
      results.push({ name: 'WebSocket Connection', success: false, duration: Date.now() - startTime, error: error.message });
      resolve(false);
    }
  });
}

// Setup WebSocket event listeners
function setupWebSocketListeners() {
  state.socket.on('analysis-started', (data) => {
    logger.info(`📢 WebSocket Event: analysis-started`);
    logger.data('Job ID', data.jobId);
    logger.data('Status', data.status);
    state.wsEvents.push({ event: 'analysis-started', data, timestamp: Date.now() });
  });

  state.socket.on('analysis-complete', (data) => {
    logger.success(`📢 WebSocket Event: analysis-complete`);
    logger.data('Status', data.status);
    logger.data('Result ID', data.result_id);
    logger.data('Assessment Name', data.assessment_name);
    state.wsEvents.push({ event: 'analysis-complete', data, timestamp: Date.now() });
  });

  state.socket.on('analysis-failed', (data) => {
    logger.error(`📢 WebSocket Event: analysis-failed`);
    logger.data('Status', data.status);
    logger.data('Assessment Name', data.assessment_name);
    logger.data('Error', data.error_message);
    state.wsEvents.push({ event: 'analysis-failed', data, timestamp: Date.now() });
  });
}

// Phase 5: Get User Profile
async function phase5_getProfile() {
  logger.startPhase(5, 'Get User Profile');
  const startTime = Date.now();
  
  try {
    logger.info('Fetching user profile...');
    
    const response = await api.get('/api/auth/profile', {
      headers: getAuthHeaders()
    });

    if (response.status === 200 && response.data) {
      // Handle both nested and flat response structures
      const responseData = response.data;
      const profile = responseData.data || responseData;

      logger.success('Profile retrieved successfully');
      logger.data('User ID', profile.id);
      logger.data('Email', profile.email);
      logger.data('Username', profile.username);
      logger.data('Token Balance', profile.token_balance);

      logger.endPhase(true);
      results.push({ name: 'Get User Profile', success: true, duration: Date.now() - startTime });
      return true;
    } else {
      throw new Error('Invalid response');
    }
  } catch (error) {
    logger.error('Failed to get profile', error);
    logger.endPhase(false);
    results.push({ name: 'Get User Profile', success: false, duration: Date.now() - startTime, error: error.message });
    return false;
  }
}

// Phase 6: Get Archive Data
async function phase6_getArchive() {
  logger.startPhase(6, 'Get Archive Data');
  const startTime = Date.now();

  try {
    logger.info('Fetching archive results...');

    const resultsResponse = await api.get('/api/archive/results', {
      headers: getAuthHeaders(),
      params: { page: 1, limit: 10 }
    });

    logger.success('Archive results retrieved');
    logger.data('Total results', resultsResponse.data.total || 0);

    logger.info('Fetching archive jobs...');

    const jobsResponse = await api.get('/api/archive/jobs', {
      headers: getAuthHeaders(),
      params: { page: 1, limit: 10 }
    });

    logger.success('Archive jobs retrieved');
    logger.data('Total jobs', jobsResponse.data.total || 0);

    logger.endPhase(true);
    results.push({ name: 'Get Archive Data', success: true, duration: Date.now() - startTime });
    return true;
  } catch (error) {
    logger.error('Failed to get archive data', error);
    logger.endPhase(false);
    results.push({ name: 'Get Archive Data', success: false, duration: Date.now() - startTime, error: error.message });
    return false;
  }
}

// Phase 7: Submit Assessment
async function phase7_submitAssessment() {
  logger.startPhase(7, 'Submit Assessment');
  const startTime = Date.now();

  try {
    logger.info('Submitting assessment...');
    logger.data('Assessment Data Keys', Object.keys(assessmentData));

    const response = await api.post('/api/assessment/submit', assessmentData, {
      headers: {
        ...getAuthHeaders(),
        'X-Idempotency-Key': `test-${Date.now()}`
      }
    });

    logger.data('Response Status', response.status);

    if ((response.status === 200 || response.status === 202) && response.data) {
      const responseData = response.data;
      const data = responseData.data || responseData;

      if (data.jobId) {
        state.jobId = data.jobId;

        logger.success('Assessment submitted successfully');
        logger.data('Job ID', state.jobId);
        logger.data('Status', data.status);
        logger.data('Queue Position', data.queuePosition);
        logger.data('Estimated Processing Time', data.estimatedProcessingTime);

        logger.endPhase(true);
        results.push({ name: 'Submit Assessment', success: true, duration: Date.now() - startTime });
        return true;
      } else {
        throw new Error('Invalid response format - missing jobId');
      }
    } else {
      throw new Error(`Unexpected status code: ${response.status}`);
    }
  } catch (error) {
    logger.error('Failed to submit assessment', error);
    if (error.response?.data) {
      logger.data('Request Body Keys', Object.keys(assessmentData));
      logger.data('assessment_name', assessmentData.assessment_name);
      logger.data('assessment_data keys', Object.keys(assessmentData.assessment_data || {}));
      logger.data('raw_responses type', typeof assessmentData.raw_responses);
    }
    logger.endPhase(false);
    results.push({ name: 'Submit Assessment', success: false, duration: Date.now() - startTime, error: error.message });
    return false;
  }
}

// Phase 8: Wait for WebSocket Notification
async function phase8_waitForNotification() {
  logger.startPhase(8, 'Wait for WebSocket Notification');
  const startTime = Date.now();

  return new Promise((resolve) => {
    logger.info('Waiting for analysis notification...');
    logger.info(`Timeout: ${config.timeout.wsNotification / 1000} seconds`);
    logger.info(`Submitted Job ID: ${state.jobId}`);

    const checkInterval = setInterval(() => {
      // Note: analysis-complete and analysis-failed events do NOT contain jobId
      // We check for any complete/failed event since we're only submitting one job at a time
      const completeEvent = state.wsEvents.find(e => e.event === 'analysis-complete');
      const failedEvent = state.wsEvents.find(e => e.event === 'analysis-failed');

      if (completeEvent) {
        clearInterval(checkInterval);
        clearTimeout(timeout);

        state.resultId = completeEvent.data.result_id;

        logger.success('Received analysis-complete notification');
        logger.data('Status', completeEvent.data.status);
        logger.data('Result ID', state.resultId);
        logger.data('Assessment Name', completeEvent.data.assessment_name);
        logger.data('Time elapsed', `${(Date.now() - startTime) / 1000}s`);

        // Wait 10 seconds for database update to complete
        logger.info('Waiting 10 seconds for database update...');
        setTimeout(async () => {
          await sleep(10000);
          logger.endPhase(true);
          results.push({ name: 'Wait for WebSocket Notification', success: true, duration: Date.now() - startTime });
          resolve(true);
        }, 0);
      } else if (failedEvent) {
        clearInterval(checkInterval);
        clearTimeout(timeout);

        logger.error('Received analysis-failed notification');
        logger.data('Status', failedEvent.data.status);
        logger.data('Error', failedEvent.data.error_message);
        logger.data('Assessment Name', failedEvent.data.assessment_name);

        logger.endPhase(false);
        results.push({ name: 'Wait for WebSocket Notification', success: false, duration: Date.now() - startTime, error: 'Analysis failed' });
        resolve(false);
      }
    }, 1000);

    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      logger.warning('Notification timeout - will try polling instead');
      logger.endPhase(true); // Not a failure, we'll poll instead
      results.push({ name: 'Wait for WebSocket Notification', success: true, duration: Date.now() - startTime, note: 'Timeout, will poll' });
      resolve(true);
    }, config.timeout.wsNotification);
  });
}

// Phase 9: Poll Job Status
async function phase9_pollJobStatus() {
  logger.startPhase(9, 'Poll Job Status');
  const startTime = Date.now();

  try {
    logger.info(`Polling job status for: ${state.jobId}`);

    let attempts = 0;
    let jobCompleted = false;

    while (attempts < config.test.maxPollingAttempts && !jobCompleted) {
      attempts++;

      logger.info(`Polling attempt ${attempts}/${config.test.maxPollingAttempts}`);

      const response = await api.get(`/api/archive/jobs/${state.jobId}`, {
        headers: getAuthHeaders()
      });

      // Handle both nested and flat response structures
      const responseData = response.data;
      const job = responseData.data || responseData;

      logger.data('Status', job.status);
      logger.data('Job ID', job.job_id);

      if (job.status === 'completed') {
        jobCompleted = true;
        state.resultId = job.result_id;

        logger.success('Job completed successfully');
        logger.data('Result ID', state.resultId);
        logger.data('Archetype', job.archetype);

        logger.endPhase(true);
        results.push({ name: 'Poll Job Status', success: true, duration: Date.now() - startTime });
        return true;
      } else if (job.status === 'failed') {
        logger.error('Job failed');
        logger.data('Error', job.error_message);

        logger.endPhase(false);
        results.push({ name: 'Poll Job Status', success: false, duration: Date.now() - startTime, error: 'Job failed' });
        return false;
      }

      // Wait before next poll
      await sleep(config.timeout.pollingInterval);
    }

    if (!jobCompleted) {
      logger.error('Polling timeout - job still not completed');
      logger.endPhase(false);
      results.push({ name: 'Poll Job Status', success: false, duration: Date.now() - startTime, error: 'Polling timeout' });
      return false;
    }
  } catch (error) {
    logger.error('Failed to poll job status', error);
    logger.endPhase(false);
    results.push({ name: 'Poll Job Status', success: false, duration: Date.now() - startTime, error: error.message });
    return false;
  }
}

// Phase 10: Get Result Details
async function phase10_getResultDetails() {
  logger.startPhase(10, 'Get Result Details');
  const startTime = Date.now();

  try {
    if (!state.resultId) {
      throw new Error('No result ID available');
    }

    logger.info(`Fetching result details for: ${state.resultId}`);

    const response = await api.get(`/api/archive/results/${state.resultId}`, {
      headers: getAuthHeaders()
    });

    if (response.status === 200 && response.data) {
      const result = response.data.data;

      logger.success('Result details retrieved successfully');
      logger.data('Status', result.status);
      logger.data('Assessment Name', result.assessment_name);
      logger.data('Archetype', result.test_result?.archetype);
      logger.data('Career Recommendations', result.test_result?.careerRecommendation?.length || 0);
      logger.data('Strengths', result.test_result?.strengths?.length || 0);
      logger.data('Weaknesses', result.test_result?.weaknesses?.length || 0);

      logger.endPhase(true);
      results.push({ name: 'Get Result Details', success: true, duration: Date.now() - startTime });
      return true;
    } else {
      throw new Error('Invalid response');
    }
  } catch (error) {
    logger.error('Failed to get result details', error);
    logger.endPhase(false);
    results.push({ name: 'Get Result Details', success: false, duration: Date.now() - startTime, error: error.message });
    return false;
  }
}

// Phase 11: Create Chatbot Conversation
async function phase11_createConversation() {
  logger.startPhase(11, 'Create Chatbot Conversation');
  const startTime = Date.now();

  try {
    if (!state.resultId) {
      throw new Error('No result ID available');
    }

    logger.info('Creating chatbot conversation...');

    // First, get the result to extract profile persona
    const resultResponse = await api.get(`/api/archive/results/${state.resultId}`, {
      headers: getAuthHeaders()
    });

    const testResult = resultResponse.data.data.test_result;

    const profilePersona = {
      name: 'Test User',
      personality: testResult?.archetype || 'Unknown',
      strengths: testResult?.strengths?.slice(0, 3) || [],
      interests: testResult?.careerRecommendation?.slice(0, 2).map(c => c.careerName) || [],
      careerGoals: testResult?.careerRecommendation?.[0]?.careerName || 'Career development'
    };

    const response = await api.post('/api/chatbot/conversations', {
      resultsId: state.resultId,
      profilePersona: profilePersona,
      title: 'Test Conversation'
    }, {
      headers: getAuthHeaders()
    });

    if ((response.status === 200 || response.status === 201) && response.data.data && response.data.data.conversation) {
      state.conversationId = response.data.data.conversation.id;

      logger.success('Conversation created successfully');
      logger.data('Conversation ID', state.conversationId);
      logger.data('Title', response.data.data.conversation.title);
      logger.data('Initial Messages', response.data.data.initial_message ? 2 : 0);

      logger.endPhase(true);
      results.push({ name: 'Create Chatbot Conversation', success: true, duration: Date.now() - startTime });
      return true;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    logger.error('Failed to create conversation', error);
    logger.endPhase(false);
    results.push({ name: 'Create Chatbot Conversation', success: false, duration: Date.now() - startTime, error: error.message });
    return false;
  }
}

// Phase 12: Send Chatbot Messages
async function phase12_sendMessages() {
  logger.startPhase(12, 'Send Chatbot Messages');
  const startTime = Date.now();

  try {
    if (!state.conversationId) {
      throw new Error('No conversation ID available');
    }

    logger.info(`Sending ${config.test.chatbotMessages.length} test messages...`);

    for (let i = 0; i < config.test.chatbotMessages.length; i++) {
      const message = config.test.chatbotMessages[i];

      logger.info(`\nMessage ${i + 1}/${config.test.chatbotMessages.length}`);
      logger.data('Question', message);

      const response = await api.post(
        `/api/chatbot/conversations/${state.conversationId}/messages`,
        { content: message },
        { headers: getAuthHeaders() }
      );

      if (response.status === 200 && response.data.success && response.data.data.assistant_message) {
        logger.success('Response received');
        logger.data('Response length', response.data.data.assistant_message.content.length + ' chars');
        logger.data('Processing time', response.data.data.processing_time);

        // Wait a bit between messages
        if (i < config.test.chatbotMessages.length - 1) {
          await sleep(2000);
        }
      } else {
        throw new Error('Invalid response format');
      }
    }

    logger.success('All messages sent successfully');
    logger.endPhase(true);
    results.push({ name: 'Send Chatbot Messages', success: true, duration: Date.now() - startTime });
    return true;
  } catch (error) {
    logger.error('Failed to send messages', error);
    logger.endPhase(false);
    results.push({ name: 'Send Chatbot Messages', success: false, duration: Date.now() - startTime, error: error.message });
    return false;
  }
}

// Phase 13: Get Conversation Messages
async function phase13_getMessages() {
  logger.startPhase(13, 'Get Conversation Messages');
  const startTime = Date.now();

  try {
    if (!state.conversationId) {
      throw new Error('No conversation ID available');
    }

    logger.info('Fetching conversation messages...');

    const response = await api.get(
      `/api/chatbot/conversations/${state.conversationId}/messages`,
      {
        headers: getAuthHeaders(),
        params: { page: 1, limit: 50, include_usage: true }
      }
    );

    if (response.status === 200 && response.data.messages) {
      logger.success('Messages retrieved successfully');
      logger.data('Total messages', response.data.messages.length);
      logger.data('User messages', response.data.messages.filter(m => m.sender === 'user').length);
      logger.data('Assistant messages', response.data.messages.filter(m => m.sender === 'assistant').length);

      logger.endPhase(true);
      results.push({ name: 'Get Conversation Messages', success: true, duration: Date.now() - startTime });
      return true;
    } else {
      throw new Error('Invalid response');
    }
  } catch (error) {
    logger.error('Failed to get messages', error);
    logger.endPhase(false);
    results.push({ name: 'Get Conversation Messages', success: false, duration: Date.now() - startTime, error: error.message });
    return false;
  }
}

// Phase 14: Final Logout
async function phase14_finalLogout() {
  logger.startPhase(14, 'Final Logout');
  const startTime = Date.now();

  try {
    logger.info('Logging out...');

    const response = await api.post('/api/auth/v2/logout', {
      refreshToken: state.refreshToken
    }, {
      headers: getAuthHeaders()
    });

    if (response.status === 200) {
      logger.success('Logout successful');

      // Close WebSocket
      if (state.socket) {
        state.socket.disconnect();
        logger.success('WebSocket disconnected');
      }

      logger.endPhase(true);
      results.push({ name: 'Final Logout', success: true, duration: Date.now() - startTime });
      return true;
    } else {
      throw new Error('Invalid response');
    }
  } catch (error) {
    logger.error('Logout failed', error);
    logger.endPhase(false);
    results.push({ name: 'Final Logout', success: false, duration: Date.now() - startTime, error: error.message });
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════════════╗'.cyan);
  console.log('║                    ATMA Backend E2E Testing Suite                          ║'.cyan);
  console.log('║                         Vanilla JavaScript Edition                         ║'.cyan);
  console.log('╚════════════════════════════════════════════════════════════════════════════╝'.cyan);
  console.log('\n');

  logger.info(`Base URL: ${config.baseURL}`);
  logger.info(`WebSocket URL: ${config.wsURL}`);
  logger.info(`Test Email: ${state.email}`);
  console.log('\n');

  try {
    // Run all phases sequentially
    let success = true;

    // Phase 1: Register
    success = await phase1_register();
    if (!success) {
      logger.error('Test stopped due to registration failure');
      return;
    }

    // Phase 2: First Logout
    success = await phase2_logout();
    if (!success) {
      logger.warning('First logout failed, continuing...');
    }

    // Phase 3: Re-login
    success = await phase3_login();
    if (!success) {
      logger.error('Test stopped due to login failure');
      return;
    }

    // Phase 4: WebSocket Connection
    success = await phase4_websocket();
    if (!success) {
      logger.warning('WebSocket connection failed, continuing without real-time notifications...');
    }

    // Phase 5: Get Profile
    success = await phase5_getProfile();
    if (!success) {
      logger.warning('Get profile failed, continuing...');
    }

    // Phase 6: Get Archive
    success = await phase6_getArchive();
    if (!success) {
      logger.warning('Get archive failed, continuing...');
    }

    // Phase 7: Submit Assessment
    success = await phase7_submitAssessment();
    if (!success) {
      logger.error('Test stopped due to assessment submission failure');
      return;
    }

    // Phase 8: Wait for Notification
    success = await phase8_waitForNotification();
    // Continue regardless of notification timeout

    // Phase 9: Poll Job Status
    success = await phase9_pollJobStatus();
    if (!success) {
      logger.error('Test stopped due to job polling failure');
      return;
    }

    // Phase 10: Get Result Details
    success = await phase10_getResultDetails();
    if (!success) {
      logger.warning('Get result details failed, continuing...');
    }

    // Phase 11: Create Conversation
    success = await phase11_createConversation();
    if (!success) {
      logger.warning('Create conversation failed, skipping chatbot tests...');
    } else {
      // Phase 12: Send Messages
      success = await phase12_sendMessages();
      if (!success) {
        logger.warning('Send messages failed, continuing...');
      }

      // Phase 13: Get Messages
      success = await phase13_getMessages();
      if (!success) {
        logger.warning('Get messages failed, continuing...');
      }
    }

    // Phase 14: Final Logout
    await phase14_finalLogout();

  } catch (error) {
    logger.error('Unexpected error during test execution', error);
  } finally {
    // Display summary
    logger.summary(results);

    // Save results to file
    const reportData = {
      timestamp: new Date().toISOString(),
      testEmail: state.email,
      baseURL: config.baseURL,
      results: results,
      state: {
        jobId: state.jobId,
        resultId: state.resultId,
        conversationId: state.conversationId,
        wsAuthenticated: state.wsAuthenticated,
        wsEventsReceived: state.wsEvents.length
      }
    };

    const reportFilename = `test-report-${Date.now()}.json`;
    fs.writeFileSync(reportFilename, JSON.stringify(reportData, null, 2));
    logger.info(`Test report saved to: ${reportFilename}`);

    // Cleanup
    if (state.socket) {
      state.socket.disconnect();
    }

    // Exit with appropriate code
    const allPassed = results.every(r => r.success);
    process.exit(allPassed ? 0 : 1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

