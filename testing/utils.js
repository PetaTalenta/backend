const { v4: uuidv4 } = require('uuid');
const chalk = require('chalk');

class TestUtils {
  static generateRandomUser(index) {
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Tom', 'Emma', 'Chris', 'Anna'];
    const lastNames = ['Smith', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Miller', 'Moore', 'Taylor', 'Anderson', 'Thomas'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    
    return {
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${index}@${domain}`,
      password: `TestPass${index}123`,
      username: `${firstName.toLowerCase()}${lastName.toLowerCase()}${index}`,
      full_name: `${firstName} ${lastName}`,
      date_of_birth: this.generateRandomDate(),
      gender: this.getRandomGender()
    };
  }
  
  static generateRandomDate() {
    const start = new Date(1990, 0, 1);
    const end = new Date(2005, 11, 31);
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0];
  }
  
  static getRandomGender() {
    // Based on database model validation, only 'male' and 'female' are allowed
    const genders = ['male', 'female'];
    return genders[Math.floor(Math.random() * genders.length)];
  }
  
  static randomizeAssessmentScores(template) {
    const randomized = JSON.parse(JSON.stringify(template));
    
    // Randomize RIASEC scores (±15 points)
    Object.keys(randomized.riasec).forEach(key => {
      const variation = Math.floor(Math.random() * 31) - 15; // -15 to +15
      randomized.riasec[key] = Math.max(0, Math.min(100, randomized.riasec[key] + variation));
    });
    
    // Randomize OCEAN scores (±15 points)
    Object.keys(randomized.ocean).forEach(key => {
      const variation = Math.floor(Math.random() * 31) - 15;
      randomized.ocean[key] = Math.max(0, Math.min(100, randomized.ocean[key] + variation));
    });
    
    // Randomize VIA-IS scores (±15 points)
    Object.keys(randomized.viaIs).forEach(key => {
      const variation = Math.floor(Math.random() * 31) - 15;
      randomized.viaIs[key] = Math.max(0, Math.min(100, randomized.viaIs[key] + variation));
    });
    
    return randomized;
  }
  
  static async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  static formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  }
  
  static calculateStats(durations) {
    if (durations.length === 0) return { min: 0, max: 0, avg: 0, p95: 0, p99: 0 };
    
    const sorted = durations.sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / sorted.length,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }
  
  static logSuccess(message) {
    console.log(chalk.green('✓'), message);
  }
  
  static logError(message) {
    console.log(chalk.red('✗'), message);
  }
  
  static logInfo(message) {
    console.log(chalk.blue('ℹ'), message);
  }
  
  static logWarning(message) {
    console.log(chalk.yellow('⚠'), message);
  }
  
  static logStage(stage) {
    console.log(chalk.cyan.bold(`\n=== ${stage} ===`));
  }
  
  static generateIdempotencyKey() {
    return uuidv4();
  }
  
  static async executeWithRetry(fn, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.delay(delay * (i + 1));
      }
    }
  }
  
  static async executeConcurrently(tasks, concurrency = 10) {
    const results = [];
    const errors = [];

    for (let i = 0; i < tasks.length; i += concurrency) {
      const batch = tasks.slice(i, i + concurrency);
      const batchPromises = batch.map(async (task, index) => {
        try {
          const result = await task();
          return { success: true, result, index: i + index };
        } catch (error) {
          return { success: false, error, index: i + index };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach(result => {
        if (result.success) {
          results.push(result);
        } else {
          errors.push(result);
        }
      });
    }

    return { results, errors };
  }

  /**
   * Clean up user account by deleting profile and analysis results
   * Note: Complete user account deletion requires admin privileges
   * @param {string} token - User's JWT token
   * @param {string} baseUrl - API base URL
   * @returns {Object} Cleanup results
   */
  static async cleanupUserAccount(token, baseUrl) {
    const results = {
      profileDeleted: false,
      resultsDeleted: 0,
      jobsDeleted: 0,
      errors: []
    };

    try {
      // 1. Delete user profile (this only deletes profile data, not the user account)
      try {
        const axios = require('axios');
        const profileResponse = await axios.delete(`${baseUrl}/api/auth/profile`, {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        });

        if (profileResponse.data.success) {
          results.profileDeleted = true;
          this.logSuccess('User profile deleted successfully');
        }
      } catch (error) {
        if (error.response?.status === 404) {
          this.logInfo('No user profile found to delete');
        } else {
          results.errors.push(`Profile deletion failed: ${error.response?.data?.error?.message || error.message}`);
          this.logError(`Profile deletion failed: ${error.response?.data?.error?.message || error.message}`);
        }
      }

      // 2. Get and delete all analysis results
      try {
        const axios = require('axios');
        const resultsResponse = await axios.get(`${baseUrl}/api/archive/results`, {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        });

        if (resultsResponse.data.success && resultsResponse.data.data.results) {
          const results_list = resultsResponse.data.data.results;

          for (const result of results_list) {
            try {
              await axios.delete(`${baseUrl}/api/archive/results/${result.id}`, {
                headers: { 'Authorization': `Bearer ${token}` },
                timeout: 10000
              });
              results.resultsDeleted++;
            } catch (deleteError) {
              results.errors.push(`Failed to delete result ${result.id}: ${deleteError.response?.data?.error?.message || deleteError.message}`);
            }
          }

          if (results.resultsDeleted > 0) {
            this.logSuccess(`Deleted ${results.resultsDeleted} analysis results`);
          }
        }
      } catch (error) {
        results.errors.push(`Failed to fetch results: ${error.response?.data?.error?.message || error.message}`);
        this.logError(`Failed to fetch results: ${error.response?.data?.error?.message || error.message}`);
      }

      // 3. Get and delete/cancel all analysis jobs
      try {
        const axios = require('axios');
        const jobsResponse = await axios.get(`${baseUrl}/api/archive/jobs`, {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        });

        if (jobsResponse.data.success && jobsResponse.data.data.jobs) {
          const jobs_list = jobsResponse.data.data.jobs;

          for (const job of jobs_list) {
            try {
              await axios.delete(`${baseUrl}/api/archive/jobs/${job.id}`, {
                headers: { 'Authorization': `Bearer ${token}` },
                timeout: 10000
              });
              results.jobsDeleted++;
            } catch (deleteError) {
              results.errors.push(`Failed to delete job ${job.id}: ${deleteError.response?.data?.error?.message || deleteError.message}`);
            }
          }

          if (results.jobsDeleted > 0) {
            this.logSuccess(`Deleted/cancelled ${results.jobsDeleted} analysis jobs`);
          }
        }
      } catch (error) {
        results.errors.push(`Failed to fetch jobs: ${error.response?.data?.error?.message || error.message}`);
        this.logError(`Failed to fetch jobs: ${error.response?.data?.error?.message || error.message}`);
      }

    } catch (error) {
      results.errors.push(`Cleanup failed: ${error.message}`);
      this.logError(`Cleanup failed: ${error.message}`);
    }

    return results;
  }
}

module.exports = TestUtils;
