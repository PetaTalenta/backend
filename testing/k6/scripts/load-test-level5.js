/**
 * K6 Load Test - Level 5: Peak Load (200 Users)
 * Test maximum capacity and breaking point
 * 
 * Usage:
 *   k6 run testing/k6/scripts/load-test-level5.js
 */

import { CONFIG } from '../lib/config.js';

export { default } from './e2e-full-flow.js';

export const options = {
  scenarios: {
    peak_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: CONFIG.LOAD_LEVELS.LEVEL_5.rampUp, target: CONFIG.LOAD_LEVELS.LEVEL_5.vus },
        { duration: CONFIG.LOAD_LEVELS.LEVEL_5.duration, target: CONFIG.LOAD_LEVELS.LEVEL_5.vus },
        { duration: '10m', target: 0 },
      ],
      gracefulRampDown: '5m',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<60000'],  // Very high degradation expected
    'http_req_failed': ['rate<0.15'],      // 15% error rate acceptable
    'errors': ['rate<0.15'],
    'success': ['rate>0.85'],
  },
  tags: {
    test_type: 'load',
    test_level: 'level_5',
    test_name: 'peak_load',
  },
};

