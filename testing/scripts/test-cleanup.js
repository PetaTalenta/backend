#!/usr/bin/env node

/**
 * Test Cleanup Script
 * Tests the admin cleanup endpoints
 */

const axios = require('axios');
require('dotenv').config();

const logger = {
  info: (msg, data = {}) => console.log(`ℹ️  ${msg}`, data),
  success: (msg, data = {}) => console.log(`✅ ${msg}`, data),
  error: (msg, data = {}) => console.error(`❌ ${msg}`, data),
  warn: (msg, data = {}) => console.warn(`⚠️  ${msg}`, data)
};

class CleanupTester {
  constructor() {
    this.baseURL = process.env.API_BASE_URL || 'http://localhost:3000/api';
    this.authURL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    this.adminToken = null;
  }

  async loginAsAdmin() {
    try {
      logger.info('Logging in as admin...');
      
      // This assumes you have an admin user created
      // You may need to adjust credentials based on your setup
      const response = await axios.post(`${this.authURL}/admin/login`, {
        email: 'admin@atma.local',
        password: 'AdminPassword123!'
      });

      this.adminToken = response.data.token;
      logger.success('Admin login successful');
      return true;

    } catch (error) {
      logger.error('Admin login failed', { 
        error: error.response?.data?.message || error.message 
      });
      return false;
    }
  }

  async countTestUsers() {
    try {
      logger.info('Counting test users...');

      const response = await axios.get(`${this.authURL}/admin/cleanup/test-users/count`, {
        headers: {
          'Authorization': `Bearer ${this.adminToken}`
        },
        params: {
          olderThanHours: 0 // Count all test users
        }
      });

      const count = response.data.count;
      logger.success(`Found ${count} test users`);
      return count;

    } catch (error) {
      logger.error('Failed to count test users', { 
        error: error.response?.data?.message || error.message 
      });
      return 0;
    }
  }

  async dryRunCleanup() {
    try {
      logger.info('Running dry run cleanup...');

      const response = await axios.delete(`${this.authURL}/admin/cleanup/test-users`, {
        headers: {
          'Authorization': `Bearer ${this.adminToken}`
        },
        params: {
          olderThanHours: 1, // Clean users older than 1 hour
          batchSize: 50,
          dryRun: true
        }
      });

      logger.success('Dry run completed', response.data);
      return response.data;

    } catch (error) {
      logger.error('Dry run failed', { 
        error: error.response?.data?.message || error.message 
      });
      return null;
    }
  }

  async performCleanup() {
    try {
      logger.info('Performing actual cleanup...');

      const response = await axios.delete(`${this.authURL}/admin/cleanup/test-users`, {
        headers: {
          'Authorization': `Bearer ${this.adminToken}`
        },
        params: {
          olderThanHours: 1, // Clean users older than 1 hour
          batchSize: 50,
          dryRun: false
        }
      });

      logger.success('Cleanup completed', response.data);
      return response.data;

    } catch (error) {
      logger.error('Cleanup failed', { 
        error: error.response?.data?.message || error.message 
      });
      return null;
    }
  }

  async testCleanupEndpoints() {
    try {
      logger.info('Testing cleanup endpoints...');

      // Login as admin
      const loginSuccess = await this.loginAsAdmin();
      if (!loginSuccess) {
        throw new Error('Failed to login as admin');
      }

      // Count test users
      const initialCount = await this.countTestUsers();

      // Dry run
      const dryRunResult = await this.dryRunCleanup();
      if (dryRunResult) {
        logger.info(`Dry run would delete ${dryRunResult.count} users`);
      }

      // Actual cleanup (only if there are test users)
      if (initialCount > 0) {
        const cleanupResult = await this.performCleanup();
        if (cleanupResult) {
          logger.success(`Cleaned up ${cleanupResult.deletedCount} test users`);
        }

        // Count again to verify
        const finalCount = await this.countTestUsers();
        logger.info(`Test users remaining: ${finalCount}`);
      } else {
        logger.info('No test users to clean up');
      }

      logger.success('Cleanup endpoint testing completed');

    } catch (error) {
      logger.error('Cleanup endpoint testing failed', { error: error.message });
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const tester = new CleanupTester();
  const command = process.argv[2];

  try {
    switch (command) {
      case 'test':
        await tester.testCleanupEndpoints();
        break;
      case 'count':
        await tester.loginAsAdmin();
        await tester.countTestUsers();
        break;
      case 'dry-run':
        await tester.loginAsAdmin();
        await tester.dryRunCleanup();
        break;
      case 'cleanup':
        await tester.loginAsAdmin();
        await tester.performCleanup();
        break;
      default:
        logger.info('Usage: node test-cleanup.js [test|count|dry-run|cleanup]');
        logger.info('  test     - Run full cleanup endpoint test');
        logger.info('  count    - Count test users');
        logger.info('  dry-run  - Run cleanup dry run');
        logger.info('  cleanup  - Perform actual cleanup');
        process.exit(1);
    }
  } catch (error) {
    logger.error('Operation failed', { error: error.message });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = CleanupTester;
