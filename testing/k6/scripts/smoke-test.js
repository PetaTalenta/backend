/**
 * K6 Smoke Test
 * Quick test to verify all endpoints are accessible
 * 
 * Usage:
 *   k6 run testing/k6/scripts/smoke-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG, log } from '../lib/config.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    'http_req_duration': ['p(95)<5000'],
    'http_req_failed': ['rate<0.01'],
  },
};

export default function () {
  const baseUrl = CONFIG.BASE_URL;
  
  // Test health endpoints
  const healthChecks = [
    { name: 'API Gateway Health', url: `${baseUrl}/health` },
    { name: 'Auth V2 Health', url: `${baseUrl}/api/auth/v2/health` },
    { name: 'Assessment Health', url: `${baseUrl}/api/assessment/health` },
  ];
  
  healthChecks.forEach(({ name, url }) => {
    const response = http.get(url);
    const passed = check(response, {
      [`${name}: status is 200`]: (r) => r.status === 200,
      [`${name}: response time < 2s`]: (r) => r.timings.duration < 2000,
    });
    
    if (passed) {
      log('info', `✓ ${name} passed`);
    } else {
      log('error', `✗ ${name} failed`);
    }
  });
  
  sleep(1);
  
  // Test with existing user
  const loginPayload = JSON.stringify({
    email: CONFIG.EXISTING_USER_EMAIL,
    password: CONFIG.EXISTING_USER_PASSWORD,
  });
  
  const loginResponse = http.post(
    `${baseUrl}/api/auth/v2/login`,
    loginPayload,
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  
  const loginPassed = check(loginResponse, {
    'Login: status is 200': (r) => r.status === 200,
    'Login: has token': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data && data.data.idToken;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (loginPassed) {
    log('info', '✓ Login test passed');
    
    const loginData = JSON.parse(loginResponse.body);
    const token = loginData.data.idToken;
    
    // Test authenticated endpoints
    const profileResponse = http.get(
      `${baseUrl}/api/auth/profile`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );
    
    check(profileResponse, {
      'Profile: status is 200': (r) => r.status === 200,
    });
    
    const resultsResponse = http.get(
      `${baseUrl}/api/archive/results?page=1&limit=5`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );
    
    check(resultsResponse, {
      'Archive Results: status is 200': (r) => r.status === 200,
    });
    
    log('info', '✓ Authenticated endpoints test passed');
  } else {
    log('error', '✗ Login test failed');
  }
  
  sleep(1);
}

