/**
 * K6 Load Test - Level 2: Light Load (5 Users)
 * Test basic concurrency handling
 * 
 * Usage:
 *   k6 run testing/k6/scripts/load-test-level2.js
 */

import { CONFIG } from '../lib/config.js';

export { default } from './e2e-full-flow.js';

export const options = {
  scenarios: {
    light_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: CONFIG.LOAD_LEVELS.LEVEL_2.rampUp, target: CONFIG.LOAD_LEVELS.LEVEL_2.vus },
        { duration: CONFIG.LOAD_LEVELS.LEVEL_2.duration, target: CONFIG.LOAD_LEVELS.LEVEL_2.vus },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<10000'],  // Allow some degradation
    'http_req_failed': ['rate<0.02'],      // 2% error rate acceptable
    'errors': ['rate<0.02'],
    'success': ['rate>0.98'],
  },
  tags: {
    test_type: 'load',
    test_level: 'level_2',
    test_name: 'light_load',
  },
};

