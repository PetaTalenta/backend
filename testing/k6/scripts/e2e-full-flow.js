/**
 * K6 End-to-End Full Flow Test
 * Complete 14-phase testing from registration to logout
 * 
 * Usage:
 *   k6 run testing/k6/scripts/e2e-full-flow.js
 *   k6 run --env BASE_URL=https://api.futureguide.id testing/k6/scripts/e2e-full-flow.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { CONFIG, generateTestUserEmail, generateIdempotencyKey, getAuthHeaders, getIdempotentHeaders, log } from '../lib/config.js';
import { 
  checkResponse, 
  parseJSON, 
  pollJobStatus, 
  validateResultData,
  extractProfilePersona,
  measurePhase,
  totalFlowTime,
  errorRate,
  successRate,
} from '../lib/helpers.js';
import { generateRandomAssessment } from '../lib/assessment-data.js';

// Test configuration
export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    'http_req_duration': ['p(95)<30000'], // 95% of requests should be below 30s
    'http_req_failed': ['rate<0.05'],     // Error rate should be below 5%
    'errors': ['rate<0.05'],
    'success': ['rate>0.95'],
  },
  tags: {
    test_type: 'e2e',
    test_name: 'full_flow',
  },
};

export default function () {
  const flowStartTime = Date.now();
  const testEmail = generateTestUserEmail();
  const testPassword = CONFIG.TEST_PASSWORD;
  
  let userData = {};
  let tokens = {};
  let jobData = {};
  let resultData = {};
  let conversationData = {};
  
  log('info', '========================================');
  log('info', 'Starting E2E Full Flow Test');
  log('info', `Test User: ${testEmail}`);
  log('info', '========================================');
  
  try {
    // ============================================================
    // PHASE 1: User Registration
    // ============================================================
    group('Phase 1: User Registration', () => {
      measurePhase('Registration', () => {
        const payload = JSON.stringify({
          email: testEmail,
          password: testPassword,
          displayName: 'K6 Test User',
        });
        
        const response = http.post(
          `${CONFIG.BASE_URL}/api/auth/v2/register`,
          payload,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: `${CONFIG.TIMEOUT.HTTP_REQUEST}ms`,
          }
        );
        
        if (checkResponse(response, 'Registration', 201)) {
          const data = parseJSON(response, 'Registration');
          if (data && data.data) {
            userData = data.data;
            tokens.idToken = data.data.idToken;
            tokens.refreshToken = data.data.refreshToken;
            log('info', `✓ User registered: ${userData.uid}`);
          }
        }
      });
    });
    
    sleep(1);
    
    // ============================================================
    // PHASE 2: First Logout
    // ============================================================
    group('Phase 2: First Logout', () => {
      measurePhase('First Logout', () => {
        const payload = JSON.stringify({
          refreshToken: tokens.refreshToken,
        });
        
        const response = http.post(
          `${CONFIG.BASE_URL}/api/auth/v2/logout`,
          payload,
          {
            headers: getAuthHeaders(tokens.idToken),
            timeout: `${CONFIG.TIMEOUT.HTTP_REQUEST}ms`,
          }
        );
        
        checkResponse(response, 'First Logout', 200);
      });
    });
    
    sleep(1);
    
    // ============================================================
    // PHASE 3: Re-login
    // ============================================================
    group('Phase 3: Re-login', () => {
      measurePhase('Re-login', () => {
        const payload = JSON.stringify({
          email: testEmail,
          password: testPassword,
        });
        
        const response = http.post(
          `${CONFIG.BASE_URL}/api/auth/v2/login`,
          payload,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: `${CONFIG.TIMEOUT.HTTP_REQUEST}ms`,
          }
        );
        
        if (checkResponse(response, 'Re-login', 200)) {
          const data = parseJSON(response, 'Re-login');
          if (data && data.data) {
            tokens.idToken = data.data.idToken;
            tokens.refreshToken = data.data.refreshToken;
            log('info', '✓ Re-login successful, new tokens obtained');
          }
        }
      });
    });
    
    sleep(1);
    
    // ============================================================
    // PHASE 4: WebSocket Connection
    // ============================================================
    group('Phase 4: WebSocket Connection', () => {
      log('info', 'WebSocket connection skipped in K6 (limited Socket.IO support)');
      log('info', 'Will use polling fallback for notifications');
      // Note: For full WebSocket testing, use Artillery or custom implementation
    });
    
    sleep(1);
    
    // ============================================================
    // PHASE 5: Get User Profile
    // ============================================================
    group('Phase 5: Get User Profile', () => {
      measurePhase('Get Profile', () => {
        const response = http.get(
          `${CONFIG.BASE_URL}/api/auth/profile`,
          {
            headers: getAuthHeaders(tokens.idToken),
            timeout: `${CONFIG.TIMEOUT.HTTP_REQUEST}ms`,
          }
        );
        
        if (checkResponse(response, 'Get Profile', 200)) {
          const data = parseJSON(response, 'Get Profile');
          if (data && data.data) {
            userData.profile = data.data;
            log('info', `✓ Profile retrieved: ${data.data.email}`);
          }
        }
      });
    });
    
    sleep(1);
    
    // ============================================================
    // PHASE 6: Get Archive Data
    // ============================================================
    group('Phase 6: Get Archive Data', () => {
      measurePhase('Get Archive Results', () => {
        const response = http.get(
          `${CONFIG.BASE_URL}/api/archive/results?page=1&limit=10`,
          {
            headers: getAuthHeaders(tokens.idToken),
            timeout: `${CONFIG.TIMEOUT.HTTP_REQUEST}ms`,
          }
        );
        
        checkResponse(response, 'Get Archive Results', 200);
      });
      
      measurePhase('Get Archive Jobs', () => {
        const response = http.get(
          `${CONFIG.BASE_URL}/api/archive/jobs?page=1&limit=10`,
          {
            headers: getAuthHeaders(tokens.idToken),
            timeout: `${CONFIG.TIMEOUT.HTTP_REQUEST}ms`,
          }
        );
        
        checkResponse(response, 'Get Archive Jobs', 200);
      });
    });
    
    sleep(1);
    
    // ============================================================
    // PHASE 7: Submit Assessment
    // ============================================================
    group('Phase 7: Submit Assessment', () => {
      measurePhase('Submit Assessment', () => {
        const assessmentData = generateRandomAssessment();
        const idempotencyKey = generateIdempotencyKey();
        
        const response = http.post(
          `${CONFIG.BASE_URL}/api/assessment/submit`,
          JSON.stringify(assessmentData),
          {
            headers: getIdempotentHeaders(tokens.idToken, idempotencyKey),
            timeout: `${CONFIG.TIMEOUT.HTTP_REQUEST}ms`,
          }
        );
        
        if (checkResponse(response, 'Submit Assessment', 202)) {
          const data = parseJSON(response, 'Submit Assessment');
          if (data && data.data) {
            jobData = data.data;
            log('info', `✓ Assessment submitted: ${jobData.jobId}`);
            log('info', `  Queue position: ${jobData.queuePosition}`);
            log('info', `  Estimated time: ${jobData.estimatedProcessingTime}`);
          }
        }
      });
    });
    
    sleep(2);
    
    // ============================================================
    // PHASE 8: Wait for WebSocket Notification (Polling Fallback)
    // ============================================================
    group('Phase 8: Wait for Notification (Polling)', () => {
      log('info', 'Using polling fallback instead of WebSocket');
      // Polling will be done in Phase 9
    });
    
    // ============================================================
    // PHASE 9: Poll Job Status
    // ============================================================
    group('Phase 9: Poll Job Status', () => {
      measurePhase('Poll Job Status', () => {
        const result = pollJobStatus(http, jobData.jobId, tokens.idToken, 40);
        if (result) {
          jobData.status = result.status;
          jobData.resultId = result.result_id;
          log('info', `✓ Job completed with status: ${result.status}`);
        } else {
          log('error', '✗ Job polling failed or timed out');
          errorRate.add(1);
        }
      });
    });
    
    sleep(2);

    // ============================================================
    // PHASE 10: Get Result Details
    // ============================================================
    group('Phase 10: Get Result Details', () => {
      if (jobData.resultId && jobData.status === 'completed') {
        measurePhase('Get Result Details', () => {
          const response = http.get(
            `${CONFIG.BASE_URL}/api/archive/results/${jobData.resultId}`,
            {
              headers: getAuthHeaders(tokens.idToken),
              timeout: `${CONFIG.TIMEOUT.HTTP_REQUEST}ms`,
            }
          );

          if (checkResponse(response, 'Get Result Details', 200)) {
            const data = parseJSON(response, 'Get Result Details');
            if (data && data.data) {
              resultData = data.data;
              log('info', `✓ Result retrieved: ${resultData.id}`);
              log('info', `  Archetype: ${resultData.test_result?.archetype || 'N/A'}`);

              // Validate result data quality
              validateResultData(resultData);
            }
          }
        });
      } else {
        log('warn', 'Skipping result retrieval - job not completed or no result ID');
      }
    });

    sleep(1);

    // ============================================================
    // PHASE 11: Create Chatbot Conversation
    // ============================================================
    group('Phase 11: Create Chatbot Conversation', () => {
      if (resultData.test_result) {
        measurePhase('Create Conversation', () => {
          const profilePersona = extractProfilePersona(
            resultData.test_result,
            userData.displayName || 'Test User'
          );

          const payload = JSON.stringify({
            resultsId: resultData.id,
            profilePersona: profilePersona,
            title: 'K6 Test Conversation',
          });

          const response = http.post(
            `${CONFIG.BASE_URL}/api/chatbot/conversations`,
            payload,
            {
              headers: getAuthHeaders(tokens.idToken),
              timeout: `${CONFIG.TIMEOUT.HTTP_REQUEST}ms`,
            }
          );

          if (checkResponse(response, 'Create Conversation', 200)) {
            const data = parseJSON(response, 'Create Conversation');
            if (data && data.data) {
              conversationData = data.data.conversation;
              log('info', `✓ Conversation created: ${conversationData.id}`);
            }
          }
        });
      } else {
        log('warn', 'Skipping chatbot conversation - no result data available');
      }
    });

    sleep(1);

    // ============================================================
    // PHASE 12: Send Chatbot Messages
    // ============================================================
    group('Phase 12: Send Chatbot Messages', () => {
      if (conversationData.id) {
        CONFIG.CHATBOT.TEST_MESSAGES.forEach((message, index) => {
          measurePhase(`Send Message ${index + 1}`, () => {
            const payload = JSON.stringify({
              message: message,
            });

            const response = http.post(
              `${CONFIG.BASE_URL}/api/chatbot/conversations/${conversationData.id}/messages`,
              payload,
              {
                headers: getAuthHeaders(tokens.idToken),
                timeout: `${CONFIG.TIMEOUT.HTTP_REQUEST}ms`,
              }
            );

            if (checkResponse(response, `Send Message ${index + 1}`, 200)) {
              const data = parseJSON(response, `Send Message ${index + 1}`);
              if (data && data.data) {
                log('info', `✓ Message ${index + 1} sent and received response`);
              }
            }
          });

          sleep(2); // Wait between messages
        });
      } else {
        log('warn', 'Skipping chatbot messages - no conversation created');
      }
    });

    sleep(1);

    // ============================================================
    // PHASE 13: Get Conversation Messages
    // ============================================================
    group('Phase 13: Get Conversation Messages', () => {
      if (conversationData.id) {
        measurePhase('Get Messages', () => {
          const response = http.get(
            `${CONFIG.BASE_URL}/api/chatbot/conversations/${conversationData.id}/messages?page=1&limit=50`,
            {
              headers: getAuthHeaders(tokens.idToken),
              timeout: `${CONFIG.TIMEOUT.HTTP_REQUEST}ms`,
            }
          );

          if (checkResponse(response, 'Get Messages', 200)) {
            const data = parseJSON(response, 'Get Messages');
            if (data && data.data) {
              log('info', `✓ Retrieved ${data.data.messages?.length || 0} messages`);
            }
          }
        });
      } else {
        log('warn', 'Skipping get messages - no conversation created');
      }
    });

    sleep(1);

    // ============================================================
    // PHASE 14: Final Logout
    // ============================================================
    group('Phase 14: Final Logout', () => {
      measurePhase('Final Logout', () => {
        const payload = JSON.stringify({
          refreshToken: tokens.refreshToken,
        });

        const response = http.post(
          `${CONFIG.BASE_URL}/api/auth/v2/logout`,
          payload,
          {
            headers: getAuthHeaders(tokens.idToken),
            timeout: `${CONFIG.TIMEOUT.HTTP_REQUEST}ms`,
          }
        );

        checkResponse(response, 'Final Logout', 200);
      });
    });

    // ============================================================
    // Test Summary
    // ============================================================
    const flowDuration = Date.now() - flowStartTime;
    totalFlowTime.add(flowDuration);

    log('info', '========================================');
    log('info', 'E2E Full Flow Test Completed');
    log('info', `Total Duration: ${Math.floor(flowDuration / 1000)}s`);
    log('info', `Job ID: ${jobData.jobId || 'N/A'}`);
    log('info', `Result ID: ${jobData.resultId || 'N/A'}`);
    log('info', `Conversation ID: ${conversationData.id || 'N/A'}`);
    log('info', '========================================');

    successRate.add(1);

  } catch (error) {
    log('error', 'Test flow failed', { error: error.message, stack: error.stack });
    errorRate.add(1);
  }
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  // Simple text summary
  return `
========================================
K6 E2E Test Summary
========================================
Duration: ${data.state.testRunDurationMs}ms
Iterations: ${data.metrics.iterations.values.count}
VUs: ${data.options.vus}

HTTP Requests:
  Total: ${data.metrics.http_reqs?.values.count || 0}
  Failed: ${data.metrics.http_req_failed?.values.rate || 0}
  Duration (avg): ${data.metrics.http_req_duration?.values.avg || 0}ms
  Duration (p95): ${data.metrics.http_req_duration?.values['p(95)'] || 0}ms

Custom Metrics:
  Errors: ${data.metrics.errors?.values.rate || 0}
  Success: ${data.metrics.success?.values.rate || 0}
  Phases Completed: ${data.metrics.phases_completed?.values.count || 0}

========================================
`;
}

