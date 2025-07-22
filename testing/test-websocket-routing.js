#!/usr/bin/env node

/**
 * Test script untuk verify WebSocket routing melalui API Gateway
 * Script ini akan test koneksi WebSocket dan health endpoints
 */

const axios = require('axios');
const io = require('socket.io-client');
const chalk = require('chalk');
const config = require('./config');

class WebSocketRoutingTest {
  constructor() {
    this.results = {
      healthChecks: [],
      websocketTest: null
    };
  }

  async run() {
    console.log(chalk.bold.blue('\n🌐 WebSocket Routing Test'));
    console.log(chalk.gray('Testing WebSocket connections melalui API Gateway\n'));

    try {
      await this.testHealthEndpoints();
      await this.testWebSocketConnection();
      this.printResults();
    } catch (error) {
      console.error(chalk.red(`\n❌ Test failed: ${error.message}`));
      process.exit(1);
    }
  }

  async testHealthEndpoints() {
    console.log(chalk.yellow('🏥 Testing Health Endpoints...'));

    const endpoints = [
      {
        name: 'API Gateway',
        url: `${config.api.baseUrl}/health`,
        description: 'Main gateway health'
      },
      {
        name: 'Notification Service (via Gateway)',
        url: `${config.api.baseUrl}/api/notifications/health`,
        description: 'Notification service via API Gateway'
      },
      {
        name: 'Notification Service (Direct)',
        url: 'http://localhost:3005/health',
        description: 'Direct notification service (backward compatibility)'
      }
    ];

    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await axios.get(endpoint.url, { timeout: 5000 });
        const duration = Date.now() - startTime;

        const result = {
          name: endpoint.name,
          url: endpoint.url,
          status: 'success',
          duration,
          statusCode: response.status,
          data: response.data
        };

        this.results.healthChecks.push(result);
        console.log(chalk.green(`  ✓ ${endpoint.name}: ${duration}ms`));
        
        if (response.data.connections) {
          console.log(chalk.gray(`    Connections: ${response.data.connections.total || 0}`));
        }
      } catch (error) {
        const result = {
          name: endpoint.name,
          url: endpoint.url,
          status: 'failed',
          error: error.message
        };

        this.results.healthChecks.push(result);
        console.log(chalk.red(`  ✗ ${endpoint.name}: ${error.message}`));
      }
    }
  }

  async testWebSocketConnection() {
    console.log(chalk.yellow('\n🔌 Testing WebSocket Connection...'));

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      const socket = io(config.websocket.url, {
        autoConnect: false,
        transports: ['websocket', 'polling'],
        reconnection: false,
        timeout: 5000
      });

      socket.on('connect', () => {
        const duration = Date.now() - startTime;
        console.log(chalk.green(`  ✓ WebSocket connected via API Gateway: ${duration}ms`));
        console.log(chalk.gray(`    Socket ID: ${socket.id}`));
        console.log(chalk.gray(`    Transport: ${socket.io.engine.transport.name}`));
        
        // Test authentication dengan dummy token (akan fail tapi connection berhasil)
        socket.emit('authenticate', { token: 'dummy_token_for_test' });
      });

      socket.on('auth_error', (data) => {
        clearTimeout(timeout);
        const duration = Date.now() - startTime;
        
        // Auth error expected dengan dummy token, tapi connection berhasil
        this.results.websocketTest = {
          status: 'success',
          duration,
          message: 'WebSocket connection successful (auth failed as expected with dummy token)',
          socketId: socket.id,
          transport: socket.io.engine.transport.name
        };

        console.log(chalk.green(`  ✓ WebSocket routing working (auth failed as expected)`));
        console.log(chalk.gray(`    Auth error: ${data.message}`));
        
        socket.disconnect();
        resolve();
      });

      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        this.results.websocketTest = {
          status: 'failed',
          error: error.message
        };
        
        console.log(chalk.red(`  ✗ WebSocket connection failed: ${error.message}`));
        reject(error);
      });

      socket.on('disconnect', () => {
        console.log(chalk.gray('  ℹ WebSocket disconnected'));
      });

      console.log(chalk.gray(`  Connecting to: ${config.websocket.url}`));
      socket.connect();
    });
  }

  printResults() {
    console.log(chalk.bold.blue('\n📊 Test Results Summary'));
    console.log('='.repeat(50));

    // Health Check Results
    console.log(chalk.cyan('\n🏥 Health Check Results:'));
    this.results.healthChecks.forEach(result => {
      if (result.status === 'success') {
        console.log(chalk.green(`  ✓ ${result.name}: ${result.duration}ms`));
      } else {
        console.log(chalk.red(`  ✗ ${result.name}: ${result.error}`));
      }
    });

    // WebSocket Test Results
    console.log(chalk.cyan('\n🔌 WebSocket Test Results:'));
    if (this.results.websocketTest) {
      if (this.results.websocketTest.status === 'success') {
        console.log(chalk.green(`  ✓ ${this.results.websocketTest.message}`));
        console.log(chalk.gray(`    Duration: ${this.results.websocketTest.duration}ms`));
        console.log(chalk.gray(`    Transport: ${this.results.websocketTest.transport}`));
      } else {
        console.log(chalk.red(`  ✗ ${this.results.websocketTest.error}`));
      }
    }

    // Summary
    const healthSuccess = this.results.healthChecks.filter(r => r.status === 'success').length;
    const healthTotal = this.results.healthChecks.length;
    const websocketSuccess = this.results.websocketTest?.status === 'success';

    console.log(chalk.cyan('\n📈 Summary:'));
    console.log(`  Health Checks: ${healthSuccess}/${healthTotal} passed`);
    console.log(`  WebSocket Test: ${websocketSuccess ? 'PASSED' : 'FAILED'}`);

    if (healthSuccess === healthTotal && websocketSuccess) {
      console.log(chalk.green('\n✅ All tests passed! WebSocket routing via API Gateway is working correctly.'));
    } else {
      console.log(chalk.red('\n❌ Some tests failed. Check service status and configuration.'));
    }

    console.log(chalk.gray('\nNote: WebSocket authentication failure with dummy token is expected.'));
    console.log(chalk.gray('The important part is that the connection itself succeeds via API Gateway.'));
  }
}

// Run test if called directly
if (require.main === module) {
  const test = new WebSocketRoutingTest();
  test.run().catch(error => {
    console.error(chalk.red(`\nTest execution failed: ${error.message}`));
    process.exit(1);
  });
}

module.exports = WebSocketRoutingTest;
