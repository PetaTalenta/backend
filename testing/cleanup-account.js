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
    TestUtils.logStage('Step 2: Deleting User Account');

    try {
      const deletionResults = await TestUtils.deleteUserAccount(this.token, config.api.baseUrl);
      this.deletionResults = deletionResults;

      // Show deletion summary
      console.log(chalk.cyan('\n📊 Deletion Results:'));

      if (deletionResults.accountDeleted) {
        TestUtils.logSuccess('✓ User account deleted successfully');
        if (deletionResults.originalEmail) {
          TestUtils.logInfo(`Original email: ${deletionResults.originalEmail}`);
        }
        if (deletionResults.deletedAt) {
          TestUtils.logInfo(`Deleted at: ${deletionResults.deletedAt}`);
        }
      } else {
        TestUtils.logError('✗ Account deletion failed');
      }

      if (deletionResults.errors.length > 0) {
        TestUtils.logWarning(`⚠ ${deletionResults.errors.length} errors occurred during deletion:`);
        deletionResults.errors.forEach(error => {
          console.log(chalk.red(`  • ${error}`));
        });
      }

    } catch (error) {
      throw new Error(`Account deletion operation failed: ${error.message}`);
    }
  }

  async showCleanupSummary() {
    console.log(chalk.bold.green('\n📋 ACCOUNT DELETION SUMMARY'));
    console.log(chalk.gray('='.repeat(60)));

    console.log(chalk.bold(`\n👤 Account: ${this.userCredentials.email}`));

    const results = this.deletionResults;

    console.log(chalk.bold.yellow('\n🗑️  DELETION RESULTS:'));

    if (results.accountDeleted) {
      console.log(chalk.green('✅ Account successfully deleted'));
      if (results.originalEmail) {
        console.log(chalk.green(`  ✓ Original email: ${results.originalEmail}`));
      }
      if (results.deletedAt) {
        console.log(chalk.green(`  ✓ Deleted at: ${results.deletedAt}`));
      }
    } else {
      console.log(chalk.red('❌ Account deletion failed'));
    }

    if (results.errors.length > 0) {
      console.log(chalk.red(`\n❌ ${results.errors.length} errors occurred`));
      results.errors.forEach(error => {
        console.log(chalk.red(`  • ${error}`));
      });
    } else {
      console.log(chalk.green('\n✅ No errors occurred'));
    }

    console.log(chalk.bold.yellow('\n⚠️  IMPORTANT NOTES:'));
    console.log(chalk.yellow('• This performs a complete soft delete of the user account'));
    console.log(chalk.yellow('• The account email is changed to deleted_{timestamp}_{original_email}'));
    console.log(chalk.yellow('• Token balance is reset to 0 and account is deactivated'));
    console.log(chalk.yellow('• User profile and all associated data are automatically deleted'));
    console.log(chalk.yellow('• This operation cannot be undone'));
    console.log(chalk.yellow('• The user can no longer login with this account'));

    console.log(chalk.gray('\n' + '='.repeat(60)));
    console.log(chalk.bold.green('✅ Account deletion completed!'));
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
