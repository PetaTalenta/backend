require('dotenv').config();
const chalk = require('chalk');
const TestLogger = require('./lib/test-logger');
const SingleUserTest = require('./single-user-test');
const DualUserTest = require('./dual-user-test');
const WebSocketTest = require('./websocket-test');
const ChatbotTest = require('./chatbot-test');
const StressTest = require('./stress-test');

class TestRunner {
  constructor() {
    this.logger = TestLogger.create('test-runner');
    this.testSuite = [
      { name: 'Single User Test', class: SingleUserTest, enabled: true },
      { name: 'Dual User Test', class: DualUserTest, enabled: true },
      { name: 'WebSocket Test', class: WebSocketTest, enabled: true },
      { name: 'Chatbot Test', class: ChatbotTest, enabled: true },
      { name: 'Stress Test', class: StressTest, enabled: false } // Disabled by default
    ];
    this.results = [];
  }

  async run() {
    try {
      console.log(chalk.cyan('🚀 ATMA E2E Testing Suite'));
      console.log(chalk.cyan('==========================\n'));
      
      this.logger.info('Starting comprehensive E2E test suite');
      
      // Health check first
      await this.healthCheck();
      
      // Run enabled tests
      for (const testConfig of this.testSuite) {
        if (testConfig.enabled) {
          await this.runSingleTest(testConfig);
        } else {
          this.logger.skip(`${testConfig.name}`, 'Disabled in configuration');
        }
      }
      
      // Generate final report
      await this.generateFinalReport();
      
      this.logger.success('E2E Test Suite completed successfully');
      
    } catch (error) {
      this.logger.error('E2E Test Suite failed', error);
      throw error;
    } finally {
      await this.logger.saveReport();
    }
  }

  async healthCheck() {
    this.logger.step('System Health Check', 0);

    try {
      const axios = require('axios');
      const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';

      const response = await axios.get(`${baseURL}/health`, {
        timeout: 10000
      });
      
      if (response.data.success && response.data.status === 'healthy') {
        this.logger.success('System health check passed', {
          services: response.data.services
        });
      } else {
        throw new Error('System health check failed - services not healthy');
      }
      
    } catch (error) {
      this.logger.error('System health check failed', error);
      throw new Error('Cannot proceed with tests - system not healthy');
    }
  }

  async runSingleTest(testConfig) {
    console.log(chalk.yellow(`\n📋 Running ${testConfig.name}...`));
    console.log(chalk.yellow('='.repeat(50)));
    
    const startTime = Date.now();
    let testResult = null;
    
    try {
      const testInstance = new testConfig.class();
      await testInstance.run();
      
      const duration = Date.now() - startTime;
      testResult = {
        name: testConfig.name,
        status: 'PASSED',
        duration,
        error: null
      };
      
      console.log(chalk.green(`✅ ${testConfig.name} PASSED (${duration}ms)\n`));
      
    } catch (error) {
      const duration = Date.now() - startTime;
      testResult = {
        name: testConfig.name,
        status: 'FAILED',
        duration,
        error: error.message
      };
      
      console.log(chalk.red(`❌ ${testConfig.name} FAILED (${duration}ms)`));
      console.log(chalk.red(`   Error: ${error.message}\n`));
    }
    
    this.results.push(testResult);
    this.logger.testResult(testConfig.name, testResult.status === 'PASSED', testResult);
  }

  async generateFinalReport() {
    console.log(chalk.cyan('\n📊 Final Test Report'));
    console.log(chalk.cyan('==================='));
    
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASSED').length;
    const failedTests = this.results.filter(r => r.status === 'FAILED').length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(chalk.green(`Passed: ${passedTests}`));
    console.log(chalk.red(`Failed: ${failedTests}`));
    console.log(`Total Duration: ${this.formatDuration(totalDuration)}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`);
    
    console.log('\nTest Details:');
    this.results.forEach((result, index) => {
      const status = result.status === 'PASSED' ? 
        chalk.green('✅ PASSED') : 
        chalk.red('❌ FAILED');
      
      console.log(`${index + 1}. ${result.name}: ${status} (${this.formatDuration(result.duration)})`);
      
      if (result.error) {
        console.log(chalk.red(`   Error: ${result.error}`));
      }
    });
    
    // Log summary to logger
    this.logger.success('Final test report generated', {
      totalTests,
      passedTests,
      failedTests,
      totalDuration,
      successRate: ((passedTests / totalTests) * 100).toFixed(2) + '%',
      results: this.results
    });
    
    // Exit with appropriate code
    if (failedTests > 0) {
      console.log(chalk.red('\n❌ Some tests failed. Check the logs for details.'));
      process.exitCode = 1;
    } else {
      console.log(chalk.green('\n✅ All tests passed successfully!'));
      process.exitCode = 0;
    }
  }

  formatDuration(ms) {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  }

  // Static method to run with custom configuration
  static async runWithConfig(config = {}) {
    const runner = new TestRunner();
    
    // Apply configuration
    if (config.enableStressTest) {
      const stressTest = runner.testSuite.find(t => t.name === 'Stress Test');
      if (stressTest) stressTest.enabled = true;
    }
    
    if (config.disableTests) {
      config.disableTests.forEach(testName => {
        const test = runner.testSuite.find(t => t.name === testName);
        if (test) test.enabled = false;
      });
    }
    
    if (config.onlyTests) {
      runner.testSuite.forEach(test => {
        test.enabled = config.onlyTests.includes(test.name);
      });
    }
    
    return await runner.run();
  }
}

// CLI argument parsing
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {};
  
  if (args.includes('--stress')) {
    config.enableStressTest = true;
  }
  
  if (args.includes('--single-only')) {
    config.onlyTests = ['Single User Test'];
  }
  
  if (args.includes('--dual-only')) {
    config.onlyTests = ['Dual User Test'];
  }
  
  if (args.includes('--websocket-only')) {
    config.onlyTests = ['WebSocket Test'];
  }
  
  if (args.includes('--chatbot-only')) {
    config.onlyTests = ['Chatbot Test'];
  }
  
  if (args.includes('--no-stress')) {
    config.disableTests = ['Stress Test'];
  }
  
  return config;
}

// Run if called directly
if (require.main === module) {
  const config = parseArgs();
  
  console.log(chalk.blue('ATMA E2E Testing Suite'));
  console.log(chalk.blue('Configuration:'), config);
  
  TestRunner.runWithConfig(config)
    .then(() => {
      console.log(chalk.green('\n🎉 Test suite execution completed'));
    })
    .catch((error) => {
      console.error(chalk.red('\n💥 Test suite execution failed:'), error.message);
      process.exit(1);
    });
}

module.exports = TestRunner;
