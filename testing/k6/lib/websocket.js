/**
 * WebSocket Utilities for K6
 * Helper functions for WebSocket testing with Socket.IO
 * 
 * Note: K6 has limited WebSocket support. For full Socket.IO testing,
 * consider using the k6-socketio extension or alternative approaches.
 */

import { check, sleep } from 'k6';
import ws from 'k6/ws';
import { CONFIG, log } from './config.js';
import { errorRate, successRate, wsConnectionTime, wsNotificationDelay } from './helpers.js';

/**
 * Connect to WebSocket and authenticate
 * Returns connection info and notification promise
 */
export function connectWebSocket(token, userId) {
  const startTime = Date.now();
  let authenticated = false;
  let notifications = [];
  
  log('info', 'Attempting WebSocket connection...');
  
  const url = CONFIG.WS_URL;
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    tags: { name: 'WebSocket' },
  };
  
  const response = ws.connect(url, params, function (socket) {
    socket.on('open', function () {
      const connectTime = Date.now() - startTime;
      wsConnectionTime.add(connectTime);
      log('info', `✓ WebSocket connected in ${connectTime}ms`);
      
      // Authenticate
      socket.send(JSON.stringify({
        type: 'authenticate',
        token: token,
      }));
      
      log('debug', 'Sent authentication message');
    });
    
    socket.on('message', function (data) {
      try {
        const message = JSON.parse(data);
        log('debug', 'Received WebSocket message', message);
        
        // Handle authentication response
        if (message.type === 'authenticated' || message.event === 'authenticated') {
          authenticated = true;
          log('info', '✓ WebSocket authenticated successfully');
          successRate.add(1);
        }
        
        // Handle auth error
        if (message.type === 'auth_error' || message.event === 'auth_error') {
          log('error', '✗ WebSocket authentication failed', message);
          errorRate.add(1);
        }
        
        // Handle analysis events
        if (message.event === 'analysis-started' || message.type === 'analysis-started') {
          log('info', '📢 Received analysis-started notification', message.data);
          notifications.push({
            type: 'analysis-started',
            data: message.data,
            timestamp: Date.now(),
          });
        }
        
        if (message.event === 'analysis-complete' || message.type === 'analysis-complete') {
          log('info', '📢 Received analysis-complete notification', message.data);
          notifications.push({
            type: 'analysis-complete',
            data: message.data,
            timestamp: Date.now(),
          });
        }
        
        if (message.event === 'analysis-failed' || message.type === 'analysis-failed') {
          log('warn', '📢 Received analysis-failed notification', message.data);
          notifications.push({
            type: 'analysis-failed',
            data: message.data,
            timestamp: Date.now(),
          });
        }
      } catch (e) {
        log('error', 'Failed to parse WebSocket message', {
          error: e.message,
          data: data,
        });
      }
    });
    
    socket.on('error', function (e) {
      log('error', 'WebSocket error', { error: e });
      errorRate.add(1);
    });
    
    socket.on('close', function () {
      log('info', 'WebSocket connection closed');
    });
    
    // Keep connection alive for testing
    socket.setTimeout(function () {
      log('debug', 'WebSocket timeout - closing connection');
      socket.close();
    }, CONFIG.TIMEOUT.WS_NOTIFICATION);
  });
  
  return {
    authenticated,
    notifications,
    response,
  };
}

/**
 * Wait for specific WebSocket notification
 * This is a simplified version - in real testing you'd need more sophisticated handling
 */
export function waitForNotification(notifications, type, jobId, maxWaitMs = 600000) {
  const startTime = Date.now();
  const checkInterval = 1000; // Check every second
  const maxAttempts = Math.floor(maxWaitMs / checkInterval);
  
  log('info', `Waiting for ${type} notification for job ${jobId}...`);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Check if notification received
    const notification = notifications.find(n => 
      n.type === type && 
      (n.data.jobId === jobId || n.data.job_id === jobId)
    );
    
    if (notification) {
      const delay = Date.now() - startTime;
      wsNotificationDelay.add(delay);
      log('info', `✓ Received ${type} notification after ${delay}ms`);
      return notification;
    }
    
    sleep(checkInterval / 1000);
  }
  
  log('error', `✗ Timeout waiting for ${type} notification after ${maxWaitMs}ms`);
  errorRate.add(1);
  return null;
}

/**
 * Mock WebSocket connection for testing without actual WS
 * Useful for load testing where WS connections might be limited
 */
export function mockWebSocketNotifications(jobId, shouldFail = false) {
  log('info', 'Using mock WebSocket notifications');
  
  return {
    authenticated: true,
    notifications: [
      {
        type: 'analysis-started',
        data: {
          jobId: jobId,
          status: 'processing',
          assessment_name: 'AI-Driven Talent Mapping',
          message: 'Your analysis has started processing...',
          estimated_time: '2-5 minutes',
          timestamp: new Date().toISOString(),
        },
        timestamp: Date.now(),
      },
      {
        type: shouldFail ? 'analysis-failed' : 'analysis-complete',
        data: {
          jobId: jobId,
          status: shouldFail ? 'failed' : 'completed',
          result_id: shouldFail ? null : `result-${jobId}`,
          assessment_name: 'AI-Driven Talent Mapping',
          error_message: shouldFail ? 'Mock error for testing' : undefined,
          timestamp: new Date().toISOString(),
        },
        timestamp: Date.now() + 180000, // 3 minutes later
      },
    ],
  };
}

/**
 * Validate WebSocket notification data
 */
export function validateNotification(notification, expectedType, expectedJobId) {
  const checks = {
    'Notification type matches': notification && notification.type === expectedType,
    'Notification has data': notification && notification.data,
    'Notification has timestamp': notification && notification.timestamp,
    'Job ID matches': notification && 
      (notification.data.jobId === expectedJobId || notification.data.job_id === expectedJobId),
  };
  
  const passed = Object.values(checks).every(v => v);
  
  if (passed) {
    log('info', '✓ Notification validation passed');
    successRate.add(1);
  } else {
    log('error', '✗ Notification validation failed', checks);
    errorRate.add(1);
  }
  
  return passed;
}

/**
 * Note about K6 WebSocket limitations:
 * 
 * K6's WebSocket support is basic and doesn't fully support Socket.IO protocol.
 * For comprehensive WebSocket testing with Socket.IO, consider:
 * 
 * 1. Using k6-socketio extension (if available)
 * 2. Using Artillery (better Socket.IO support)
 * 3. Implementing custom Socket.IO client in k6
 * 4. Using polling as fallback for load testing
 * 
 * For this test suite, we'll use a hybrid approach:
 * - Single user tests: Attempt real WebSocket connection
 * - Load tests: Use polling fallback to avoid connection limits
 */

export default {
  connectWebSocket,
  waitForNotification,
  mockWebSocketNotifications,
  validateNotification,
};

