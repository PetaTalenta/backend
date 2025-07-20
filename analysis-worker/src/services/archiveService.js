/**
 * Archive Service Integration
 */

const axios = require('axios');
const logger = require('../utils/logger');

// Archive service configuration
const config = {
  baseURL: process.env.ARCHIVE_SERVICE_URL || 'http://localhost:3002/archive',
  serviceKey: process.env.INTERNAL_SERVICE_KEY || 'internal_service_secret_key_change_in_production',
  timeout: 30000 // 30 seconds
};

// Create axios instance
const archiveClient = axios.create({
  baseURL: config.baseURL,
  timeout: config.timeout,
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Service': 'true',
    'X-Service-Key': config.serviceKey
  }
});

// Add request interceptor for logging
archiveClient.interceptors.request.use(
  (config) => {
    logger.debug('Archive service request', {
      method: config.method,
      url: config.url,
      headers: config.headers
    });
    return config;
  },
  (error) => {
    logger.error('Archive service request error', { error: error.message });
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
archiveClient.interceptors.response.use(
  (response) => {
    logger.debug('Archive service response', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url
    });
    return response;
  },
  (error) => {
    logger.error('Archive service response error', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      error: error.message
    });
    return Promise.reject(error);
  }
);

/**
 * Save analysis result to Archive Service
 * @param {String} userId - User ID
 * @param {Object} assessmentData - Assessment data
 * @param {Object} personaProfile - Persona profile
 * @param {String} jobId - Job ID for logging
 * @param {String} assessmentName - Assessment name
 * @returns {Promise<Object>} - Save result
 */
const saveAnalysisResult = async (userId, assessmentData, personaProfile, jobId, assessmentName = 'AI-Driven Talent Mapping') => {
  try {
    logger.info('Saving analysis result to Archive Service', {
      jobId,
      userId,
      profileArchetype: personaProfile.archetype
    });

    // Prepare request body
    const requestBody = {
      user_id: userId,
      assessment_data: assessmentData,
      persona_profile: personaProfile,
      assessment_name: assessmentName,
      status: 'completed'
    };

    // Send request to Archive Service
    const response = await archiveClient.post('/results', requestBody);

    logger.info('Analysis result saved successfully', {
      jobId,
      userId,
      resultId: response.data.data.id,
      status: response.status
    });

    return {
      success: true,
      id: response.data.data.id,
      status: response.data.data.status,
      created_at: response.data.data.created_at
    };

  } catch (error) {
    logger.error('Failed to save analysis result', {
      jobId,
      userId,
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });

    // Check if it's a retryable error
    const isRetryable = isRetryableError(error);

    throw {
      message: error.message,
      isRetryable,
      status: error.response?.status,
      originalError: error
    };
  }
};

/**
 * Update analysis result status
 * @param {String} resultId - Result ID
 * @param {String} status - New status
 * @param {String} jobId - Job ID for logging
 * @returns {Promise<Object>} - Update result
 */
const updateAnalysisResult = async (resultId, status, jobId) => {
  try {
    logger.info('Updating analysis result status', {
      jobId,
      resultId,
      status
    });

    // Prepare request body
    const requestBody = {
      status
    };

    // Send request to Archive Service
    const response = await archiveClient.put(`/results/${resultId}`, requestBody);

    logger.info('Analysis result status updated successfully', {
      jobId,
      resultId,
      status: response.status
    });

    return {
      success: true,
      id: response.data.data.id,
      updated_at: response.data.data.updated_at
    };

  } catch (error) {
    logger.error('Failed to update analysis result status', {
      jobId,
      resultId,
      status,
      error: error.message,
      responseStatus: error.response?.status
    });

    throw {
      message: error.message,
      isRetryable: isRetryableError(error),
      status: error.response?.status,
      originalError: error
    };
  }
};

/**
 * Check if error is retryable
 * @param {Error} error - Error object
 * @returns {boolean} - Whether error is retryable
 */
const isRetryableError = (error) => {
  // Network errors are retryable
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // HTTP 5xx errors are retryable
  if (error.response && error.response.status >= 500) {
    return true;
  }

  // HTTP 429 (Too Many Requests) is retryable
  if (error.response && error.response.status === 429) {
    return true;
  }

  // Other errors are not retryable
  return false;
};

/**
 * Save failed analysis result to Archive Service
 * @param {String} userId - User ID
 * @param {Object} assessmentData - Assessment data
 * @param {String} errorMessage - Error message
 * @param {String} jobId - Job ID for logging
 * @param {String} assessmentName - Assessment name
 * @returns {Promise<Object>} - Save result
 */
const saveFailedAnalysisResult = async (userId, assessmentData, errorMessage, jobId, assessmentName = 'AI-Driven Talent Mapping') => {
  try {
    logger.info('Saving failed analysis result to Archive Service', {
      jobId,
      userId,
      errorMessage
    });

    // Prepare request body with empty persona profile and failed status
    const requestBody = {
      user_id: userId,
      assessment_data: assessmentData,
      persona_profile: null, // Empty result for failed analysis
      assessment_name: assessmentName,
      status: 'failed',
      error_message: errorMessage
    };

    // Send request to Archive Service
    const response = await archiveClient.post('/results', requestBody);

    logger.info('Failed analysis result saved successfully', {
      jobId,
      userId,
      resultId: response.data.data.id,
      status: response.status
    });

    return {
      success: true,
      id: response.data.data.id,
      status: response.data.data.status,
      created_at: response.data.data.created_at
    };

  } catch (error) {
    logger.error('Failed to save failed analysis result', {
      jobId,
      userId,
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });

    // Check if it's a retryable error
    const isRetryable = isRetryableError(error);

    throw {
      message: error.message,
      isRetryable,
      status: error.response?.status,
      originalError: error
    };
  }
};

/**
 * Check Archive Service health
 * @returns {Promise<boolean>} - Health status
 */
const checkHealth = async () => {
  try {
    const response = await archiveClient.get('/health', {
      timeout: 5000 // 5 seconds for health check
    });

    return response.status === 200;
  } catch (error) {
    logger.error('Archive Service health check failed', { error: error.message });
    return false;
  }
};

// createAnalysisJob method removed - jobs are now created by Assessment Service

/**
 * Update analysis job status in Archive Service
 * @param {String} jobId - Job ID
 * @param {String} status - New status
 * @param {Object} additionalData - Additional data to update
 * @returns {Promise<Object|null>} - Updated job or null if failed
 */
const updateAnalysisJobStatus = async (jobId, status, additionalData = {}) => {
  try {
    logger.info('Updating analysis job status', { jobId, status });

    const requestBody = { status, ...additionalData };
    const response = await archiveClient.put(`/jobs/${jobId}/status`, requestBody);

    logger.info('Analysis job status updated successfully', { jobId, status });
    return response.data.data;
  } catch (error) {
    logger.error('Failed to update analysis job status', {
      jobId,
      status,
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    // Don't throw error - allow processing to continue
    return null;
  }
};

module.exports = {
  saveAnalysisResult,
  saveFailedAnalysisResult,
  updateAnalysisResult,
  checkHealth,
  updateAnalysisJobStatus
};
