#!/usr/bin/env node

const axios = require('axios');
const chalk = require('chalk');
const config = require('./config');
const TestUtils = require('./utils');

class AccountCleanup {
  constructor() {
    this.userCredentials = null;
    this.token = null;
  }

  async run() {
    console.log(chalk.bold.blue('\n🧹 ATMA Account Cleanup Tool'));
    console.log(chalk.gray('This tool helps you clean up test accounts and their associated data\n'));

    try {
      await this.getUserCredentials();
      await this.authenticateUser();
      await this.performCleanup();
      await this.showCleanupSummary();
    } catch (error) {
      TestUtils.logError(`Cleanup failed: ${error.message}`);
      console.error(error);
      process.exit(1);
    }
  }

  async getUserCredentials() {
    // For now, we'll use command line arguments or environment variables
    // In a real scenario, you might want to prompt for credentials
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
      console.log(chalk.yellow('\n📝 Usage:'));
      console.log(chalk.white('  node cleanup-account.js <email> <password>'));
      console.log(chalk.gray('\nExample:'));
      console.log(chalk.white('  node cleanup-account.js user@example.com myPassword123'));
      console.log(chalk.gray('\nOr set environment variables:'));
      console.log(chalk.white('  CLEANUP_EMAIL=user@example.com CLEANUP_PASSWORD=myPassword123 node cleanup-account.js'));
      
      // Try environment variables
      const envEmail = process.env.CLEANUP_EMAIL;
      const envPassword = process.env.CLEANUP_PASSWORD;
      
      if (envEmail && envPassword) {
        this.userCredentials = { email: envEmail, password: envPassword };
        TestUtils.logInfo(`Using credentials from environment variables for: ${envEmail}`);
        return;
      }
      
      throw new Error('Please provide email and password as arguments or environment variables');
    }

    this.userCredentials = { email, password };
    TestUtils.logInfo(`Preparing to clean up account: ${email}`);
  }

  async authenticateUser() {
    TestUtils.logStage('Step 1: Authenticating User');
    
    try {
      const startTime = Date.now();
      const response = await axios.post(`${config.api.baseUrl}/api/auth/login`, {
        email: this.userCredentials.email,
        password: this.userCredentials.password
      }, {
        timeout: config.api.timeout
      });

      const duration = Date.now() - startTime;
      
      if (response.data.success && response.data.data.token) {
        this.token = response.data.data.token;
        TestUtils.logSuccess(`User authenticated successfully in ${TestUtils.formatDuration(duration)}`);
        TestUtils.logInfo(`User ID: ${response.data.data.user.id}`);
        TestUtils.logInfo(`User Type: ${response.data.data.user.user_type}`);
        TestUtils.logInfo(`Token Balance: ${response.data.data.user.token_balance}`);
      } else {
        throw new Error('Login response missing token');
      }
      
      await TestUtils.delay(1000);
    } catch (error) {
      throw new Error(`Authentication failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async performCleanup() {
    TestUtils.logStage('Step 2: Performing Account Cleanup');
    
    try {
      const cleanupResults = await TestUtils.cleanupUserAccount(this.token, config.api.baseUrl);
      this.cleanupResults = cleanupResults;
      
      // Show cleanup summary
      console.log(chalk.cyan('\n📊 Cleanup Results:'));
      
      if (cleanupResults.profileDeleted) {
        TestUtils.logSuccess('✓ User profile deleted');
      } else {
        TestUtils.logWarning('⚠ User profile not deleted (may not exist)');
      }
      
      if (cleanupResults.resultsDeleted > 0) {
        TestUtils.logSuccess(`✓ ${cleanupResults.resultsDeleted} analysis results deleted`);
      } else {
        TestUtils.logInfo('ℹ No analysis results found to delete');
      }
      
      if (cleanupResults.jobsDeleted > 0) {
        TestUtils.logSuccess(`✓ ${cleanupResults.jobsDeleted} analysis jobs cancelled/deleted`);
      } else {
        TestUtils.logInfo('ℹ No analysis jobs found to delete');
      }
      
      if (cleanupResults.errors.length > 0) {
        TestUtils.logWarning(`⚠ ${cleanupResults.errors.length} errors occurred during cleanup:`);
        cleanupResults.errors.forEach(error => {
          console.log(chalk.red(`  • ${error}`));
        });
      }
      
    } catch (error) {
      throw new Error(`Cleanup operation failed: ${error.message}`);
    }
  }

  async showCleanupSummary() {
    console.log(chalk.bold.green('\n📋 CLEANUP SUMMARY'));
    console.log(chalk.gray('='.repeat(60)));
    
    console.log(chalk.bold(`\n👤 Account: ${this.userCredentials.email}`));
    
    const results = this.cleanupResults;
    const totalItems = (results.profileDeleted ? 1 : 0) + results.resultsDeleted + results.jobsDeleted;
    
    console.log(chalk.bold.yellow('\n🧹 CLEANUP RESULTS:'));
    
    if (totalItems > 0) {
      console.log(chalk.green(`✅ Successfully cleaned up ${totalItems} items:`));
      if (results.profileDeleted) {
        console.log(chalk.green('  ✓ User profile deleted'));
      }
      if (results.resultsDeleted > 0) {
        console.log(chalk.green(`  ✓ ${results.resultsDeleted} analysis results deleted`));
      }
      if (results.jobsDeleted > 0) {
        console.log(chalk.green(`  ✓ ${results.jobsDeleted} analysis jobs cancelled`));
      }
    } else {
      console.log(chalk.yellow('⚠ No items found to clean up'));
    }
    
    if (results.errors.length > 0) {
      console.log(chalk.red(`\n❌ ${results.errors.length} errors occurred`));
    } else {
      console.log(chalk.green('\n✅ No errors occurred'));
    }
    
    console.log(chalk.bold.yellow('\n⚠️  IMPORTANT NOTES:'));
    console.log(chalk.yellow('• This cleanup only removes user profile and analysis data'));
    console.log(chalk.yellow('• The user account itself still exists in the system'));
    console.log(chalk.yellow('• Complete account deletion requires admin privileges'));
    console.log(chalk.yellow('• Contact an administrator for complete account removal'));
    
    console.log(chalk.gray('\n' + '='.repeat(60)));
    console.log(chalk.bold.green('✅ Account cleanup completed!'));
  }
}

// Run the cleanup tool
if (require.main === module) {
  const cleanup = new AccountCleanup();
  cleanup.run().catch(error => {
    console.error(chalk.red('Cleanup failed:'), error);
    process.exit(1);
  });
}

module.exports = AccountCleanup;
