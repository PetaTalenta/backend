// Configuration
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null;
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'f8c1af59d85da6581036e18b4b9e0ec35d1fdefe1a93837d5b4746c9984ea4c1';

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to log with timestamp
const log = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

/**
 * Get admin token if not provided via environment
 */
async function getAdminToken() {
  if (ADMIN_TOKEN) {
    log('Using admin token from environment variable');
    return ADMIN_TOKEN;
  }

  // Try to get from login_response.json if it exists
  const loginFile = path.join(__dirname, 'login_response.json');

  if (fs.existsSync(loginFile)) {
    try {
      const loginData = JSON.parse(fs.readFileSync(loginFile, 'utf8'));
      if (loginData.token) {
        log('Using admin token from login_response.json');
        return loginData.token;
      }
    } catch (error) {
      log('Failed to read login_response.json', error.message);
    }
  }

  // If no token available, try to login as admin
  log('No admin token found. Please login as admin first or set ADMIN_TOKEN environment variable');
  log('You can run: node test-admin-token.js or check login_response.json');
  throw new Error('Admin token required');
}

/**
 * Get all failed jobs
 */
async function getFailedJobs(token) {
  log('===== FETCHING FAILED JOBS =====');
  
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/archive/admin/jobs/all`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Internal-Service': 'true',
          'X-Service-Key': INTERNAL_SERVICE_KEY
        },
        params: {
          status: 'failed',
          limit: 100,
          page: 1
        }
      }
    );

    const jobs = response.data.data?.jobs || response.data.jobs || [];
    log(`✓ Found ${jobs.length} failed jobs`, { 
      count: jobs.length,
      page: response.data.data?.pagination || response.data.pagination
    });

    return jobs;
  } catch (error) {
    log('✗ Failed to fetch failed jobs', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Cancel/Delete a specific job
 */
async function cancelJob(jobId, token) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/archive/admin/jobs/${jobId}/cancel`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Internal-Service': 'true',
          'X-Service-Key': INTERNAL_SERVICE_KEY
        }
      }
    );

    log(`✓ Job ${jobId} cancelled/deleted`, response.data);
    return true;
  } catch (error) {
    log(`✗ Failed to cancel job ${jobId}`, error.response?.data || error.message);
    return false;
  }
}

/**
 * Bulk cancel/delete jobs
 */
async function bulkCancelJobs(jobIds, token) {
  try {
    log(`\n🗑️  Bulk cancelling ${jobIds.length} jobs...`);
    
    const response = await axios.post(
      `${API_BASE_URL}/api/archive/admin/jobs/bulk`,
      {
        operation: 'cancel',
        jobIds: jobIds
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Internal-Service': 'true',
          'X-Service-Key': INTERNAL_SERVICE_KEY
        }
      }
    );

    const data = response.data.data || response.data;
    log(`✓ Bulk cancel completed`, {
      successful: data.successful?.length || 0,
      failed: data.failed?.length || 0,
      total: jobIds.length
    });
    
    return data;
  } catch (error) {
    log(`✗ Bulk cancel failed`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Check DLQ stats
 */
async function checkDLQStats() {
  log('===== CHECKING DLQ STATISTICS =====');
  
  try {
    // Try to check RabbitMQ management API if available
    const rabbitmqManagementUrl = process.env.RABBITMQ_MANAGEMENT_URL || 'http://localhost:15672';
    const rabbitmqUser = process.env.RABBITMQ_USER || 'guest';
    const rabbitmqPass = process.env.RABBITMQ_PASSWORD || 'guest';

    const response = await axios.get(
      `${rabbitmqManagementUrl}/api/queues/%2F/analysis.dlq`,
      {
        auth: {
          username: rabbitmqUser,
          password: rabbitmqPass
        }
      }
    );

    const messageCount = response.data.messages || 0;
    log(`✓ DLQ contains ${messageCount} messages`, {
      ready: response.data.messages_ready || 0,
      unacked: response.data.messages_unacknowledged || 0,
      total: messageCount
    });

    return messageCount;
  } catch (error) {
    log('⚠ Could not check DLQ via RabbitMQ Management API', error.message);
    log('ℹ Make sure RabbitMQ management plugin is enabled and accessible');
    return -1; // Unknown
  }
}

/**
 * Delete/cancel failed jobs using bulk operation
 */
async function deleteFailedJobs(jobs, token, options = {}) {
  const { 
    maxJobs = jobs.length,
    batchSize = 100, // Max allowed by API
    skipJobIds = []
  } = options;

  log('===== DELETING FAILED JOBS =====');
  log(`Will delete up to ${maxJobs} jobs in batches of ${batchSize}`);

  const results = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  // Filter jobs to process
  let jobsToDelete = jobs
    .filter(job => !skipJobIds.includes(job.id))
    .slice(0, maxJobs);

  if (jobsToDelete.length === 0) {
    log('⚠ No jobs to delete after filtering');
    return results;
  }

  log(`Processing ${jobsToDelete.length} jobs...`);
  
  // Process in batches
  for (let i = 0; i < jobsToDelete.length; i += batchSize) {
    const batch = jobsToDelete.slice(i, i + batchSize);
    const batchJobIds = batch.map(job => job.id);
    
    log(`\n🗑️  Batch ${Math.floor(i / batchSize) + 1}: Deleting ${batch.length} jobs`);
    
    // Show job details
    batch.forEach((job, idx) => {
      log(`  [${i + idx + 1}] ${job.id}`, {
        user: job.user_id,
        assessment: job.assessment_name,
        created: job.created_at,
        failed: job.updated_at
      });
    });

    try {
      const bulkResult = await bulkCancelJobs(batchJobIds, token);
      
      results.success += bulkResult.successful?.length || 0;
      results.failed += bulkResult.failed?.length || 0;
      results.total += batch.length;

      if (bulkResult.failed && bulkResult.failed.length > 0) {
        bulkResult.failed.forEach(failedJob => {
          results.errors.push({
            jobId: failedJob.jobId,
            reason: failedJob.reason
          });
        });
      }

      // Brief wait between batches
      if (i + batchSize < jobsToDelete.length) {
        await wait(1000);
      }
    } catch (error) {
      log(`✗ Batch failed completely`, error.message);
      results.failed += batch.length;
      batch.forEach(job => {
        results.errors.push({
          jobId: job.id,
          userId: job.user_id,
          reason: 'Batch operation failed'
        });
      });
    }
  }

  results.skipped = jobs.length - jobsToDelete.length;
  return results;
}

/**
 * Main cleanup function
 */
async function cleanupDLQ() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          DLQ CLEANUP & FAILED JOBS DELETION TOOL           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    // Step 1: Get admin token
    const token = await getAdminToken();
    
    await wait(1000);

    // Step 2: Check DLQ stats
    const dlqCount = await checkDLQStats();
    
    await wait(1000);

    // Step 3: Get failed jobs
    const failedJobs = await getFailedJobs(token);

    if (failedJobs.length === 0) {
      log('\n✓ No failed jobs found. DLQ is clean!');
      return;
    }

    // Ask for confirmation
    log(`\n⚠️  WARNING: About to DELETE ${failedJobs.length} failed jobs!`);
    log('This will cancel and remove them from the system.');
    
    await wait(2000);

    // Step 4: Delete failed jobs
    const deleteResults = await deleteFailedJobs(failedJobs, token, {
      maxJobs: process.env.MAX_JOBS ? parseInt(process.env.MAX_JOBS) : failedJobs.length,
      batchSize: 100
    });

    // Step 5: Print summary
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    CLEANUP SUMMARY                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');

    console.log(`  📊 Total jobs processed: ${deleteResults.total}`);
    console.log(`  ✓  Successfully deleted: ${deleteResults.success}`);
    console.log(`  ✗  Failed to delete:     ${deleteResults.failed}`);
    console.log(`  ⊘  Skipped:              ${deleteResults.skipped}`);
    console.log('\n');

    if (deleteResults.errors.length > 0) {
      console.log('  Failed to delete:');
      deleteResults.errors.forEach(err => {
        console.log(`    - ${err.jobId}: ${err.reason || 'Unknown error'}`);
      });
      console.log('\n');
    }

    if (dlqCount > 0 && dlqCount !== -1) {
      console.log(`  ℹ  DLQ had ${dlqCount} messages before cleanup`);
      console.log('  ℹ  Failed jobs have been cancelled/deleted from the system');
      console.log('\n');
    }

    if (deleteResults.success > 0) {
      console.log('  🎉 Failed jobs have been successfully deleted!');
      console.log('  ℹ  DLQ should be clean now');
      console.log('\n');
    }

  } catch (error) {
    log('❌ DLQ cleanup failed', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');

if (showHelp) {
  console.log(`
DLQ Cleanup & Failed Jobs Deletion Tool

Usage:
  node cleanup-dlq.js [options]

Options:
  --help, -h              Show this help message

Environment Variables:
  ADMIN_TOKEN             Admin JWT token (required)
  MAX_JOBS                Maximum number of jobs to delete (default: all)
  RABBITMQ_MANAGEMENT_URL RabbitMQ management API URL (default: http://localhost:15672)
  RABBITMQ_USER           RabbitMQ username (default: guest)
  RABBITMQ_PASSWORD       RabbitMQ password (default: guest)

Examples:
  # Delete all failed jobs
  ADMIN_TOKEN=your_token node cleanup-dlq.js

  # Delete only first 10 failed jobs
  ADMIN_TOKEN=your_token MAX_JOBS=10 node cleanup-dlq.js

  # Use token from login_response.json (auto-detected)
  node cleanup-dlq.js

Note: This tool will CANCEL/DELETE failed jobs, not retry them!
      Failed jobs will be marked as cancelled and removed from processing.
`);
  process.exit(0);
}

// Run cleanup
cleanupDLQ().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
