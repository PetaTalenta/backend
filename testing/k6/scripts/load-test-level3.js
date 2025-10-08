/**
 * K6 Load Test - Level 3: Medium Load (25 Users)
 * Test realistic concurrent usage
 * 
 * Usage:
 *   k6 run testing/k6/scripts/load-test-level3.js
 */

import { CONFIG } from '../lib/config.js';

export { default } from './e2e-full-flow.js';

export const options = {
  scenarios: {
    medium_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: CONFIG.LOAD_LEVELS.LEVEL_3.rampUp, target: CONFIG.LOAD_LEVELS.LEVEL_3.vus },
        { duration: CONFIG.LOAD_LEVELS.LEVEL_3.duration, target: CONFIG.LOAD_LEVELS.LEVEL_3.vus },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '1m',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<15000'],  // More degradation expected
    'http_req_failed': ['rate<0.05'],      // 5% error rate acceptable
    'errors': ['rate<0.05'],
    'success': ['rate>0.95'],
  },
  tags: {
    test_type: 'load',
    test_level: 'level_3',
    test_name: 'medium_load',
  },
};

