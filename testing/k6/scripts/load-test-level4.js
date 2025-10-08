/**
 * K6 Load Test - Level 4: High Load (100 Users)
 * Test system under stress
 * 
 * Usage:
 *   k6 run testing/k6/scripts/load-test-level4.js
 */

import { CONFIG } from '../lib/config.js';

export { default } from './e2e-full-flow.js';

export const options = {
  scenarios: {
    high_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: CONFIG.LOAD_LEVELS.LEVEL_4.rampUp, target: CONFIG.LOAD_LEVELS.LEVEL_4.vus },
        { duration: CONFIG.LOAD_LEVELS.LEVEL_4.duration, target: CONFIG.LOAD_LEVELS.LEVEL_4.vus },
        { duration: '5m', target: 0 },
      ],
      gracefulRampDown: '2m',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<30000'],  // Significant degradation expected
    'http_req_failed': ['rate<0.10'],      // 10% error rate acceptable
    'errors': ['rate<0.10'],
    'success': ['rate>0.90'],
  },
  tags: {
    test_type: 'load',
    test_level: 'level_4',
    test_name: 'high_load',
  },
};

