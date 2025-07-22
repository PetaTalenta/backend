#!/usr/bin/env node

const { spawn } = require('child_process');
const chalk = require('chalk');
const path = require('path');

class TestRunner {
  constructor() {
    this.testDir = __dirname;
  }

  async run() {
    console.log(chalk.bold.blue('\n🚀 ATMA Testing Suite'));
    console.log(chalk.gray('Automated E2E and Load Testing for ATMA Backend\n'));

    try {
      await this.checkDependencies();
      await this.runHealthChecks();
      
      const testType = process.argv[2] || 'all';
      
      switch (testType.toLowerCase()) {
        case 'e2e':
          await this.runE2ETest();
          break;
        case 'load':
          await this.runLoadTest();
          break;
        case 'all':
        default:
          await this.runE2ETest();
          await this.runLoadTest();
          break;
      }
      
      console.log(chalk.bold.green('\n✅ All tests completed successfully!'));
    } catch (error) {
      console.error(chalk.red('\n❌ Test execution failed:'), error.message);
      process.exit(1);
    }
  }

  async checkDependencies() {
    console.log(chalk.yellow('📦 Checking dependencies...'));
    
    try {
      require('axios');
      require('socket.io-client');
      require('chalk');
      require('cli-progress');
      require('uuid');
      console.log(chalk.green('✓ All dependencies are installed'));
    } catch (error) {
      console.log(chalk.red('✗ Missing dependencies. Installing...'));
      await this.installDependencies();
    }
  }

  async installDependencies() {
    return new Promise((resolve, reject) => {
      const npm = spawn('npm', ['install'], {
        cwd: this.testDir,
        stdio: 'inherit'
      });

      npm.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green('✓ Dependencies installed successfully'));
          resolve();
        } else {
          reject(new Error(`npm install failed with code ${code}`));
        }
      });

      npm.on('error', (error) => {
        reject(new Error(`Failed to run npm install: ${error.message}`));
      });
    });
  }

  async runHealthChecks() {
    console.log(chalk.yellow('\n🏥 Running health checks...'));
    
    const axios = require('axios');
    const services = [
      { name: 'API Gateway', url: 'http://localhost:3000/health' },
      { name: 'Notification Service', url: 'http://localhost:3000/api/notifications/health' }
    ];

    for (const service of services) {
      try {
        await axios.get(service.url, { timeout: 5000 });
        console.log(chalk.green(`✓ ${service.name} is healthy`));
      } catch (error) {
        console.log(chalk.yellow(`⚠ ${service.name} health check failed - continuing anyway`));
      }
    }
  }

  async runE2ETest() {
    console.log(chalk.cyan('\n🧪 Starting E2E Test...'));
    
    return new Promise((resolve, reject) => {
      const e2eTest = spawn('node', ['e2e-test.js'], {
        cwd: this.testDir,
        stdio: 'inherit'
      });

      e2eTest.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green('\n✅ E2E Test completed successfully'));
          resolve();
        } else {
          reject(new Error(`E2E test failed with code ${code}`));
        }
      });

      e2eTest.on('error', (error) => {
        reject(new Error(`Failed to run E2E test: ${error.message}`));
      });
    });
  }

  async runLoadTest() {
    console.log(chalk.cyan('\n📊 Starting Load Test...'));
    
    return new Promise((resolve, reject) => {
      const loadTest = spawn('node', ['load-test.js'], {
        cwd: this.testDir,
        stdio: 'inherit'
      });

      loadTest.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green('\n✅ Load Test completed successfully'));
          resolve();
        } else {
          reject(new Error(`Load test failed with code ${code}`));
        }
      });

      loadTest.on('error', (error) => {
        reject(new Error(`Failed to run load test: ${error.message}`));
      });
    });
  }
}

// Show usage if help is requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(chalk.bold.blue('\n🚀 ATMA Testing Suite'));
  console.log(chalk.gray('Usage: node run-tests.js [test-type]\n'));
  console.log('Test Types:');
  console.log('  e2e    - Run E2E test only');
  console.log('  load   - Run Load test only');
  console.log('  all    - Run both tests (default)\n');
  console.log('Examples:');
  console.log('  node run-tests.js e2e');
  console.log('  node run-tests.js load');
  console.log('  node run-tests.js all');
  console.log('  node run-tests.js\n');
  process.exit(0);
}

// Run the test runner
if (require.main === module) {
  const runner = new TestRunner();
  runner.run().catch(error => {
    console.error(chalk.red('Test runner failed:'), error);
    process.exit(1);
  });
}

module.exports = TestRunner;
