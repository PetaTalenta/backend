const logger = require('../utils/logger');

// In-memory job tracking
// In production, this should be replaced with Redis or database
const jobs = new Map();

// Job status constants
const JOB_STATUS = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Create a new job entry
 * @param {String} jobId - Unique job identifier
 * @param {String} userId - User ID who submitted the job
 * @param {String} userEmail - User email
 * @param {Object} assessmentData - Assessment data
 * @param {String} assessmentName - Assessment name (optional)
 * @returns {Object} - Job object
 */
const createJob = (jobId, userId, userEmail, assessmentData, assessmentName = 'AI-Driven Talent Mapping') => {
  const job = {
    jobId,
    userId,
    userEmail,
    status: JOB_STATUS.QUEUED,
    progress: 0,
    estimatedProcessingTime: '2-5 minutes',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assessmentData,
    assessmentName,
    resultId: null,
    error: null
  };

  jobs.set(jobId, job);

  logger.info('Job created', {
    jobId,
    userId,
    userEmail,
    assessmentName,
    status: job.status
  });

  return job;
};

/**
 * Get job by ID
 * @param {String} jobId - Job identifier
 * @returns {Object|null} - Job object or null if not found
 */
const getJob = (jobId) => {
  return jobs.get(jobId) || null;
};

/**
 * Update job status
 * @param {String} jobId - Job identifier
 * @param {String} status - New status
 * @param {Number} progress - Progress percentage (0-100)
 * @param {String} error - Error message (optional)
 * @param {String} resultId - Result ID (optional, for completed jobs)
 * @returns {Object|null} - Updated job object or null if not found
 */
const updateJobStatus = (jobId, status, progress = null, error = null, resultId = null) => {
  const job = jobs.get(jobId);

  if (!job) {
    logger.warn('Attempted to update non-existent job', { jobId, status });
    return null;
  }

  job.status = status;
  job.updatedAt = new Date().toISOString();

  if (progress !== null) {
    job.progress = progress;
  }

  if (error) {
    job.error = error;
  }

  if (resultId) {
    job.resultId = resultId;
  }

  // Update estimated time based on status
  if (status === JOB_STATUS.PROCESSING) {
    job.estimatedProcessingTime = '1-3 minutes';
    job.progress = 25;
  } else if (status === JOB_STATUS.COMPLETED) {
    job.progress = 100;
    job.estimatedProcessingTime = 'Completed';
  } else if (status === JOB_STATUS.FAILED) {
    job.estimatedProcessingTime = 'Failed';
  }

  jobs.set(jobId, job);

  logger.info('Job status updated', {
    jobId,
    userId: job.userId,
    status,
    progress: job.progress,
    resultId,
    error
  });

  return job;
};

/**
 * Get jobs by user ID
 * @param {String} userId - User identifier
 * @returns {Array} - Array of job objects
 */
const getJobsByUser = (userId) => {
  const userJobs = [];

  for (const job of jobs.values()) {
    if (job.userId === userId) {
      userJobs.push(job);
    }
  }

  return userJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

/**
 * Clean up old completed jobs (older than 24 hours)
 * This should be called periodically to prevent memory leaks
 */
const cleanupOldJobs = () => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let cleanedCount = 0;

  for (const [jobId, job] of jobs.entries()) {
    const jobDate = new Date(job.createdAt);

    if (jobDate < twentyFourHoursAgo &&
        (job.status === JOB_STATUS.COMPLETED || job.status === JOB_STATUS.FAILED)) {
      jobs.delete(jobId);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.info('Cleaned up old jobs', { count: cleanedCount });
  }
};

/**
 * Get job statistics
 * @returns {Object} - Job statistics
 */
const getJobStats = () => {
  const stats = {
    total: jobs.size,
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0
  };

  for (const job of jobs.values()) {
    stats[job.status]++;
  }

  return stats;
};

/**
 * Check if user owns the job
 * @param {String} jobId - Job identifier
 * @param {String} userId - User identifier
 * @returns {Boolean} - True if user owns the job
 */
const isJobOwner = (jobId, userId) => {
  const job = jobs.get(jobId);
  return job && job.userId === userId;
};

// Clean up old jobs every hour
setInterval(cleanupOldJobs, 60 * 60 * 1000);

module.exports = {
  JOB_STATUS,
  createJob,
  getJob,
  updateJobStatus,
  getJobsByUser,
  cleanupOldJobs,
  getJobStats,
  isJobOwner
};
