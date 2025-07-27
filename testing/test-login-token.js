#!/usr/bin/env node

/**
 * Login Test Suite for ATMA Backend
 * Tests login functionality for users with updated passwords
 * 
 * This test verifies:
 * 1. Direct auth service login
 * 2. API Gateway login
 * 3. Token validation
 * 4. Profile access with token
 * 5. Users with large token balances
 */

require('dotenv').config();
const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  API_GATEWAY_URL: process.env.API_GATEWAY_URL || 'http://localhost:3000',
  TEST_TIMEOUT: parseInt(process.env.TEST_TIMEOUT) || 30000,
  ENABLE_DETAILED_LOGS: process.env.ENABLE_DETAILED_LOGS === 'true'
};

// Test users with updated passwords (from database update)
const TEST_USERS = [
  {
    email: 'testuser@example.com',
    password: 'testpassword123', // This matches the hash we set
    expectedTokenBalance: 10000,
    userType: 'user'
  },
  {
    email: 'test@atma.com',
    password: 'testpassword123', // This matches the hash we set
    expectedTokenBalance: 10000,
    userType: 'admin'
  },
  {
    email: 'admin@atma.com',
    password: 'testpassword123', // This matches the hash we set
    expectedTokenBalance: 1000,
    userType: 'superadmin'
  }
];

class LoginTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0
      }
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow
    };
    
    console.log(`${colors[type](`[${timestamp}]`)} ${message}`);
  }

  async makeRequest(url, method = 'GET', data = null, headers = {}) {
    try {
      const config = {
        method,
        url,
        timeout: CONFIG.TEST_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (data) {
        config.data = data;
      }

      if (CONFIG.ENABLE_DETAILED_LOGS) {
        this.log(`Making ${method} request to ${url}`, 'info');
        if (data) {
          this.log(`Request data: ${JSON.stringify(data, null, 2)}`, 'info');
        }
      }

      const response = await axios(config);
      
      if (CONFIG.ENABLE_DETAILED_LOGS) {
        this.log(`Response status: ${response.status}`, 'success');
        this.log(`Response data: ${JSON.stringify(response.data, null, 2)}`, 'info');
      }

      return response;
    } catch (error) {
      if (CONFIG.ENABLE_DETAILED_LOGS) {
        this.log(`Request failed: ${error.message}`, 'error');
        if (error.response) {
          this.log(`Error response: ${JSON.stringify(error.response.data, null, 2)}`, 'error');
        }
      }
      throw error;
    }
  }

  async testDirectAuthLogin(user) {
    const testName = `Direct Auth Login - ${user.email}`;
    this.log(`\n🔐 Testing ${testName}...`);
    
    try {
      const response = await this.makeRequest(
        `${CONFIG.AUTH_SERVICE_URL}/auth/login`,
        'POST',
        {
          email: user.email,
          password: user.password
        }
      );

      const success = response.status === 200 && 
                     response.data.success === true &&
                     response.data.data.token &&
                     response.data.data.user;

      if (success) {
        const userData = response.data.data.user;
        const tokenBalanceMatch = userData.token_balance === user.expectedTokenBalance;
        const userTypeMatch = userData.user_type === user.userType;
        
        if (tokenBalanceMatch && userTypeMatch) {
          this.log(`✅ ${testName} - SUCCESS`, 'success');
          this.log(`   Token Balance: ${userData.token_balance}`, 'info');
          this.log(`   User Type: ${userData.user_type}`, 'info');
          this.log(`   Token: ${response.data.data.token.substring(0, 20)}...`, 'info');
        } else {
          throw new Error(`User data mismatch - Token Balance: ${userData.token_balance} (expected ${user.expectedTokenBalance}), User Type: ${userData.user_type} (expected ${user.userType})`);
        }
      } else {
        throw new Error('Invalid response structure');
      }

      this.recordTest(testName, true, response.data.data);
      return response.data.data;
    } catch (error) {
      this.log(`❌ ${testName} - FAILED: ${error.message}`, 'error');
      this.recordTest(testName, false, null, error.message);
      throw error;
    }
  }

  async testApiGatewayLogin(user) {
    const testName = `API Gateway Login - ${user.email}`;
    this.log(`\n🌐 Testing ${testName}...`);
    
    try {
      const response = await this.makeRequest(
        `${CONFIG.API_GATEWAY_URL}/api/auth/login`,
        'POST',
        {
          email: user.email,
          password: user.password
        }
      );

      const success = response.status === 200 && 
                     response.data.success === true &&
                     response.data.data.token &&
                     response.data.data.user;

      if (success) {
        const userData = response.data.data.user;
        this.log(`✅ ${testName} - SUCCESS`, 'success');
        this.log(`   Token Balance: ${userData.token_balance}`, 'info');
        this.log(`   User Type: ${userData.user_type}`, 'info');
        this.log(`   Token: ${response.data.data.token.substring(0, 20)}...`, 'info');
      } else {
        throw new Error('Invalid response structure');
      }

      this.recordTest(testName, true, response.data.data);
      return response.data.data;
    } catch (error) {
      this.log(`❌ ${testName} - FAILED: ${error.message}`, 'error');
      this.recordTest(testName, false, null, error.message);
      throw error;
    }
  }

  async testTokenValidation(token, userEmail) {
    const testName = `Token Validation - ${userEmail}`;
    this.log(`\n🔍 Testing ${testName}...`);
    
    try {
      const response = await this.makeRequest(
        `${CONFIG.API_GATEWAY_URL}/api/auth/profile`,
        'GET',
        null,
        {
          'Authorization': `Bearer ${token}`
        }
      );

      const success = response.status === 200 && 
                     response.data.success === true &&
                     response.data.data.user;

      if (success) {
        this.log(`✅ ${testName} - SUCCESS`, 'success');
        this.log(`   Profile Email: ${response.data.data.user.email}`, 'info');
        this.log(`   Profile Token Balance: ${response.data.data.user.token_balance}`, 'info');
      } else {
        throw new Error('Invalid response structure');
      }

      this.recordTest(testName, true, response.data.data);
      return response.data.data;
    } catch (error) {
      this.log(`❌ ${testName} - FAILED: ${error.message}`, 'error');
      this.recordTest(testName, false, null, error.message);
      throw error;
    }
  }

  recordTest(testName, passed, data = null, error = null) {
    this.results.tests.push({
      name: testName,
      passed,
      timestamp: new Date().toISOString(),
      data,
      error
    });
    
    this.results.summary.total++;
    if (passed) {
      this.results.summary.passed++;
    } else {
      this.results.summary.failed++;
    }
  }

  async runAllTests() {
    this.log('🚀 Starting Login Test Suite for ATMA Backend', 'info');
    this.log(`📊 Testing ${TEST_USERS.length} users with updated passwords`, 'info');
    this.log(`🔗 Auth Service: ${CONFIG.AUTH_SERVICE_URL}`, 'info');
    this.log(`🌐 API Gateway: ${CONFIG.API_GATEWAY_URL}`, 'info');

    for (const user of TEST_USERS) {
      this.log(`\n${'='.repeat(60)}`, 'info');
      this.log(`👤 Testing user: ${user.email} (${user.userType})`, 'info');
      this.log(`${'='.repeat(60)}`, 'info');

      try {
        // Test direct auth service login
        const directAuthResult = await this.testDirectAuthLogin(user);
        
        // Test API Gateway login
        const apiGatewayResult = await this.testApiGatewayLogin(user);
        
        // Test token validation using API Gateway token
        await this.testTokenValidation(apiGatewayResult.token, user.email);
        
        this.log(`✅ All tests passed for ${user.email}`, 'success');
      } catch (error) {
        this.log(`❌ Tests failed for ${user.email}: ${error.message}`, 'error');
      }
    }

    this.generateReport();
  }

  generateReport() {
    this.log('\n📋 TEST SUMMARY', 'info');
    this.log('='.repeat(50), 'info');
    this.log(`Total Tests: ${this.results.summary.total}`, 'info');
    this.log(`Passed: ${this.results.summary.passed}`, 'success');
    this.log(`Failed: ${this.results.summary.failed}`, this.results.summary.failed > 0 ? 'error' : 'info');
    this.log(`Success Rate: ${((this.results.summary.passed / this.results.summary.total) * 100).toFixed(2)}%`, 'info');

    // Save detailed report
    const reportPath = path.join(__dirname, 'reports', `login-token-test-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    this.log(`📄 Detailed report saved to: ${reportPath}`, 'info');

    if (this.results.summary.failed > 0) {
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const tester = new LoginTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error(chalk.red('Test suite failed:'), error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = LoginTester;
