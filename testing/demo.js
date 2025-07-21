#!/usr/bin/env node

const chalk = require('chalk');
const config = require('./config');
const TestUtils = require('./utils');

class Demo {
  async run() {
    console.log(chalk.bold.blue('\n🎬 ATMA Testing Suite Demo'));
    console.log(chalk.gray('Demonstrating testing capabilities without running actual tests\n'));

    this.showConfiguration();
    this.showTestScenarios();
    this.showSampleData();
    this.showExpectedOutput();
    this.showUsageInstructions();
  }

  showConfiguration() {
    console.log(chalk.cyan.bold('📋 Configuration:'));
    console.log(`   API Base URL: ${chalk.yellow(config.api.baseUrl)}`);
    console.log(`   WebSocket URL: ${chalk.yellow(config.websocket.url)}`);
    console.log(`   User Count: ${chalk.yellow(config.test.userCount)}`);
    console.log(`   Concurrency: ${chalk.yellow(config.test.concurrency)}`);
    console.log(`   Assessment Timeout: ${chalk.yellow(TestUtils.formatDuration(config.test.assessmentTimeout))}`);
  }

  showTestScenarios() {
    console.log(chalk.cyan.bold('\n🎯 Test Scenarios:'));
    
    const scenarios = [
      '1. User Registration - Generate random users with valid data',
      '2. User Login - Authenticate and receive JWT tokens',
      '3. Profile Update - Update user profiles with school info',
      '4. Assessment Submission - Submit RIASEC, OCEAN, VIA-IS data',
      '5. WebSocket Monitoring - Real-time assessment completion',
      '6. Result Retrieval - Fetch completed assessment results',
      '7. Account Cleanup - Delete test accounts'
    ];

    scenarios.forEach(scenario => {
      console.log(`   ${chalk.green('✓')} ${scenario}`);
    });
  }

  showSampleData() {
    console.log(chalk.cyan.bold('\n📊 Sample Test Data:'));
    
    const sampleUser = TestUtils.generateRandomUser(1);
    console.log(`   Sample User:`);
    console.log(`     Email: ${chalk.yellow(sampleUser.email)}`);
    console.log(`     Username: ${chalk.yellow(sampleUser.username)}`);
    console.log(`     Full Name: ${chalk.yellow(sampleUser.full_name)}`);
    console.log(`     Date of Birth: ${chalk.yellow(sampleUser.date_of_birth)}`);
    console.log(`     Gender: ${chalk.yellow(sampleUser.gender)}`);

    const sampleAssessment = TestUtils.randomizeAssessmentScores(config.assessmentTemplate);
    console.log(`\n   Sample Assessment Scores:`);
    console.log(`     RIASEC Realistic: ${chalk.yellow(sampleAssessment.riasec.realistic)}`);
    console.log(`     OCEAN Openness: ${chalk.yellow(sampleAssessment.ocean.openness)}`);
    console.log(`     VIA-IS Creativity: ${chalk.yellow(sampleAssessment.viaIs.creativity)}`);
  }

  showExpectedOutput() {
    console.log(chalk.cyan.bold('\n📈 Expected Performance Metrics:'));
    
    const metrics = [
      'Response Time Statistics (Min, Max, Avg, P95, P99)',
      'Success Rate Percentage per Stage',
      'Throughput (Requests per Second)',
      'Concurrent User Handling',
      'WebSocket Connection Stability',
      'Assessment Processing Time',
      'Overall System Performance'
    ];

    metrics.forEach(metric => {
      console.log(`   ${chalk.blue('📊')} ${metric}`);
    });
  }

  showUsageInstructions() {
    console.log(chalk.cyan.bold('\n🚀 How to Run Tests:'));
    
    console.log(chalk.yellow('\n   Prerequisites:'));
    console.log('   • Ensure all ATMA backend services are running');
    console.log('   • API Gateway (port 3000)');
    console.log('   • Auth Service (port 3001)');
    console.log('   • Archive Service (port 3002)');
    console.log('   • Assessment Service (port 3003)');
    console.log('   • Notification Service (port 3005)');

    console.log(chalk.yellow('\n   Commands:'));
    console.log(`   ${chalk.green('npm run test:e2e')}     - Run E2E test (single user)`);
    console.log(`   ${chalk.green('npm run test:load')}    - Run Load test (50 users)`);
    console.log(`   ${chalk.green('npm run test:all')}     - Run both tests`);
    console.log(`   ${chalk.green('node run-tests.js')}    - Interactive test runner`);
    console.log(`   ${chalk.green('run-tests.bat')}        - Windows batch script`);

    console.log(chalk.yellow('\n   Test Types:'));
    console.log(`   ${chalk.blue('E2E Test:')} Single user journey validation`);
    console.log(`   ${chalk.blue('Load Test:')} 50 concurrent users performance testing`);

    console.log(chalk.yellow('\n   Configuration:'));
    console.log(`   Edit ${chalk.green('config.js')} to adjust test parameters`);
    console.log(`   Modify user count, concurrency, timeouts, etc.`);
  }
}

// Health check function
async function healthCheck() {
  console.log(chalk.yellow('\n🏥 Quick Health Check:'));
  
  const axios = require('axios');
  const services = [
    { name: 'API Gateway', url: `${config.api.baseUrl}/health` },
    { name: 'Notification Service', url: `${config.websocket.url}/health` }
  ];

  for (const service of services) {
    try {
      await axios.get(service.url, { timeout: 3000 });
      console.log(`   ${chalk.green('✓')} ${service.name} is healthy`);
    } catch (error) {
      console.log(`   ${chalk.red('✗')} ${service.name} is not responding`);
    }
  }
}

// Show help
function showHelp() {
  console.log(chalk.bold.blue('\n🎬 ATMA Testing Suite Demo'));
  console.log(chalk.gray('Usage: node demo.js [option]\n'));
  console.log('Options:');
  console.log('  --health    Run health check on services');
  console.log('  --help      Show this help message');
  console.log('  (no args)   Show demo information\n');
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
  } else if (args.includes('--health')) {
    healthCheck().catch(error => {
      console.error(chalk.red('Health check failed:'), error.message);
    });
  } else {
    const demo = new Demo();
    demo.run().catch(error => {
      console.error(chalk.red('Demo failed:'), error);
    });
  }
}

module.exports = Demo;
