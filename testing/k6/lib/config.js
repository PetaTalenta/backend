/**
 * K6 Testing Configuration
 * Central configuration for all test scripts
 */

export const CONFIG = {
  // Base URLs
  BASE_URL: __ENV.BASE_URL || 'https://api.futureguide.id',
  WS_URL: __ENV.WS_URL || 'wss://api.futureguide.id',
  
  // Test User Configuration
  TEST_USER_PREFIX: __ENV.TEST_USER_PREFIX || 'k6test',
  TEST_USER_DOMAIN: __ENV.TEST_USER_DOMAIN || 'example.com',
  TEST_PASSWORD: __ENV.TEST_PASSWORD || 'TestPass123!',
  
  // Existing Test User (for quick tests without registration)
  EXISTING_USER_EMAIL: __ENV.EXISTING_USER_EMAIL || 'kasykoi@gmail.com',
  EXISTING_USER_PASSWORD: __ENV.EXISTING_USER_PASSWORD || 'Anjas123',
  
  // Timeouts (in milliseconds)
  TIMEOUT: {
    HTTP_REQUEST: 30000,        // 30 seconds
    WS_CONNECT: 20000,          // 20 seconds
    WS_AUTH: 10000,             // 10 seconds
    WS_NOTIFICATION: 600000,    // 10 minutes
    ASSESSMENT_PROCESSING: 600000, // 10 minutes
    POLLING_INTERVAL: 3000,     // 3 seconds
    POLLING_MAX_ATTEMPTS: 20,   // 20 attempts = 1 minute
  },
  
  // Performance Thresholds
  THRESHOLDS: {
    // Response Time Targets (P95)
    AUTH_RESPONSE_TIME: 2000,           // 2s
    PROFILE_RESPONSE_TIME: 1000,        // 1s
    ASSESSMENT_SUBMIT_TIME: 3000,       // 3s
    JOB_STATUS_POLL_TIME: 1000,         // 1s
    RESULT_RETRIEVAL_TIME: 2000,        // 2s
    CHATBOT_CREATE_TIME: 5000,          // 5s
    CHATBOT_MESSAGE_TIME: 10000,        // 10s
    WS_CONNECT_TIME: 3000,              // 3s
    
    // Error Rates
    ERROR_RATE_NORMAL: 0.05,            // 5%
    ERROR_RATE_STRESS: 0.10,            // 10%
    
    // Success Rates
    SUCCESS_RATE_MIN: 0.95,             // 95%
  },
  
  // Load Testing Levels
  LOAD_LEVELS: {
    LEVEL_1: {
      name: 'Baseline',
      vus: 1,
      duration: '10m',
      rampUp: '0s',
      iterations: 1,
    },
    LEVEL_2: {
      name: 'Light Load',
      vus: 5,
      duration: '15m',
      rampUp: '50s',
      iterations: 1,
    },
    LEVEL_3: {
      name: 'Medium Load',
      vus: 25,
      duration: '30m',
      rampUp: '2m30s',
      iterations: 2,
    },
    LEVEL_4: {
      name: 'High Load',
      vus: 100,
      duration: '60m',
      rampUp: '10m',
      iterations: 3,
    },
    LEVEL_5: {
      name: 'Peak Load',
      vus: 200,
      duration: '120m',
      rampUp: '10m',
      iterations: 2,
    },
  },
  
  // Assessment Configuration
  ASSESSMENT: {
    NAME: 'AI-Driven Talent Mapping',
    TOKEN_COST: 1,
  },
  
  // Chatbot Configuration
  CHATBOT: {
    TEST_MESSAGES: [
      'Bisakah kamu jelaskan lebih detail tentang archetype saya?',
      'Apa langkah konkret yang bisa saya ambil untuk mengembangkan karir saya?',
      'Bagaimana cara mengembangkan kelemahan yang kamu sebutkan?',
    ],
  },
  
  // Logging
  LOG_LEVEL: __ENV.LOG_LEVEL || 'info', // debug, info, warn, error
  VERBOSE: __ENV.VERBOSE === 'true',
};

/**
 * Get HTTP headers for authenticated requests
 */
export function getAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Get HTTP headers with idempotency key
 */
export function getIdempotentHeaders(token, idempotencyKey) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Idempotency-Key': idempotencyKey,
  };
}

/**
 * Generate unique test user email
 */
export function generateTestUserEmail() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${CONFIG.TEST_USER_PREFIX}_${timestamp}_${random}@${CONFIG.TEST_USER_DOMAIN}`;
}

/**
 * Generate unique idempotency key
 */
export function generateIdempotencyKey() {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Log message based on log level
 */
export function log(level, message, data = null) {
  const levels = ['debug', 'info', 'warn', 'error'];
  const currentLevelIndex = levels.indexOf(CONFIG.LOG_LEVEL);
  const messageLevelIndex = levels.indexOf(level);
  
  if (messageLevelIndex >= currentLevelIndex) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(logMessage);
    
    if (data && CONFIG.VERBOSE) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

export default CONFIG;

