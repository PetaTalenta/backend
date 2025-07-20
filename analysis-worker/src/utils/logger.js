/**
 * Logger utility using Winston
 */

const winston = require('winston');
const path = require('path');

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue'
};

// Add colors to winston
winston.addColors(logColors);

// Create simple, readable format for console
const simpleFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  let log = `${timestamp} [${level.toUpperCase()}] ${message}`;

  // Only add important metadata, skip common fields
  const importantMeta = { ...meta };
  delete importantMeta.service;
  delete importantMeta.version;

  if (Object.keys(importantMeta).length > 0) {
    // Format metadata in a readable way
    const metaStr = Object.entries(importantMeta)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');
    log += ` | ${metaStr}`;
  }

  return log;
});

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'HH:mm:ss'
    }),
    winston.format.errors({ stack: true })
  ),
  defaultMeta: {
    service: 'analysis-worker'
  },
  transports: [
    // File transport for all logs (keep JSON for parsing)
    new winston.transports.File({
      filename: process.env.LOG_FILE || 'logs/analysis-worker.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.json()
      )
    }),

    // File transport for error logs only
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.json()
      )
    })
  ]
});

// Add console transport for development with simple format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      simpleFormat
    )
  }));
}

// Create child logger for specific modules
logger.child = (meta) => {
  return logger.child(meta);
};

module.exports = logger;
