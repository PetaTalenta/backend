require('dotenv').config();
const APIClient = require('./lib/api-client');
const TestLogger = require('./lib/test-logger');
const TestDataGenerator = require('./lib/test-data');

class AssessmentStressTest {
  constructor() {
    this.logger = TestLogger.create('assessment-stress-test');
    this.dataGenerator = new TestDataGenerator();
    this.apiClient = new APIClient();
    // Configurable via env vars
    this.totalAssessments = parseInt(process.env.TOTAL_ASSESSMENTS, 10) || 50;
    this.batchSize = parseInt(process.env.BATCH_SIZE, 10) || 10;
    this.batches = Math.ceil(this.totalAssessments / this.batchSize);
    this.batchDelayMs = (process.env.BATCH_DELAY_SEC !== undefined)
      ? parseInt(process.env.BATCH_DELAY_SEC, 10) * 1000
      : 60000; // default 60s (previous behavior)
    this.pollIntervalMs = parseInt(process.env.POLL_INTERVAL_MS, 10) || 4000; // reduce rate-limit pressure (default 4s)
    this.assessmentResults = [];
  }

  async run() {
    try {
  this.logger.info(`Starting Assessment Stress Test: ${this.totalAssessments} assessments in ${this.batches} batches (batchSize=${this.batchSize}, batchDelay=${this.batchDelayMs/1000}s, pollInterval=${this.pollIntervalMs}ms)`);

      // Login with specified credentials
      await this.login();

      // Generate assessment data
      const assessmentData = this.generateAssessmentData();

      // Run assessment batches
      await this.runAssessmentBatches(assessmentData);

      // Generate report
      await this.generateReport();

      this.logger.success('Assessment Stress Test completed successfully');

    } catch (error) {
      this.logger.error('Assessment Stress Test failed', error);
      throw error;
    } finally {
      await this.logger.saveReport();
    }
  }

  async login() {
    this.logger.step('Login with test account', 1);

    try {
      await this.apiClient.login({
        email: 'kasykoi@gmail.com',
        password: 'Anjas123'
      });

      this.logger.success('Successfully logged in with test account');
    } catch (error) {
      this.logger.error('Login failed', error);
      throw error;
    }
  }

  generateAssessmentData() {
    this.logger.step('Generate assessment data', 2);

    const assessments = [];
    for (let i = 0; i < this.totalAssessments; i++) {
      const testData = this.dataGenerator.generateStressTestData(1)[0];
      assessments.push({
        id: i + 1,
        data: testData.assessment,
        startTime: null,
        endTime: null,
        jobId: null,
        status: 'pending'
      });
    }

    this.logger.success(`Generated ${this.totalAssessments} assessment data sets`);
    return assessments;
  }

  async runAssessmentBatches(assessments) {
    this.logger.step('Run assessment batches', 3);

    const batches = this.chunkArray(assessments, this.batchSize);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      this.logger.info(`Starting batch ${batchIndex + 1}/${this.batches} (${batch.length} assessments)`);

      const batchResults = await this.runSingleBatch(batch, batchIndex + 1);

      // Verify batch completion before proceeding
      const completedCount = batchResults.completed;
      const successRate = Math.round((completedCount / batch.length) * 100);

      this.logger.info(`Batch ${batchIndex + 1} verification: ${completedCount}/${batch.length} completed (${successRate}%)`);

      if (successRate < 80) {
        this.logger.warn(`Batch ${batchIndex + 1} has low success rate (${successRate}%). Consider increasing timeout or worker capacity.`);
      }

      // Check if we should continue to next batch
      if (batchIndex < batches.length - 1) {
        if (!this.shouldContinueToNextBatch(batchResults, batchIndex + 1)) {
          this.logger.warn('Stopping test due to poor batch performance');
          break;
        }

        // Delay between batches (configurable) unless delay is 0 or last batch
        if (batchIndex < batches.length - 1 && this.batchDelayMs > 0) {
          this.logger.info(`Waiting ${this.batchDelayMs/1000} seconds before next batch...`);
          await new Promise(resolve => setTimeout(resolve, this.batchDelayMs));
        }
      }
    }
  }

  async runSingleBatch(batch, batchNumber) {
    const startTime = Date.now();

    try {
      // Submit all assessments in this batch concurrently
      const submitPromises = batch.map(async (assessment) => {
        assessment.startTime = Date.now();
        const response = await this.apiClient.submitAssessment(assessment.data);
        assessment.jobId = response.data.jobId;
        assessment.status = 'submitted';
        this.logger.userAction(assessment.id, `Assessment ${assessment.id} submitted (Job ID: ${assessment.jobId})`);
        return assessment;
      });

      const submittedAssessments = await Promise.all(submitPromises);
      this.logger.success(`Batch ${batchNumber}: ${submittedAssessments.length} assessments submitted`);

      // Wait for all assessments in this batch to complete
      const batchResults = await this.waitForBatchCompletion(submittedAssessments, batchNumber);

      const batchTime = Date.now() - startTime;
      this.logger.success(`Batch ${batchNumber} completed in ${batchTime}ms`);

      return batchResults;

    } catch (error) {
      this.logger.error(`Batch ${batchNumber} failed`, error);
      throw error;
    }
  }

  async waitForBatchCompletion(assessments, batchNumber) {
    this.logger.info(`Waiting for batch ${batchNumber} assessments to complete...`);

    const completionPromises = assessments.map(async (assessment) => {
      try {
        // Poll for completion
  const timeoutMs = parseInt(process.env.JOB_TIMEOUT_MS, 10) || 300000; // 5 minutes default
  const pollIntervalMs = this.pollIntervalMs; // configurable
        const startedAt = Date.now();
        let lastStatus = 'pending';

        while ((Date.now() - startedAt) < timeoutMs) {
          try {
            const job = await this.apiClient.getJob(assessment.jobId);

            if (job?.success && job?.data?.status === 'completed' && job?.data?.result_id) {
              assessment.endTime = Date.now();
              assessment.status = 'completed';
              assessment.resultId = job.data.result_id;
              const duration = assessment.endTime - assessment.startTime;
              this.logger.userAction(assessment.id, `Assessment ${assessment.id} completed in ${duration}ms`);
              return assessment;
            } else if (job?.data?.status && job.data.status !== lastStatus) {
              lastStatus = job.data.status;
              this.logger.userAction(assessment.id, `Assessment ${assessment.id} status: ${lastStatus}`);
            }
          } catch (pollErr) {
            // Continue polling, but log occasional errors
            if ((Date.now() - startedAt) % 30000 < 2000) { // Log every 30 seconds
              this.logger.debug(`Assessment ${assessment.id} polling error: ${pollErr.message}`);
            }
          }
          await new Promise(r => setTimeout(r, pollIntervalMs));
        }

        // Timeout
        assessment.status = 'timeout';
        assessment.endTime = Date.now();
        this.logger.userAction(assessment.id, `Assessment ${assessment.id} timed out after ${timeoutMs}ms`);
        throw new Error(`Assessment ${assessment.id} timed out after ${timeoutMs}ms`);

      } catch (error) {
        assessment.status = 'failed';
        assessment.endTime = Date.now();
        assessment.error = error.message;
        this.logger.userAction(assessment.id, `Assessment ${assessment.id} failed: ${error.message}`);
        throw error;
      }
    });

    const results = await Promise.allSettled(completionPromises);

    const completed = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    this.logger.info(`Batch ${batchNumber} completion: ${completed} successful, ${failed} failed`);

    // Store results
    assessments.forEach(assessment => {
      this.assessmentResults.push(assessment);
    });

    return { completed, failed, total: assessments.length };
  }

  async generateReport() {
    this.logger.step('Generate assessment report', 4);

    const completed = this.assessmentResults.filter(a => a.status === 'completed').length;
    const failed = this.assessmentResults.filter(a => a.status === 'failed').length;
    const timeout = this.assessmentResults.filter(a => a.status === 'timeout').length;

    const completionTimes = this.assessmentResults
      .filter(a => a.status === 'completed')
      .map(a => a.endTime - a.startTime)
      .filter(time => time > 0);

    const averageTime = completionTimes.length > 0
      ? Math.round(completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length)
      : 0;

    const minTime = completionTimes.length > 0 ? Math.min(...completionTimes) : 0;
    const maxTime = completionTimes.length > 0 ? Math.max(...completionTimes) : 0;

    const report = {
      totalAssessments: this.totalAssessments,
      batches: this.batches,
      batchSize: this.batchSize,
      results: {
        completed,
        failed,
        timeout,
        successRate: Math.round((completed / this.totalAssessments) * 100)
      },
      performance: {
        averageCompletionTime: averageTime,
        minCompletionTime: minTime,
        maxCompletionTime: maxTime
      },
      account: {
        email: 'kasykoi@gmail.com'
      }
    };

    this.logger.success('Assessment Stress Test Report', report);
    return report;
  }

  shouldContinueToNextBatch(batchResults, batchNumber) {
    const completed = batchResults.completed;
    const total = batchResults.total;
    const successRate = Math.round((completed / total) * 100);

    // Continue if success rate is above 50% or if it's not the last batch
    if (successRate >= 50) {
      this.logger.info(`Proceeding to next batch (success rate: ${successRate}%)`);
      return true;
    } else {
      this.logger.warn(`Batch ${batchNumber} has very low success rate (${successRate}%). Stopping test.`);
      return false;
    }
  }

  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// Run test if called directly
if (require.main === module) {
  const test = new AssessmentStressTest();
  test.run()
    .then(() => {
      console.log('\n✅ Assessment Stress Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Assessment Stress Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = AssessmentStressTest;
