/**
 * Development Startup Script
 * Sets up development environment and starts the service
 */

const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('Created logs directory');
}

// Check if .env file exists
const envFile = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envFile)) {
  console.log('⚠️  .env file not found. Please copy .env.example to .env and configure it.');
  console.log('   cp .env.example .env');
  process.exit(1);
}

// Load environment variables
require('dotenv').config({ path: envFile });

// Check required environment variables
const requiredEnvVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'INTERNAL_SERVICE_KEY'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('Please check your .env file configuration.');
  process.exit(1);
}

console.log('🚀 Starting Archive Service in development mode...');
console.log(`   Port: ${process.env.PORT || 3002}`);
console.log(`   Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

// Start the application
require('../src/app');
