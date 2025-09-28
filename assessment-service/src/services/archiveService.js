/**
 * Archive Service Integration
 * Service for communicating with Archive Service for job status sync and result creation
 */

const axios = require('axios');
const logger = require('../utils/logger');

// Fix: Remove /archive suffix since routes already use /archive prefix
const ARCHIVE_SERVICE_URL = process.env.ARCHIVE_SERVICE_URL || 'http://localhost:3002';

const archiveClient = axios.create({
  baseURL: ARCHIVE_SERVICE_URL,
  timeout: 10000, // Increased timeout for better reliability
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Service': 'true',
    'X-Service-Key': process.env.INTERNAL_SERVICE_KEY || 'internal_service_secret_key_change_in_production'
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

    const response = await archiveClient.put(`/archive/jobs/${jobId}/status`, {
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

    const response = await archiveClient.get(`/archive/jobs/${jobId}`);

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

    // Note: analysis_jobs table no longer has assessment_data column after refactoring
    const response = await archiveClient.post('/archive/jobs', {
      job_id: jobId,
      user_id: userId,
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
 * Create analysis result directly in Archive Service
 * @param {String} userId - User ID
 * @param {Object} testData - Test data (formerly assessmentData)
 * @param {Object} testResult - Test result (formerly personaProfile)
 * @param {String} assessmentName - Assessment name
 * @param {String} status - Result status ('completed', 'processing', 'failed')
 * @param {String} errorMessage - Error message if status is 'failed'
 * @param {Object} rawResponses - Raw responses data (optional)
 * @param {String} chatbotId - Chatbot ID (optional)
 * @param {Boolean} isPublic - Whether result is public (optional)
 * @returns {Promise<Object>} - Created result
 */
const createAnalysisResult = async (userId, testData, testResult, assessmentName = 'AI-Driven Talent Mapping', status = 'completed', errorMessage = null, rawResponses = null, chatbotId = null, isPublic = false) => {
  try {
    logger.info('Creating analysis result in Archive Service', {
      userId,
      assessmentName,
      status,
      hasTestResult: !!testResult,
      chatbotId,
      isPublic
    });

    const requestBody = {
      user_id: userId,
      test_data: testData,
      test_result: testResult,
      assessment_name: assessmentName,
      status: status,
      raw_responses: rawResponses,
      chatbot_id: chatbotId,
      is_public: isPublic
    };

    // Add error message if status is failed
    if (status === 'failed' && errorMessage) {
      requestBody.error_message = errorMessage;
    }

    const response = await archiveClient.post('/archive/results', requestBody);

    logger.info('Analysis result created in Archive Service successfully', {
      userId,
      resultId: response.data.data.id,
      status: response.data.data.status
    });

    return response.data.data;
  } catch (error) {
    logger.error('Failed to create analysis result in Archive Service', {
      userId,
      assessmentName,
      status,
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
    const response = await archiveClient.get('/archive/health', {
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

/**
 * Get analysis result by ID from Archive Service
 * @param {String} resultId - Result ID
 * @returns {Promise<Object|null>} - Result data or null if not found
 */
const getAnalysisResult = async (resultId) => {
  try {
    logger.info('Getting analysis result from Archive Service', { resultId });

    const response = await archiveClient.get(`/archive/results/${resultId}`);

    logger.info('Analysis result retrieved from Archive Service', {
      resultId,
      status: response.data.data.status
    });

    return response.data.data;
  } catch (error) {
    if (error.response?.status === 404) {
      logger.warn('Analysis result not found in Archive Service', { resultId });
      return null;
    }

    logger.error('Failed to get analysis result from Archive Service', {
      resultId,
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    throw error;
  }
};

/**
 * Update analysis result in Archive Service
 * @param {String} resultId - Result ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} - Updated result
 */
const updateAnalysisResult = async (resultId, updateData) => {
  try {
    logger.info('Updating analysis result in Archive Service', {
      resultId,
      updateFields: Object.keys(updateData)
    });

    const response = await archiveClient.put(`/archive/results/${resultId}`, updateData);

    logger.info('Analysis result updated in Archive Service successfully', {
      resultId
    });

    return response.data.data;
  } catch (error) {
    logger.error('Failed to update analysis result in Archive Service', {
      resultId,
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    throw error;
  }
};

/**
 * Update job status in Archive Service
 * @param {String} jobId - Job ID
 * @param {String} status - New status
 * @param {Object} additionalData - Additional data to update (e.g., result_id, error_message)
 * @returns {Promise<Object>} - Updated job data
 */
const updateJobStatus = async (jobId, status, additionalData = {}) => {
  try {
    logger.info('Updating job status in Archive Service', {
      jobId,
      status,
      additionalData
    });

    const requestBody = {
      status,
      ...additionalData
    };

    const response = await archiveClient.put(`/archive/jobs/${jobId}/status`, requestBody);

    logger.info('Job status updated in Archive Service successfully', {
      jobId,
      status,
      updatedAt: response.data.data.updated_at
    });

    return response.data.data;
  } catch (error) {
    logger.error('Failed to update job status in Archive Service', {
      jobId,
      status,
      additionalData,
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    throw error;
  }
};

module.exports = {
  syncJobStatus,
  getJobStatus,
  updateJobStatus,
  createJob,
  createAnalysisResult,
  getAnalysisResult,
  updateAnalysisResult,
  checkHealth
};
