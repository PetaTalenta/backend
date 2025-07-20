/**
 * Archive Service Integration
 * Service for communicating with Archive Service for job status sync
 */

const axios = require('axios');
const logger = require('../utils/logger');

const ARCHIVE_SERVICE_URL = process.env.ARCHIVE_SERVICE_URL || 'http://localhost:3002/archive';

const archiveClient = axios.create({
  baseURL: ARCHIVE_SERVICE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Service': 'true',
    'X-Service-Key': process.env.INTERNAL_SERVICE_KEY
  }
});

/**
 * Sync job status with Archive Service
 * @param {String} jobId - Job ID
 * @param {String} status - Job status
 * @param {Object} additionalData - Additional data to sync
 * @returns {Promise<Object>} - Response data
 */
const syncJobStatus = async (jobId, status, additionalData = {}) => {
  try {
    logger.info('Syncing job status with Archive Service', { 
      jobId, 
      status, 
      additionalData 
    });

    const response = await archiveClient.put(`/jobs/${jobId}/status`, {
      status,
      ...additionalData
    });
    
    logger.info('Job status synced successfully with Archive Service', { 
      jobId, 
      status 
    });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to sync job status with Archive Service', {
      jobId,
      status,
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    throw error;
  }
};

/**
 * Get job status from Archive Service
 * @param {String} jobId - Job ID
 * @returns {Promise<Object|null>} - Job data or null if not found
 */
const getJobStatus = async (jobId) => {
  try {
    logger.info('Getting job status from Archive Service', { jobId });

    const response = await archiveClient.get(`/jobs/${jobId}`);
    
    logger.info('Job status retrieved from Archive Service', { 
      jobId, 
      status: response.data.data.status 
    });
    
    return response.data.data;
  } catch (error) {
    if (error.response?.status === 404) {
      logger.warn('Job not found in Archive Service', { jobId });
      return null;
    }
    
    logger.error('Failed to get job status from Archive Service', {
      jobId,
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    throw error;
  }
};

/**
 * Create job in Archive Service
 * @param {String} jobId - Job ID
 * @param {String} userId - User ID
 * @param {Object} assessmentData - Assessment data
 * @param {String} assessmentName - Assessment name
 * @returns {Promise<Object>} - Created job
 */
const createJob = async (jobId, userId, assessmentData, assessmentName = 'AI-Driven Talent Mapping') => {
  try {
    logger.info('Creating job in Archive Service', {
      jobId,
      userId
    });

    const response = await archiveClient.post('/jobs', {
      job_id: jobId,
      user_id: userId,
      assessment_data: assessmentData,
      assessment_name: assessmentName,
      status: 'queued'
    });

    logger.info('Job created in Archive Service successfully', {
      jobId,
      userId,
      archiveJobId: response.data.data.id
    });

    return response.data.data;
  } catch (error) {
    logger.error('Failed to create job in Archive Service', {
      jobId,
      userId,
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    throw error;
  }
};

/**
 * Check Archive Service health
 * @returns {Promise<Boolean>} - Health status
 */
const checkHealth = async () => {
  try {
    const response = await archiveClient.get('/health', {
      timeout: 3000 // Shorter timeout for health check
    });

    return response.status === 200;
  } catch (error) {
    logger.error('Archive Service health check failed', {
      error: error.message
    });
    return false;
  }
};

module.exports = {
  syncJobStatus,
  getJobStatus,
  createJob,
  checkHealth
};
