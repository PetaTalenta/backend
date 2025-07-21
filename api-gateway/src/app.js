const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const config = require('./config');
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { asyncRequestLogger } = require('./middleware/asyncLogger');
const { jsonParser, urlencodedParser } = require('./middleware/bodyParser');

// Import routes
const healthRoutes = require('./routes/health');
const apiRoutes = require('./routes/index');

const app = express();

// ===== SECURITY MIDDLEWARE =====

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (config.cors.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // In development, allow localhost with any port
    if (config.nodeEnv === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Service-Key', 'X-Internal-Service']
}));

// ===== GENERAL MIDDLEWARE =====

// Compression
app.use(compression());

// Body parsing - Skip for proxy routes to avoid conflicts
app.use(jsonParser);
app.use(urlencodedParser);

// Async Logging (replaces Morgan for better performance)
if (config.nodeEnv !== 'test') {
  app.use(asyncRequestLogger);
}

// Rate limiting
app.use(generalLimiter);

// Trust proxy (for accurate IP addresses)
app.set('trust proxy', 1);

// ===== ROUTES =====

// Health check routes
app.use('/health', healthRoutes);

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ATMA API Gateway is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      auth: `${config.services.auth}`,
      archive: `${config.services.archive}`,
      assessment: `${config.services.assessment}`
    },
    documentation: {
      health: '/health',
      detailedHealth: '/health/detailed',
      ready: '/health/ready',
      live: '/health/live'
    }
  });
});

// ===== ERROR HANDLING =====

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

module.exports = app;
