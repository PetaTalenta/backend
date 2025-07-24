const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class TestLogger {
  constructor(testName = 'e2e-test') {
    this.testName = testName;
    this.startTime = new Date();
    this.logs = [];
    this.errors = [];
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0
    };
    
    // Ensure reports directory exists
    this.reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  info(message, data = null) {
    const logEntry = {
      level: 'INFO',
      message,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.logs.push(logEntry);
    console.log(chalk.blue(`ℹ ${message}`));
    
    if (data && process.env.ENABLE_DETAILED_LOGS === 'true') {
      console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
  }

  success(message, data = null) {
    const logEntry = {
      level: 'SUCCESS',
      message,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.logs.push(logEntry);
    console.log(chalk.green(`✓ ${message}`));
    this.results.passed++;
    this.results.total++;
  }

  error(message, error = null) {
    const logEntry = {
      level: 'ERROR',
      message,
      error: error ? {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      } : null,
      timestamp: new Date().toISOString()
    };
    
    this.logs.push(logEntry);
    this.errors.push(logEntry);
    console.log(chalk.red(`✗ ${message}`));
    
    if (error) {
      console.log(chalk.red(`  ${error.message}`));
      if (error.response?.data && process.env.ENABLE_DETAILED_LOGS === 'true') {
        console.log(chalk.red(JSON.stringify(error.response.data, null, 2)));
      }
    }
    
    this.results.failed++;
    this.results.total++;
  }

  warning(message, data = null) {
    const logEntry = {
      level: 'WARNING',
      message,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.logs.push(logEntry);
    console.log(chalk.yellow(`⚠ ${message}`));
  }

  step(stepName, stepNumber = null) {
    const stepMessage = stepNumber ? `Step ${stepNumber}: ${stepName}` : stepName;
    console.log(chalk.cyan(`\n🔄 ${stepMessage}`));
    
    this.info(`Starting: ${stepMessage}`);
  }

  userAction(userId, action, details = null) {
    const message = `User ${userId}: ${action}`;
    this.info(message, details);
  }

  websocketEvent(event, data = null) {
    const message = `WebSocket Event: ${event}`;
    console.log(chalk.magenta(`📡 ${message}`));
    this.info(message, data);
  }

  apiCall(method, endpoint, status, duration = null) {
    const message = `${method} ${endpoint} - ${status}`;
    const durationText = duration ? ` (${duration}ms)` : '';
    
    if (status >= 200 && status < 300) {
      console.log(chalk.green(`📡 ${message}${durationText}`));
    } else {
      console.log(chalk.red(`📡 ${message}${durationText}`));
    }
  }

  testResult(testName, passed, details = null) {
    if (passed) {
      this.success(`Test: ${testName}`, details);
    } else {
      this.error(`Test: ${testName}`, details);
    }
  }

  skip(message, reason = null) {
    const logEntry = {
      level: 'SKIPPED',
      message,
      reason,
      timestamp: new Date().toISOString()
    };
    
    this.logs.push(logEntry);
    console.log(chalk.gray(`⏭ ${message}`));
    
    if (reason) {
      console.log(chalk.gray(`  Reason: ${reason}`));
    }
    
    this.results.skipped++;
    this.results.total++;
  }

  summary() {
    const endTime = new Date();
    const duration = endTime - this.startTime;
    
    console.log(chalk.cyan('\n📊 Test Summary'));
    console.log(chalk.cyan('================'));
    console.log(`Test Name: ${this.testName}`);
    console.log(`Duration: ${this.formatDuration(duration)}`);
    console.log(`Total Tests: ${this.results.total}`);
    console.log(chalk.green(`Passed: ${this.results.passed}`));
    console.log(chalk.red(`Failed: ${this.results.failed}`));
    console.log(chalk.gray(`Skipped: ${this.results.skipped}`));
    
    const successRate = this.results.total > 0 ? 
      ((this.results.passed / this.results.total) * 100).toFixed(2) : 0;
    console.log(`Success Rate: ${successRate}%`);
    
    if (this.errors.length > 0) {
      console.log(chalk.red('\n❌ Errors:'));
      this.errors.forEach((error, index) => {
        console.log(chalk.red(`${index + 1}. ${error.message}`));
      });
    }
    
    return {
      testName: this.testName,
      startTime: this.startTime,
      endTime,
      duration,
      results: this.results,
      successRate: parseFloat(successRate),
      errors: this.errors.length
    };
  }

  async saveReport() {
    const summary = this.summary();
    const reportData = {
      ...summary,
      logs: this.logs,
      errors: this.errors
    };
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${this.testName}-${timestamp}.json`;
    const filepath = path.join(this.reportsDir, filename);
    
    try {
      await fs.promises.writeFile(filepath, JSON.stringify(reportData, null, 2));
      console.log(chalk.blue(`\n📄 Report saved: ${filepath}`));
      return filepath;
    } catch (error) {
      console.error(chalk.red(`Failed to save report: ${error.message}`));
      return null;
    }
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Static method to create logger with timestamp
  static create(testName) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    return new TestLogger(`${testName}-${timestamp}`);
  }
}

module.exports = TestLogger;
