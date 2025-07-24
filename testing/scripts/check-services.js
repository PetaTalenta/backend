require('dotenv').config();
const axios = require('axios');
const chalk = require('chalk');

class ServiceChecker {
  constructor() {
    this.services = [
      {
        name: 'API Gateway',
        url: 'http://localhost:3000/health',
        required: true
      },
      {
        name: 'Auth Service',
        url: 'http://localhost:3001/health',
        required: true
      },
      {
        name: 'Archive Service',
        url: 'http://localhost:3002/health',
        required: true
      },
      {
        name: 'Assessment Service',
        url: 'http://localhost:3003/health',
        required: true
      },
      {
        name: 'Notification Service',
        url: 'http://localhost:3005/health',
        required: true
      },
      {
        name: 'Chatbot Service',
        url: 'http://localhost:3006/health',
        required: true
      }
    ];
    this.results = [];
  }

  async checkAll() {
    console.log(chalk.cyan('🔍 ATMA Services Health Check'));
    console.log(chalk.cyan('==============================\n'));

    for (const service of this.services) {
      await this.checkService(service);
    }

    this.printSummary();
    return this.results;
  }

  async checkService(service) {
    try {
      console.log(chalk.blue(`Checking ${service.name}...`));
      
      const response = await axios.get(service.url, {
        timeout: 5000,
        validateStatus: (status) => status < 500 // Accept 4xx as "service is running"
      });

      const result = {
        name: service.name,
        url: service.url,
        status: 'HEALTHY',
        responseTime: response.headers['x-response-time'] || 'N/A',
        httpStatus: response.status,
        required: service.required
      };

      console.log(chalk.green(`✅ ${service.name} - HEALTHY (${response.status})`));
      
      if (response.data) {
        if (response.data.status) {
          console.log(chalk.gray(`   Status: ${response.data.status}`));
        }
        if (response.data.services) {
          console.log(chalk.gray(`   Services: ${Object.keys(response.data.services).join(', ')}`));
        }
        if (response.data.websocket) {
          console.log(chalk.gray(`   WebSocket: ${response.data.websocket.status} (${response.data.websocket.connections} connections)`));
        }
      }

      this.results.push(result);

    } catch (error) {
      const result = {
        name: service.name,
        url: service.url,
        status: 'UNHEALTHY',
        error: error.message,
        required: service.required
      };

      if (error.code === 'ECONNREFUSED') {
        console.log(chalk.red(`❌ ${service.name} - NOT RUNNING`));
        console.log(chalk.red(`   Connection refused to ${service.url}`));
      } else if (error.code === 'ETIMEDOUT') {
        console.log(chalk.red(`❌ ${service.name} - TIMEOUT`));
        console.log(chalk.red(`   Request timeout to ${service.url}`));
      } else {
        console.log(chalk.red(`❌ ${service.name} - ERROR`));
        console.log(chalk.red(`   ${error.message}`));
      }

      this.results.push(result);
    }

    console.log(''); // Empty line for readability
  }

  printSummary() {
    const healthy = this.results.filter(r => r.status === 'HEALTHY').length;
    const unhealthy = this.results.filter(r => r.status === 'UNHEALTHY').length;
    const requiredUnhealthy = this.results.filter(r => r.status === 'UNHEALTHY' && r.required).length;

    console.log(chalk.cyan('📊 Summary'));
    console.log(chalk.cyan('==========='));
    console.log(`Total Services: ${this.results.length}`);
    console.log(chalk.green(`Healthy: ${healthy}`));
    console.log(chalk.red(`Unhealthy: ${unhealthy}`));

    if (requiredUnhealthy > 0) {
      console.log(chalk.red(`\n⚠️  ${requiredUnhealthy} required services are unhealthy!`));
      console.log(chalk.red('E2E tests may fail. Please start the missing services.'));
      
      console.log(chalk.yellow('\n🚀 To start services:'));
      console.log(chalk.yellow('docker-compose up -d'));
      
      return false;
    } else {
      console.log(chalk.green('\n✅ All required services are healthy!'));
      console.log(chalk.green('Ready to run E2E tests.'));
      return true;
    }
  }

  async checkWebSocketConnection() {
    console.log(chalk.blue('\n🔌 Testing WebSocket Connection...'));
    
    try {
      const io = require('socket.io-client');
      const socket = io('http://localhost:3000', {
        autoConnect: false,
        timeout: 5000
      });

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.disconnect();
          reject(new Error('WebSocket connection timeout'));
        }, 5000);

        socket.on('connect', () => {
          clearTimeout(timeout);
          console.log(chalk.green('✅ WebSocket connection successful'));
          socket.disconnect();
          resolve(true);
        });

        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          console.log(chalk.red(`❌ WebSocket connection failed: ${error.message}`));
          reject(error);
        });

        socket.connect();
      });

    } catch (error) {
      console.log(chalk.red(`❌ WebSocket test failed: ${error.message}`));
      return false;
    }
  }

  static async quickCheck() {
    const checker = new ServiceChecker();
    const results = await checker.checkAll();
    
    // Also test WebSocket
    try {
      await checker.checkWebSocketConnection();
    } catch (error) {
      console.log(chalk.yellow('⚠️  WebSocket test failed (may still work during actual tests)'));
    }
    
    const allHealthy = results.every(r => !r.required || r.status === 'HEALTHY');
    process.exit(allHealthy ? 0 : 1);
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--quick')) {
    ServiceChecker.quickCheck();
  } else {
    const checker = new ServiceChecker();
    checker.checkAll()
      .then((results) => {
        const allHealthy = results.every(r => !r.required || r.status === 'HEALTHY');
        process.exit(allHealthy ? 0 : 1);
      })
      .catch((error) => {
        console.error(chalk.red('Service check failed:'), error.message);
        process.exit(1);
      });
  }
}

module.exports = ServiceChecker;
