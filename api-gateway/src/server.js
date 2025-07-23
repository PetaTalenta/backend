const app = require('./app');
const config = require('./config');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Start server
const server = app.listen(config.port, () => {
  console.log(`
🚀 ATMA API Gateway is running!
📍 Port: ${config.port}
🌍 Environment: ${config.nodeEnv}
📊 Services:
   - Auth Service: ${config.services.auth}
   - Archive Service: ${config.services.archive}
   - Assessment Service: ${config.services.assessment}
   - Notification Service: ${config.services.notification}
   - Chatbot Service: ${config.services.chatbot}
🔗 Gateway URL: http://localhost:${config.port}
📋 Health Check: http://localhost:${config.port}/health
📖 API Documentation: http://localhost:${config.port}/
  `);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('Server closed successfully');
    process.exit(0);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;
