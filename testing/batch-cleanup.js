#!/usr/bin/env node

const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const TestUtils = require('./utils');

class BatchAccountCleanup {
  constructor() {
    this.accounts = [];
    this.results = [];
    this.startTime = Date.now();
  }

  async run() {
    console.log(chalk.bold.blue('\n🧹 ATMA Batch Account Cleanup Tool'));
    console.log(chalk.gray('Clean up multiple test accounts and their associated data\n'));

    try {
      await this.loadAccountList();
      await this.performBatchCleanup();
      await this.generateReport();
    } catch (error) {
      TestUtils.logError(`Batch cleanup failed: ${error.message}`);
      console.error(error);
      process.exit(1);
    }
  }

  async loadAccountList() {
    TestUtils.logStage('Step 1: Loading Account List');

    // Try to load from file first
    const accountsFile = process.argv[2] || 'test-accounts.json';
    
    if (fs.existsSync(accountsFile)) {
      try {
        const fileContent = fs.readFileSync(accountsFile, 'utf8');
        this.accounts = JSON.parse(fileContent);
        TestUtils.logSuccess(`Loaded ${this.accounts.length} accounts from ${accountsFile}`);
        return;
      } catch (error) {
        TestUtils.logWarning(`Failed to load accounts from file: ${error.message}`);
      }
    }

    // If no file, try environment variable
    const accountsEnv = process.env.CLEANUP_ACCOUNTS;
    if (accountsEnv) {
      try {
        this.accounts = JSON.parse(accountsEnv);
        TestUtils.logSuccess(`Loaded ${this.accounts.length} accounts from environment variable`);
        return;
      } catch (error) {
        TestUtils.logWarning(`Failed to parse accounts from environment: ${error.message}`);
      }
    }

    // Generate sample accounts for demonstration
    TestUtils.logInfo('No account list provided, generating sample test accounts...');
    this.accounts = this.generateSampleAccounts(5);
    
    // Save sample accounts to file for reference
    try {
      fs.writeFileSync('sample-test-accounts.json', JSON.stringify(this.accounts, null, 2));
      TestUtils.logInfo('Sample accounts saved to sample-test-accounts.json');
    } catch (error) {
      TestUtils.logWarning(`Failed to save sample accounts: ${error.message}`);
    }

    console.log(chalk.yellow('\n📝 Usage:'));
    console.log(chalk.white('  node batch-cleanup.js [accounts-file.json]'));
    console.log(chalk.gray('\nAccount file format:'));
    console.log(chalk.white('  ['));
    console.log(chalk.white('    {"email": "user1@example.com", "password": "password123"},'));
    console.log(chalk.white('    {"email": "user2@example.com", "password": "password456"}'));
    console.log(chalk.white('  ]'));
    console.log(chalk.gray('\nOr set environment variable:'));
    console.log(chalk.white('  CLEANUP_ACCOUNTS=\'[{"email":"user@example.com","password":"pass123"}]\' node batch-cleanup.js'));
  }

  generateSampleAccounts(count) {
    const accounts = [];
    for (let i = 1; i <= count; i++) {
      const userData = TestUtils.generateRandomUser(i);
      accounts.push({
        email: userData.email,
        password: userData.password
      });
    }
    return accounts;
  }

  async performBatchCleanup() {
    TestUtils.logStage('Step 2: Performing Batch Cleanup');
    
    console.log(chalk.cyan(`\n🔄 Processing ${this.accounts.length} accounts...\n`));

    const concurrency = Math.min(config.test?.concurrency || 5, this.accounts.length);
    
    for (let i = 0; i < this.accounts.length; i += concurrency) {
      const batch = this.accounts.slice(i, i + concurrency);
      const batchPromises = batch.map(async (account, batchIndex) => {
        const accountIndex = i + batchIndex + 1;
        return await this.cleanupSingleAccount(account, accountIndex);
      });
      
      const batchResults = await Promise.all(batchPromises);
      this.results.push(...batchResults);
      
      // Small delay between batches to avoid overwhelming the server
      if (i + concurrency < this.accounts.length) {
        await TestUtils.delay(1000);
      }
    }
  }

  async cleanupSingleAccount(account, index) {
    const result = {
      index,
      email: account.email,
      success: false,
      authenticated: false,
      accountDeleted: false,
      originalEmail: null,
      deletedAt: null,
      errors: [],
      duration: 0
    };

    const startTime = Date.now();

    try {
      // Step 1: Authenticate
      TestUtils.logInfo(`[${index}] Authenticating ${account.email}...`);

      const loginResponse = await axios.post(`${config.api.baseUrl}/api/auth/login`, {
        email: account.email,
        password: account.password
      }, {
        timeout: config.api.timeout
      });

      if (!loginResponse.data.success || !loginResponse.data.data.token) {
        throw new Error('Authentication failed - invalid credentials');
      }

      result.authenticated = true;
      const token = loginResponse.data.data.token;

      // Step 2: Perform account deletion
      const deletionResults = await TestUtils.deleteUserAccount(token, config.api.baseUrl);

      result.accountDeleted = deletionResults.accountDeleted;
      result.originalEmail = deletionResults.originalEmail;
      result.deletedAt = deletionResults.deletedAt;
      result.errors = deletionResults.errors;
      result.success = deletionResults.accountDeleted && deletionResults.errors.length === 0;

      if (result.success) {
        TestUtils.logSuccess(`[${index}] ✓ ${account.email} - account deleted successfully`);
      } else {
        TestUtils.logError(`[${index}] ✗ ${account.email} - deletion failed (${result.errors.length} errors)`);
      }

    } catch (error) {
      result.errors.push(error.message);
      TestUtils.logError(`[${index}] ✗ ${account.email} - ${error.message}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  async generateReport() {
    const totalDuration = Date.now() - this.startTime;
    
    console.log(chalk.bold.green('\n📊 BATCH CLEANUP REPORT'));
    console.log(chalk.gray('='.repeat(80)));
    
    console.log(chalk.bold(`\n⏱️  Total Duration: ${TestUtils.formatDuration(totalDuration)}`));
    console.log(chalk.bold(`👥 Total Accounts: ${this.accounts.length}`));
    
    // Calculate statistics
    const successful = this.results.filter(r => r.success).length;
    const authenticated = this.results.filter(r => r.authenticated).length;
    const totalAccountsDeleted = this.results.reduce((sum, r) => sum + (r.accountDeleted ? 1 : 0), 0);
    const totalErrors = this.results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log(chalk.bold.yellow('\n🎯 SUMMARY:'));
    console.log(chalk.green(`✅ Successfully processed: ${successful}/${this.accounts.length} accounts`));
    console.log(chalk.blue(`🔐 Successfully authenticated: ${authenticated}/${this.accounts.length} accounts`));
    console.log(chalk.cyan(`🗑️  Accounts deleted: ${totalAccountsDeleted}`));

    if (totalErrors > 0) {
      console.log(chalk.red(`❌ Total errors: ${totalErrors}`));
    } else {
      console.log(chalk.green(`✅ No errors occurred`));
    }
    
    // Show failed accounts
    const failed = this.results.filter(r => !r.success);
    if (failed.length > 0) {
      console.log(chalk.bold.red('\n❌ FAILED ACCOUNTS:'));
      failed.forEach(result => {
        console.log(chalk.red(`  • ${result.email}: ${result.errors.join(', ')}`));
      });
    }
    
    console.log(chalk.bold.yellow('\n⚠️  IMPORTANT NOTES:'));
    console.log(chalk.yellow('• This performs complete soft deletion of user accounts'));
    console.log(chalk.yellow('• Account emails are changed to deleted_{timestamp}_{original_email}'));
    console.log(chalk.yellow('• Token balances are reset to 0 and accounts are deactivated'));
    console.log(chalk.yellow('• User profiles and all associated data are automatically deleted'));
    console.log(chalk.yellow('• These operations cannot be undone'));
    console.log(chalk.yellow('• Users can no longer login with these accounts'));
    
    console.log(chalk.gray('\n' + '='.repeat(80)));
    console.log(chalk.bold.green('✅ Batch cleanup completed!'));
  }
}

// Run the batch cleanup tool
if (require.main === module) {
  const batchCleanup = new BatchAccountCleanup();
  batchCleanup.run().catch(error => {
    console.error(chalk.red('Batch cleanup failed:'), error);
    process.exit(1);
  });
}

module.exports = BatchAccountCleanup;
