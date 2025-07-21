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
      profileDeleted: false,
      resultsDeleted: 0,
      jobsDeleted: 0,
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

      // Step 2: Perform cleanup
      const cleanupResults = await TestUtils.cleanupUserAccount(token, config.api.baseUrl);
      
      result.profileDeleted = cleanupResults.profileDeleted;
      result.resultsDeleted = cleanupResults.resultsDeleted;
      result.jobsDeleted = cleanupResults.jobsDeleted;
      result.errors = cleanupResults.errors;
      result.success = cleanupResults.errors.length === 0;

      const totalCleaned = (result.profileDeleted ? 1 : 0) + result.resultsDeleted + result.jobsDeleted;
      
      if (result.success && totalCleaned > 0) {
        TestUtils.logSuccess(`[${index}] ✓ ${account.email} - cleaned ${totalCleaned} items`);
      } else if (result.success && totalCleaned === 0) {
        TestUtils.logInfo(`[${index}] ℹ ${account.email} - no items to clean`);
      } else {
        TestUtils.logWarning(`[${index}] ⚠ ${account.email} - partial cleanup (${result.errors.length} errors)`);
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
    const totalProfilesDeleted = this.results.reduce((sum, r) => sum + (r.profileDeleted ? 1 : 0), 0);
    const totalResultsDeleted = this.results.reduce((sum, r) => sum + r.resultsDeleted, 0);
    const totalJobsDeleted = this.results.reduce((sum, r) => sum + r.jobsDeleted, 0);
    const totalErrors = this.results.reduce((sum, r) => sum + r.errors.length, 0);
    
    console.log(chalk.bold.yellow('\n🎯 SUMMARY:'));
    console.log(chalk.green(`✅ Successfully processed: ${successful}/${this.accounts.length} accounts`));
    console.log(chalk.blue(`🔐 Successfully authenticated: ${authenticated}/${this.accounts.length} accounts`));
    console.log(chalk.cyan(`👤 Profiles deleted: ${totalProfilesDeleted}`));
    console.log(chalk.cyan(`📊 Analysis results deleted: ${totalResultsDeleted}`));
    console.log(chalk.cyan(`⚙️  Analysis jobs cancelled: ${totalJobsDeleted}`));
    
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
    console.log(chalk.yellow('• This cleanup only removes user profiles and analysis data'));
    console.log(chalk.yellow('• User accounts themselves still exist in the system'));
    console.log(chalk.yellow('• Complete account deletion requires admin privileges'));
    console.log(chalk.yellow('• Contact an administrator for complete account removal'));
    
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
