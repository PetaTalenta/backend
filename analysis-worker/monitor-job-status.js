#!/usr/bin/env node

/**
 * Job Status Monitor
 * 
 * Monitor job status untuk memastikan tidak ada job yang stuck di 'processing'
 * ketika seharusnya sudah failed karena timeout
 */

require('dotenv').config();
const { Pool } = require('pg');
const logger = require('../src/utils/logger');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'atma_db',
  user: process.env.DB_USER || 'atma_user',
  password: process.env.DB_PASSWORD || 'password',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Get job statistics
 */
async function getJobStats() {
  const client = await pool.connect();
  
  try {
    const query = `
      WITH job_stats AS (
        SELECT 
          status,
          COUNT(*) as count,
          MIN(created_at) as oldest,
          MAX(updated_at) as latest_update,
          AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/60) as avg_age_minutes,
          MAX(EXTRACT(EPOCH FROM (NOW() - updated_at))/60) as max_minutes_since_update
        FROM archive.analysis_jobs
        GROUP BY status
      ),
      stuck_jobs AS (
        SELECT 
          COUNT(*) as stuck_processing_count,
          COUNT(*) FILTER (WHERE status = 'processing' AND updated_at < NOW() - INTERVAL '1 hour') as stuck_processing_1h,
          COUNT(*) FILTER (WHERE status = 'processing' AND updated_at < NOW() - INTERVAL '30 minutes') as stuck_processing_30m,
          COUNT(*) FILTER (WHERE status = 'queued' AND created_at < NOW() - INTERVAL '24 hours') as stuck_queued_24h
        FROM archive.analysis_jobs
        WHERE (status = 'processing' AND updated_at < NOW() - INTERVAL '30 minutes')
           OR (status = 'queued' AND created_at < NOW() - INTERVAL '24 hours')
      )
      SELECT 
        js.*,
        sj.stuck_processing_count,
        sj.stuck_processing_1h,
        sj.stuck_processing_30m,
        sj.stuck_queued_24h
      FROM job_stats js
      CROSS JOIN stuck_jobs sj
      ORDER BY js.count DESC;
    `;

    const result = await client.query(query);
    return result.rows;
    
  } finally {
    client.release();
  }
}

/**
 * Get recent failed jobs with timeout errors
 */
async function getRecentTimeoutFailures() {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT 
        job_id,
        user_id,
        status,
        error_message,
        created_at,
        updated_at,
        EXTRACT(EPOCH FROM (updated_at - created_at)) as processing_duration_seconds
      FROM archive.analysis_jobs
      WHERE status = 'failed'
        AND (error_message ILIKE '%timeout%' OR error_message ILIKE '%timed out%')
        AND updated_at > NOW() - INTERVAL '24 hours'
      ORDER BY updated_at DESC
      LIMIT 10;
    `;

    const result = await client.query(query);
    return result.rows;
    
  } finally {
    client.release();
  }
}

/**
 * Get currently processing jobs (potential stuck jobs)
 */
async function getCurrentlyProcessingJobs() {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT 
        job_id,
        user_id,
        status,
        created_at,
        updated_at,
        EXTRACT(EPOCH FROM (NOW() - created_at))/60 as age_minutes,
        EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_since_update,
        CASE 
          WHEN updated_at < NOW() - INTERVAL '1 hour' THEN '🚨 STUCK (>1h)'
          WHEN updated_at < NOW() - INTERVAL '30 minutes' THEN '⚠️  OLD (>30m)'
          ELSE '✅ NORMAL'
        END as status_assessment
      FROM archive.analysis_jobs
      WHERE status = 'processing'
      ORDER BY created_at DESC
      LIMIT 20;
    `;

    const result = await client.query(query);
    return result.rows;
    
  } finally {
    client.release();
  }
}

/**
 * Display job statistics
 */
function displayStats(stats) {
  console.log('\n📊 JOB STATUS OVERVIEW');
  console.log('=====================');
  
  const statusOrder = ['completed', 'processing', 'queued', 'failed'];
  const orderedStats = stats.sort((a, b) => {
    const aIndex = statusOrder.indexOf(a.status) !== -1 ? statusOrder.indexOf(a.status) : 999;
    const bIndex = statusOrder.indexOf(b.status) !== -1 ? statusOrder.indexOf(b.status) : 999;
    return aIndex - bIndex;
  });

  orderedStats.forEach(stat => {
    const icon = {
      'completed': '✅',
      'processing': '⚙️',
      'queued': '⏳',
      'failed': '❌'
    }[stat.status] || '❓';
    
    console.log(`${icon} ${stat.status.toUpperCase()}: ${stat.count} jobs`);
    console.log(`   Age: avg ${Math.round(stat.avg_age_minutes || 0)}min, max ${Math.round(stat.max_minutes_since_update || 0)}min since update`);
    console.log(`   Range: ${stat.oldest} → ${stat.latest_update}`);
  });

  // Show stuck job warnings
  const stuckStats = stats[0]; // All rows have same stuck stats due to CROSS JOIN
  if (stuckStats) {
    console.log('\n🔍 STUCK JOB ANALYSIS');
    console.log('===================');
    
    if (stuckStats.stuck_processing_1h > 0) {
      console.log(`🚨 ${stuckStats.stuck_processing_1h} jobs stuck in PROCESSING (>1 hour)`);
    }
    
    if (stuckStats.stuck_processing_30m > 0) {
      console.log(`⚠️  ${stuckStats.stuck_processing_30m} jobs stuck in PROCESSING (>30 minutes)`);
    }
    
    if (stuckStats.stuck_queued_24h > 0) {
      console.log(`📦 ${stuckStats.stuck_queued_24h} jobs stuck in QUEUED (>24 hours)`);
    }
    
    if (stuckStats.stuck_processing_1h === 0 && stuckStats.stuck_processing_30m === 0 && stuckStats.stuck_queued_24h === 0) {
      console.log('✅ No stuck jobs detected');
    }
  }
}

/**
 * Display timeout failures
 */
function displayTimeoutFailures(failures) {
  console.log('\n⏰ RECENT TIMEOUT FAILURES (24h)');
  console.log('===============================');
  
  if (failures.length === 0) {
    console.log('✅ No timeout failures in the last 24 hours');
    return;
  }

  failures.forEach((job, index) => {
    const duration = Math.round(job.processing_duration_seconds / 60);
    console.log(`${index + 1}. Job ${job.job_id}`);
    console.log(`   User: ${job.user_id}`);
    console.log(`   Duration: ${duration} minutes`);
    console.log(`   Error: ${job.error_message}`);
    console.log(`   Failed at: ${job.updated_at}`);
    console.log();
  });
}

/**
 * Display currently processing jobs
 */
function displayProcessingJobs(jobs) {
  console.log('\n⚙️  CURRENTLY PROCESSING JOBS');
  console.log('===========================');
  
  if (jobs.length === 0) {
    console.log('✅ No jobs currently processing');
    return;
  }

  jobs.forEach((job, index) => {
    const ageMin = Math.round(job.age_minutes);
    const updateMin = Math.round(job.minutes_since_update);
    
    console.log(`${index + 1}. ${job.status_assessment} Job ${job.job_id}`);
    console.log(`   User: ${job.user_id}`);
    console.log(`   Age: ${ageMin}min, Last update: ${updateMin}min ago`);
    console.log(`   Started: ${job.created_at}`);
    console.log(`   Updated: ${job.updated_at}`);
    console.log();
  });
}

/**
 * Main monitoring function
 */
async function monitor() {
  console.log('🔍 ANALYSIS WORKER - JOB STATUS MONITOR');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log('========================================');

  try {
    // Get all statistics
    const [stats, timeoutFailures, processingJobs] = await Promise.all([
      getJobStats(),
      getRecentTimeoutFailures(),
      getCurrentlyProcessingJobs()
    ]);

    // Display results
    displayStats(stats);
    displayTimeoutFailures(timeoutFailures);
    displayProcessingJobs(processingJobs);

    // Summary and recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('==================');
    
    const stuckProcessing = stats.find(s => s.status === 'processing')?.stuck_processing_1h || 0;
    const recentTimeouts = timeoutFailures.length;
    
    if (stuckProcessing > 0) {
      console.log(`🚨 ${stuckProcessing} jobs are stuck in processing state`);
      console.log('   → Run job cleanup: node scripts/cleanup-stuck-jobs.js');
      console.log('   → Check worker logs for errors');
    }
    
    if (recentTimeouts > 5) {
      console.log(`⚠️  High number of timeout failures: ${recentTimeouts}`);
      console.log('   → Consider increasing AI_REQUEST_TIMEOUT');
      console.log('   → Check AI service performance');
    }
    
    if (stuckProcessing === 0 && recentTimeouts === 0) {
      console.log('✅ System is running smoothly');
      console.log('✅ No stuck jobs or timeout issues detected');
    }

  } catch (error) {
    console.error('💥 Error monitoring jobs:', error.message);
    process.exit(1);
  }
}

/**
 * Continuous monitoring mode
 */
async function continuousMonitor() {
  const interval = parseInt(process.argv.find(arg => arg.startsWith('--interval='))?.split('=')[1]) || 60;
  
  console.log(`🔄 Starting continuous monitoring (every ${interval}s)`);
  console.log('Press Ctrl+C to stop\n');

  while (true) {
    await monitor();
    console.log(`\n⏰ Next check in ${interval} seconds...\n${'='.repeat(50)}\n`);
    await new Promise(resolve => setTimeout(resolve, interval * 1000));
  }
}

// Show usage
if (process.argv.includes('--help')) {
  console.log(`
Usage: node monitor-job-status.js [options]

Options:
  --continuous         Run continuously (default: single check)
  --interval=<seconds> Monitoring interval for continuous mode (default: 60)
  --help              Show this help message

Examples:
  node monitor-job-status.js                    # Single check
  node monitor-job-status.js --continuous       # Continuous monitoring
  node monitor-job-status.js --continuous --interval=30  # Every 30 seconds

This script monitors:
• Job status distribution
• Stuck jobs in processing/queued state  
• Recent timeout failures
• Currently processing jobs
`);
  process.exit(0);
}

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down monitor...');
  await pool.end();
  process.exit(0);
});

// Run monitor
if (process.argv.includes('--continuous')) {
  continuousMonitor().catch(error => {
    console.error('💥 Continuous monitoring failed:', error);
    process.exit(1);
  });
} else {
  monitor().then(() => {
    return pool.end();
  }).catch(error => {
    console.error('💥 Monitoring failed:', error);
    process.exit(1);
  });
}
