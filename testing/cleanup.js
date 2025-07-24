require('dotenv').config();
const axios = require('axios');
const chalk = require('chalk');
const TestDataGenerator = require('./lib/test-data');
const TestLogger = require('./lib/test-logger');

class TestCleanup {
  constructor() {
    this.logger = TestLogger.create('cleanup');
    this.dataGenerator = new TestDataGenerator();
    this.baseURL = process.env.API_BASE_URL || 'http://localhost:3000/api';
    this.cleanupCount = 0;
    this.errorCount = 0;
  }

  async run() {
    try {
      this.logger.info('Starting test data cleanup');
      
      console.log(chalk.cyan('🧹 ATMA Test Data Cleanup'));
      console.log(chalk.cyan('==========================\n'));
      
      // Clean test users
      await this.cleanTestUsers();
      
      // Clean test conversations
      await this.cleanTestConversations();
      
      // Clean test results
      await this.cleanTestResults();
      
      // Clean test jobs
      await this.cleanTestJobs();
      
      // Generate cleanup report
      await this.generateCleanupReport();
      
      this.logger.success('Test data cleanup completed successfully');
      
    } catch (error) {
      this.logger.error('Test data cleanup failed', error);
      throw error;
    } finally {
      await this.logger.saveReport();
    }
  }

  async cleanTestUsers() {
    this.logger.step('Clean Test Users', 1);
    
    try {
      // This would require admin access or a special cleanup endpoint
      // For now, we'll just log what would be cleaned
      
      const testEmailPattern = this.dataGenerator.getTestUserPattern();
      
      this.logger.info('Test user pattern for cleanup:', {
        pattern: testEmailPattern.toString(),
        domain: process.env.EMAIL_DOMAIN || 'example.com'
      });
      
      // In a real implementation, you would:
      // 1. Query database for users matching the test pattern
      // 2. Delete their data (conversations, results, jobs)
      // 3. Delete the user accounts
      
      this.logger.warning('User cleanup requires admin access - skipping for now');
      
    } catch (error) {
      this.logger.error('Test user cleanup failed', error);
      this.errorCount++;
    }
  }

  async cleanTestConversations() {
    this.logger.step('Clean Test Conversations', 2);
    
    try {
      // This would require iterating through test users and their conversations
      this.logger.info('Conversation cleanup would remove:');
      this.logger.info('- Conversations with test_session metadata');
      this.logger.info('- Conversations created by e2e_test');
      this.logger.info('- Conversations with titles containing "E2E Test" or "Stress Test"');
      
      this.logger.warning('Conversation cleanup requires user authentication - skipping for now');
      
    } catch (error) {
      this.logger.error('Test conversation cleanup failed', error);
      this.errorCount++;
    }
  }

  async cleanTestResults() {
    this.logger.step('Clean Test Results', 3);
    
    try {
      // This would require admin access to archive service
      this.logger.info('Results cleanup would remove:');
      this.logger.info('- Results with assessment names containing "AI-Driven Talent Mapping"');
      this.logger.info('- Results from test user accounts');
      
      this.logger.warning('Results cleanup requires admin access - skipping for now');
      
    } catch (error) {
      this.logger.error('Test results cleanup failed', error);
      this.errorCount++;
    }
  }

  async cleanTestJobs() {
    this.logger.step('Clean Test Jobs', 4);
    
    try {
      // This would require admin access to archive service
      this.logger.info('Jobs cleanup would remove:');
      this.logger.info('- Jobs with assessment names containing "AI-Driven Talent Mapping"');
      this.logger.info('- Jobs from test user accounts');
      
      this.logger.warning('Jobs cleanup requires admin access - skipping for now');
      
    } catch (error) {
      this.logger.error('Test jobs cleanup failed', error);
      this.errorCount++;
    }
  }

  async generateCleanupReport() {
    this.logger.step('Generate Cleanup Report', 5);
    
    const report = {
      timestamp: new Date().toISOString(),
      cleanupCount: this.cleanupCount,
      errorCount: this.errorCount,
      recommendations: [
        'Implement admin cleanup endpoints for automated test data removal',
        'Add test data markers to enable easier identification',
        'Consider using separate test database for E2E tests',
        'Implement automatic cleanup after test completion'
      ],
      manualCleanupSteps: [
        '1. Connect to database directly',
        '2. Identify test users by email pattern: ' + this.dataGenerator.getTestUserPattern().toString(),
        '3. Delete related data: conversations, results, jobs',
        '4. Delete test user accounts',
        '5. Clean up any orphaned data'
      ]
    };
    
    console.log(chalk.yellow('\n📋 Cleanup Report'));
    console.log(chalk.yellow('=================='));
    console.log(`Cleanup Operations: ${this.cleanupCount}`);
    console.log(`Errors: ${this.errorCount}`);
    
    console.log(chalk.cyan('\n💡 Recommendations:'));
    report.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    
    console.log(chalk.cyan('\n🔧 Manual Cleanup Steps:'));
    report.manualCleanupSteps.forEach(step => {
      console.log(step);
    });
    
    this.logger.success('Cleanup report generated', report);
    
    return report;
  }

  // Helper method to identify test data
  static isTestData(data) {
    const testIndicators = [
      'example.com',
      'testuser_',
      'E2E Test',
      'AI-Driven Talent Mapping',
      'Stress Test',
      'test_session',
      'e2e_test'
    ];
    
    const dataString = JSON.stringify(data).toLowerCase();
    return testIndicators.some(indicator => 
      dataString.includes(indicator.toLowerCase())
    );
  }

  // Helper method for database cleanup (would require database connection)
  static async cleanupDatabase() {
    // This would be implemented with direct database access
    // Example SQL queries for cleanup:
    
    const cleanupQueries = [
      // Clean test users
      `DELETE FROM users WHERE email LIKE '%example.com'`,
      
      // Clean test conversations
      `DELETE FROM conversations WHERE title LIKE '%E2E Test%' OR title LIKE '%Stress Test%'`,
      
      // Clean test results
      `DELETE FROM analysis_results WHERE assessment_name LIKE '%AI-Driven Talent Mapping%'`,

      // Clean test jobs
      `DELETE FROM analysis_jobs WHERE assessment_name LIKE '%AI-Driven Talent Mapping%'`,
      
      // Clean orphaned data
      `DELETE FROM chat_messages WHERE conversation_id NOT IN (SELECT id FROM conversations)`,
      `DELETE FROM analysis_results WHERE user_id NOT IN (SELECT id FROM users)`,
      `DELETE FROM analysis_jobs WHERE user_id NOT IN (SELECT id FROM users)`
    ];
    
    console.log(chalk.yellow('Database cleanup queries:'));
    cleanupQueries.forEach((query, index) => {
      console.log(`${index + 1}. ${query}`);
    });
    
    return cleanupQueries;
  }
}

// CLI options
function parseArgs() {
  const args = process.argv.slice(2);
  
  return {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    verbose: args.includes('--verbose')
  };
}

// Run if called directly
if (require.main === module) {
  const options = parseArgs();
  
  console.log(chalk.blue('ATMA Test Data Cleanup'));
  console.log(chalk.blue('Options:'), options);
  
  if (options.dryRun) {
    console.log(chalk.yellow('🔍 DRY RUN MODE - No actual cleanup will be performed\n'));
  }
  
  const cleanup = new TestCleanup();
  cleanup.run()
    .then(() => {
      console.log(chalk.green('\n✅ Cleanup process completed'));
      
      if (cleanup.errorCount > 0) {
        console.log(chalk.yellow(`⚠️  ${cleanup.errorCount} errors occurred during cleanup`));
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error(chalk.red('\n❌ Cleanup process failed:'), error.message);
      process.exit(1);
    });
}

module.exports = TestCleanup;
