/**
 * K6 Testing Helper Functions
 * Reusable utilities for test scripts
 */

import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { CONFIG, log } from './config.js';

// Custom Metrics
export const errorRate = new Rate('errors');
export const successRate = new Rate('success');
export const phaseCompletionTime = new Trend('phase_completion_time');
export const totalFlowTime = new Trend('total_flow_time');
export const wsConnectionTime = new Trend('ws_connection_time');
export const wsNotificationDelay = new Trend('ws_notification_delay');
export const assessmentProcessingTime = new Trend('assessment_processing_time');
export const phaseCounter = new Counter('phases_completed');

/**
 * Check HTTP response and log results
 */
export function checkResponse(response, phaseName, expectedStatus = 200) {
  const checks = {
    [`${phaseName}: status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${phaseName}: response has body`]: (r) => r.body && r.body.length > 0,
    [`${phaseName}: response time < ${CONFIG.TIMEOUT.HTTP_REQUEST}ms`]: (r) =>
      r.timings.duration < CONFIG.TIMEOUT.HTTP_REQUEST,
  };

  const result = check(response, checks);

  if (result) {
    successRate.add(1);
    log('info', `✓ ${phaseName} passed`);
  } else {
    errorRate.add(1);
    log('error', `✗ ${phaseName} failed`, {
      status: response.status,
      body: response.body,
      duration: response.timings.duration,
    });
  }

  return result;
}

/**
 * Parse JSON response safely
 */
export function parseJSON(response, phaseName) {
  try {
    return JSON.parse(response.body);
  } catch (e) {
    log('error', `${phaseName}: Failed to parse JSON`, {
      error: e.message,
      body: response.body,
    });
    errorRate.add(1);
    return null;
  }
}

/**
 * Wait with exponential backoff
 */
export function exponentialBackoff(attempt, baseDelay = 1000, maxDelay = 30000) {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  sleep(delay / 1000); // k6 sleep takes seconds
  return delay;
}

/**
 * Retry function with exponential backoff
 */
export function retry(fn, maxAttempts = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = fn();
      if (result) {
        return result;
      }
    } catch (e) {
      log('warn', `Retry attempt ${attempt + 1}/${maxAttempts} failed`, {
        error: e.message,
      });
    }
    
    if (attempt < maxAttempts - 1) {
      exponentialBackoff(attempt, baseDelay);
    }
  }
  
  log('error', `All ${maxAttempts} retry attempts failed`);
  return null;
}

/**
 * Poll job status until completed or failed
 */
export function pollJobStatus(http, jobId, token, maxAttempts = 20) {
  const startTime = Date.now();
  log('info', `Polling job status for ${jobId}`);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    sleep(CONFIG.TIMEOUT.POLLING_INTERVAL / 1000);
    
    const response = http.get(
      `${CONFIG.BASE_URL}/api/archive/jobs/${jobId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        timeout: `${CONFIG.TIMEOUT.HTTP_REQUEST}ms`,
      }
    );
    
    if (response.status === 200) {
      const data = parseJSON(response, 'Poll Job Status');
      if (data && data.data) {
        const status = data.data.status;
        log('debug', `Job ${jobId} status: ${status}`);
        
        if (status === 'completed') {
          const duration = Date.now() - startTime;
          assessmentProcessingTime.add(duration);
          log('info', `✓ Job completed in ${duration}ms`);
          return data.data;
        } else if (status === 'failed') {
          log('error', `✗ Job failed`, data.data);
          errorRate.add(1);
          return data.data;
        }
      }
    } else {
      log('warn', `Poll attempt ${attempt + 1} failed with status ${response.status}`);
    }
  }
  
  log('error', `Job polling timeout after ${maxAttempts} attempts`);
  errorRate.add(1);
  return null;
}

/**
 * Validate assessment result data quality
 */
export function validateResultData(result) {
  const checks = {
    'Result has archetype': result.test_result && result.test_result.archetype,
    'Result has recommendations': result.test_result && 
      result.test_result.recommendations && 
      result.test_result.recommendations.length >= 3,
    'Result has strengths': result.test_result && 
      result.test_result.strengths && 
      result.test_result.strengths.length > 0,
    'Result has weaknesses': result.test_result && 
      result.test_result.weaknesses && 
      result.test_result.weaknesses.length > 0,
    'Result has insights': result.test_result && result.test_result.insights,
    'Result status is completed': result.status === 'completed',
  };
  
  const passed = Object.values(checks).every(v => v);
  
  if (passed) {
    log('info', '✓ Result data quality validation passed');
    successRate.add(1);
  } else {
    log('error', '✗ Result data quality validation failed', checks);
    errorRate.add(1);
  }
  
  return passed;
}

/**
 * Extract profile persona from test result
 */
export function extractProfilePersona(testResult, userName = 'Test User') {
  if (!testResult) {
    log('warn', 'No test result provided for persona extraction');
    return null;
  }
  
  const persona = {
    name: userName,
    personality: testResult.archetype || 'Unknown',
    strengths: testResult.strengths || [],
    interests: [],
    careerGoals: '',
  };
  
  // Extract interests from recommendations
  if (testResult.recommendations && testResult.recommendations.length > 0) {
    persona.interests = testResult.recommendations
      .slice(0, 3)
      .map(rec => rec.careerName || rec.career_name);
    persona.careerGoals = testResult.recommendations[0].careerName || 
      testResult.recommendations[0].career_name || '';
  }
  
  return persona;
}

/**
 * Measure phase execution time
 */
export function measurePhase(phaseName, fn) {
  const startTime = Date.now();
  log('info', `Starting phase: ${phaseName}`);
  
  try {
    const result = fn();
    const duration = Date.now() - startTime;
    phaseCompletionTime.add(duration);
    phaseCounter.add(1);
    log('info', `✓ Phase ${phaseName} completed in ${duration}ms`);
    return result;
  } catch (e) {
    const duration = Date.now() - startTime;
    log('error', `✗ Phase ${phaseName} failed after ${duration}ms`, {
      error: e.message,
    });
    errorRate.add(1);
    throw e;
  }
}

/**
 * Generate random assessment data variation
 */
export function getRandomAssessmentVariation() {
  const variations = ['balanced', 'investigative', 'artistic'];
  const index = Math.floor(Math.random() * variations.length);
  return variations[index];
}

/**
 * Sleep with random jitter
 */
export function sleepWithJitter(baseSeconds, jitterPercent = 0.2) {
  const jitter = baseSeconds * jitterPercent * (Math.random() - 0.5) * 2;
  const totalSeconds = baseSeconds + jitter;
  sleep(Math.max(0.1, totalSeconds));
}

/**
 * Format duration in human readable format
 */
export function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export default {
  checkResponse,
  parseJSON,
  exponentialBackoff,
  retry,
  pollJobStatus,
  validateResultData,
  extractProfilePersona,
  measurePhase,
  getRandomAssessmentVariation,
  sleepWithJitter,
  formatDuration,
};

