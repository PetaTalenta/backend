const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists - use relative path to avoid Windows path issues
const logsDir = 'logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure Winston logger with async processing
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Daily rotating file for general logs
    new DailyRotateFile({
      filename: 'logs/gateway-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info'
    }),

    // Daily rotating file for errors
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error'
    })
  ]
});

// Console transport for development with better formatting
if (process.env.NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message }) => {
        if (typeof message === 'object') {
          return `${timestamp} [${level}] ${message.type || 'LOG'}: ${message.method || ''} ${message.url || ''} ${message.statusCode ? `(${message.statusCode})` : ''} ${message.duration ? `${message.duration}ms` : ''}`;
        }
        return `${timestamp} [${level}] ${message}`;
      })
    )
  }));
}

/**
 * Async request logging middleware
 * Replaces Morgan with non-blocking structured logging
 */
const asyncRequestLogger = (req, res, next) => {
  const startTime = Date.now();
  const startHrTime = process.hrtime();
  
  // Capture request info
  const requestInfo = {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    userType: req.user?.user_type,
    isInternal: req.isInternalService,
    timestamp: new Date().toISOString()
  };
  
  // Log response when finished (async)
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const hrDuration = process.hrtime(startHrTime);
    const hrDurationMs = hrDuration[0] * 1000 + hrDuration[1] / 1e6;
    
    // Async logging (non-blocking)
    setImmediate(() => {
      logger.info({
        type: 'request',
        ...requestInfo,
        statusCode: res.statusCode,
        duration: duration,
        hrDuration: hrDurationMs,
        contentLength: res.get('Content-Length')
      });
    });
  });
  
  // Log errors (async)
  res.on('error', (error) => {
    setImmediate(() => {
      logger.error({
        type: 'request_error',
        ...requestInfo,
        error: error.message,
        stack: error.stack
      });
    });
  });
  
  next();
};

module.exports = {
  logger,
  asyncRequestLogger
};
