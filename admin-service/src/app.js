require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const routes = require('./routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Request ID header
app.use((req, res, next) => {
  res.setHeader('X-Request-ID', Math.random().toString(36).substring(2));
  next();
});

app.use('/admin-service', routes);

app.get('/', (req, res) => {
  res.json({ success: true, message: 'ATMA Admin Service is running', version: '1.0.0', service: 'admin-service' });
});

app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` } });
});

module.exports = app;

