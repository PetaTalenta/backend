/**
 * K6 Load Test - Level 1: Baseline (1 User)
 * Establish baseline performance metrics
 * 
 * Usage:
 *   k6 run testing/k6/scripts/load-test-level1.js
 */

import { CONFIG } from '../lib/config.js';
import exec from './e2e-full-flow.js';

export { default } from './e2e-full-flow.js';

export const options = {
  scenarios: {
    baseline: {
      executor: 'constant-vus',
      vus: CONFIG.LOAD_LEVELS.LEVEL_1.vus,
      duration: CONFIG.LOAD_LEVELS.LEVEL_1.duration,
      gracefulStop: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<5000'],  // Baseline should be fast
    'http_req_failed': ['rate<0.01'],     // Very low error rate expected
    'errors': ['rate<0.01'],
    'success': ['rate>0.99'],
  },
  tags: {
    test_type: 'load',
    test_level: 'level_1',
    test_name: 'baseline',
  },
};

