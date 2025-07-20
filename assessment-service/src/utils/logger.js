const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FILE = process.env.LOG_FILE || 'logs/assessment-service.log';

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLogLevel = logLevels[LOG_LEVEL] || logLevels.info;

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  let log = `${timestamp} [${level.toUpperCase().padEnd(5)}]`;

  // Add correlation/job ID if available for easy tracking
  const { correlationId, jobId, userId, userEmail, ...otherMeta } = meta;
  if (correlationId || jobId) {
    const trackingId = correlationId || jobId;
    log += ` [${trackingId.substring(0, 8)}]`;
  }

  log += ` ${message}`;

  // Add user context if available
  if (userId || userEmail) {
    const userInfo = userEmail ? `${userEmail}` : `user:${userId?.substring(0, 8)}`;
    log += ` (${userInfo})`;
  }

  // Format remaining metadata in a clean way
  if (Object.keys(otherMeta).length > 0) {
    const metaStr = Object.entries(otherMeta)
      .filter(([key, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => {
        // Shorten long values and handle objects
        let displayValue;
        if (typeof value === 'object') {
          displayValue = JSON.stringify(value);
        } else {
          displayValue = String(value);
        }

        if (displayValue.length > 50) {
          displayValue = displayValue.substring(0, 47) + '...';
        }
        return `${key}=${displayValue}`;
      })
      .join(' ');
    if (metaStr) {
      log += ` | ${metaStr}`;
    }
  }

  return log;
}

function writeToFile(formattedMessage) {
  if (LOG_FILE && process.env.NODE_ENV !== 'test') {
    const logPath = path.resolve(LOG_FILE);
    fs.appendFileSync(logPath, formattedMessage + '\n');
  }
}

function log(level, message, meta = {}) {
  if (logLevels[level] <= currentLogLevel) {
    const formattedMessage = formatMessage(level, message, meta);

    // Console output with colors (only in development)
    if (process.env.NODE_ENV !== 'production') {
      const colors = {
        error: '\x1b[31m',   // Red
        warn: '\x1b[33m',    // Yellow
        info: '\x1b[36m',    // Cyan
        debug: '\x1b[90m',   // Gray
        reset: '\x1b[0m'     // Reset
      };

      const coloredMessage = `${colors[level] || ''}${formattedMessage}${colors.reset}`;

      if (level === 'error') {
        console.error(coloredMessage);
      } else if (level === 'warn') {
        console.warn(coloredMessage);
      } else {
        console.log(coloredMessage);
      }
    } else {
      // Production: no colors
      if (level === 'error') {
        console.error(formattedMessage);
      } else if (level === 'warn') {
        console.warn(formattedMessage);
      } else {
        console.log(formattedMessage);
      }
    }

    // File output
    writeToFile(formattedMessage);
  }
}

const logger = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  debug: (message, meta) => log('debug', message, meta),

  // Helper functions for better context
  withCorrelation: (correlationId) => ({
    error: (message, meta = {}) => log('error', message, { ...meta, correlationId }),
    warn: (message, meta = {}) => log('warn', message, { ...meta, correlationId }),
    info: (message, meta = {}) => log('info', message, { ...meta, correlationId }),
    debug: (message, meta = {}) => log('debug', message, { ...meta, correlationId })
  }),

  withJob: (jobId, userId, userEmail) => ({
    error: (message, meta = {}) => log('error', message, { ...meta, jobId, userId, userEmail }),
    warn: (message, meta = {}) => log('warn', message, { ...meta, jobId, userId, userEmail }),
    info: (message, meta = {}) => log('info', message, { ...meta, jobId, userId, userEmail }),
    debug: (message, meta = {}) => log('debug', message, { ...meta, jobId, userId, userEmail })
  }),

  withUser: (userId, userEmail) => ({
    error: (message, meta = {}) => log('error', message, { ...meta, userId, userEmail }),
    warn: (message, meta = {}) => log('warn', message, { ...meta, userId, userEmail }),
    info: (message, meta = {}) => log('info', message, { ...meta, userId, userEmail }),
    debug: (message, meta = {}) => log('debug', message, { ...meta, userId, userEmail })
  })
};

module.exports = logger;
