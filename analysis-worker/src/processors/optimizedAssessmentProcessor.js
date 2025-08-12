tolo/**
 * Optimized Assessment Processor with Deduplication, Rate Limiting, and Audit Logging
 */

const aiService = require('../services/aiService');
const { saveAnalysisResult, updateAnalysisJobStatus, checkHealth } = require('../services/archiveService');
const { jobDeduplicationService, tokenRefundService } = require('../services/jobDeduplicationService');
const { auditLogger, AUDIT_EVENTS, RISK_LEVELS } = require('../services/auditLogger');
const notificationService = require('../services/notificationService'); // Keep for backward compatibility
const { getEventPublisher } = require('../services/eventPublisher');
const logger = require('../utils/logger');
const { withRetry, withTimeout, ERROR_TYPES, createError } = require('../utils/errorHandler');

// Rate limiting configuration
const RATE_LIMITS = {
  PER_USER_PER_HOUR: parseInt(process.env.RATE_LIMIT_USER_HOUR || '5'),
  PER_IP_PER_HOUR: parseInt(process.env.RATE_LIMIT_IP_HOUR || '20'),
  GLOBAL_PER_MINUTE: parseInt(process.env.RATE_LIMIT_GLOBAL_MINUTE || '100')
};

// Rate limiting storage (in production, use Redis)
const rateLimitStore = {
  userLimits: new Map(),
  ipLimits: new Map(),
  globalCount: 0,
  lastGlobalReset: Date.now()
};

/**
 * Check rate limits for job processing
 * @param {String} userId - User ID
 * @param {String} userIP - User IP address
 * @returns {Object} - Rate limit check result
 */
const checkRateLimits = (userId, userIP) => {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;
  const minuteMs = 60 * 1000;

  // Reset global counter every minute
  if (now - rateLimitStore.lastGlobalReset > minuteMs) {
    rateLimitStore.globalCount = 0;
    rateLimitStore.lastGlobalReset = now;
  }

  // Check global rate limit
  if (rateLimitStore.globalCount >= RATE_LIMITS.GLOBAL_PER_MINUTE) {
    auditLogger.logSecurityEvent(AUDIT_EVENTS.RATE_LIMIT_EXCEEDED, {
      limitType: 'GLOBAL_PER_MINUTE',
      currentCount: rateLimitStore.globalCount,
      limit: RATE_LIMITS.GLOBAL_PER_MINUTE
    }, RISK_LEVELS.HIGH);

    return {
      allowed: false,
      reason: 'GLOBAL_RATE_LIMIT_EXCEEDED',
      retryAfter: minuteMs - (now - rateLimitStore.lastGlobalReset)
    };
  }

  // Check user rate limit
  const userKey = `user_${userId}`;
  const userLimit = rateLimitStore.userLimits.get(userKey);
  
  if (userLimit) {
    if (now - userLimit.resetTime > hourMs) {
      // Reset user limit
      rateLimitStore.userLimits.set(userKey, { count: 0, resetTime: now });
    } else if (userLimit.count >= RATE_LIMITS.PER_USER_PER_HOUR) {
      auditLogger.logSecurityEvent(AUDIT_EVENTS.RATE_LIMIT_EXCEEDED, {
        limitType: 'PER_USER_PER_HOUR',
        userId,
        currentCount: userLimit.count,
        limit: RATE_LIMITS.PER_USER_PER_HOUR
      }, RISK_LEVELS.MEDIUM);

      return {
        allowed: false,
        reason: 'USER_RATE_LIMIT_EXCEEDED',
        retryAfter: hourMs - (now - userLimit.resetTime)
      };
    }
  } else {
    rateLimitStore.userLimits.set(userKey, { count: 0, resetTime: now });
  }

  // Check IP rate limit
  if (userIP) {
    const ipKey = `ip_${userIP}`;
    const ipLimit = rateLimitStore.ipLimits.get(ipKey);
    
    if (ipLimit) {
      if (now - ipLimit.resetTime > hourMs) {
        rateLimitStore.ipLimits.set(ipKey, { count: 0, resetTime: now });
      } else if (ipLimit.count >= RATE_LIMITS.PER_IP_PER_HOUR) {
        auditLogger.logSecurityEvent(AUDIT_EVENTS.RATE_LIMIT_EXCEEDED, {
          limitType: 'PER_IP_PER_HOUR',
          userIP,
          currentCount: ipLimit.count,
          limit: RATE_LIMITS.PER_IP_PER_HOUR
        }, RISK_LEVELS.MEDIUM);

        return {
          allowed: false,
          reason: 'IP_RATE_LIMIT_EXCEEDED',
          retryAfter: hourMs - (now - ipLimit.resetTime)
        };
      }
    } else {
      rateLimitStore.ipLimits.set(ipKey, { count: 0, resetTime: now });
    }
  }

  return { allowed: true };
};

/**
 * Increment rate limit counters
 * @param {String} userId - User ID
 * @param {String} userIP - User IP address
 */
const incrementRateLimits = (userId, userIP) => {
  // Increment global counter
  rateLimitStore.globalCount++;

  // Increment user counter
  const userKey = `user_${userId}`;
  const userLimit = rateLimitStore.userLimits.get(userKey);
  if (userLimit) {
    userLimit.count++;
  }

  // Increment IP counter
  if (userIP) {
    const ipKey = `ip_${userIP}`;
    const ipLimit = rateLimitStore.ipLimits.get(ipKey);
    if (ipLimit) {
      ipLimit.count++;
    }
  }
};

/**
 * Process assessment job with optimizations
 * @param {Object} jobData - Job data from queue
 * @returns {Promise<Object>} - Processing result
 */
const processAssessmentOptimized = async (jobData) => {
  const { jobId, userId, userEmail, assessmentData, assessmentName = 'AI-Driven Talent Mapping', userIP } = jobData;
  const processingTimeout = parseInt(process.env.PROCESSING_TIMEOUT || '1800000'); // 30 minutes
  const startTime = Date.now();
  let deduplicationResult = null; // Declare outside try block

  try {
    // Audit: Job received
    auditLogger.logJobEvent(AUDIT_EVENTS.JOB_RECEIVED, jobData);

    logger.info('Starting optimized assessment processing', {
      jobId,
      userEmail,
      userId
    });

    // Step 1: Rate limiting check
    const rateLimitResult = checkRateLimits(userId, userIP);
    if (!rateLimitResult.allowed) {
      const error = createError(ERROR_TYPES.RATE_LIMIT_ERROR, `Rate limit exceeded: ${rateLimitResult.reason}`);
      error.retryAfter = rateLimitResult.retryAfter;

      auditLogger.logJobEvent(AUDIT_EVENTS.JOB_FAILED, jobData, {
        reason: 'RATE_LIMIT_EXCEEDED',
        rateLimitReason: rateLimitResult.reason
      });

      throw error;
    }

    // Step 2: Job deduplication check
    deduplicationResult = jobDeduplicationService.checkDuplicate(jobId, userId, assessmentData);
    
    if (deduplicationResult.isDuplicate) {
      auditLogger.logJobEvent(AUDIT_EVENTS.JOB_DUPLICATE_DETECTED, jobData, {
        reason: deduplicationResult.reason,
        originalJobId: deduplicationResult.originalJobId
      });

      // Handle duplicate job
      if (deduplicationResult.reason === 'RECENTLY_PROCESSED' && deduplicationResult.originalResultId) {
        // Return existing result
        logger.info('Returning existing result for duplicate job', {
          jobId,
          originalJobId: deduplicationResult.originalJobId,
          originalResultId: deduplicationResult.originalResultId
        });

        return {
          success: true,
          id: deduplicationResult.originalResultId,
          isDuplicate: true,
          originalJobId: deduplicationResult.originalJobId
        };
      } else {
        // Job is currently processing, reject
        const error = createError(ERROR_TYPES.DUPLICATE_JOB_ERROR, 
          `Duplicate job detected: ${deduplicationResult.reason}`);
        error.originalJobId = deduplicationResult.originalJobId;
        throw error;
      }
    }

    // Step 3: Mark job as processing and increment rate limits
    jobDeduplicationService.markAsProcessing(jobId, deduplicationResult.jobHash, userId);
    incrementRateLimits(userId, userIP);

    // Audit: Job started
    auditLogger.logJobEvent(AUDIT_EVENTS.JOB_STARTED, jobData, {
      jobHash: deduplicationResult.jobHash
    });

    // Step 4: Update job status to processing (async)
    updateAnalysisJobStatus(jobId, 'processing');

    // Step 5: Process with timeout
    const result = await withTimeout(async () => {
      // Generate persona profile using AI
      const personaProfile = await withRetry(
        () => aiService.generatePersonaProfile(assessmentData, jobId),
        {
          operationName: 'AI persona generation',
          shouldRetry: (error) => {
            // Retry network errors and AI service errors
            return error.code === ERROR_TYPES.AI_SERVICE_ERROR.code ||
                   error.code === 'ECONNREFUSED' ||
                   error.code === 'ENOTFOUND' ||
                   error.code === 'ETIMEDOUT';
          }
        }
      );
      
      logger.info('Persona profile generated successfully', {
        jobId,
        userId,
        profileArchetype: personaProfile.archetype
      });

      // Audit: AI operation completed
      auditLogger.logAIEvent(AUDIT_EVENTS.AI_RESPONSE_RECEIVED, jobId, {
        archetype: personaProfile.archetype,
        processingTime: Date.now() - startTime
      });

      // Save result to Archive Service (optimized with batching)
      const saveResult = await withRetry(
        () => saveAnalysisResult(userId, assessmentData, personaProfile, jobId, assessmentName),
        {
          operationName: 'Archive service save',
          shouldRetry: (error) => error.isRetryable
        }
      );
      
      logger.info('Analysis result saved to Archive Service', {
        jobId,
        userId,
        resultId: saveResult.id
      });

      // Audit: Data saved
      auditLogger.logDataAccess('SAVE', userId, 'ANALYSIS_RESULT', {
        jobId,
        resultId: saveResult.id
      });

      // Update job status to completed (async)
      updateAnalysisJobStatus(jobId, 'completed', {
        result_id: saveResult.id
      });

      // Mark job as completed in deduplication service
      jobDeduplicationService.markAsCompleted(jobId, deduplicationResult.jobHash, saveResult.id, userId);

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Publish analysis completed event (async, non-blocking)
      try {
        const eventPublisher = getEventPublisher();

        eventPublisher.publishAnalysisCompleted({
          jobId,
          userId,
          userEmail,
          resultId: saveResult.id,
          assessmentName: jobData.assessmentName || 'AI-Driven Talent Mapping',
          processingTime
        }).catch(eventError => {
          logger.warn('Failed to publish analysis completed event', {
            jobId,
            userId,
            error: eventError.message
          });

          // Fallback to direct HTTP calls for backward compatibility
          notificationService.sendAnalysisCompleteNotification(userId, jobId, saveResult.id, 'completed')
            .catch(fallbackError => {
              logger.error('Both event publishing and fallback notification failed', {
                jobId,
                userId,
                eventError: eventError.message,
                fallbackError: fallbackError.message
              });
            });
        });
      } catch (error) {
        logger.warn('Failed to get event publisher, using fallback notification', {
          jobId,
          userId,
          error: error.message
        });

        // Fallback to direct HTTP calls
        notificationService.sendAnalysisCompleteNotification(userId, jobId, saveResult.id, 'completed')
          .catch(fallbackError => {
            logger.error('Fallback notification also failed', {
              jobId,
              userId,
              error: fallbackError.message
            });
          });
      }

      // Audit: Job completed
      auditLogger.logJobEvent(AUDIT_EVENTS.JOB_COMPLETED, jobData, {
        resultId: saveResult.id,
        processingTime,
        jobHash: deduplicationResult.jobHash
      });

      return {
        success: true,
        id: saveResult.id,
        status: saveResult.status,
        created_at: saveResult.created_at,
        processingTime
      };

    }, processingTimeout, 'Assessment processing');

    return result;

  } catch (error) {
    const errorProcessingTime = Date.now() - startTime;

    logger.error('Failed to process assessment job (optimized)', {
      jobId,
      userId,
      error: error.message,
      processingTime: `${errorProcessingTime}ms`
    });

    // Mark job as failed in deduplication service
    if (deduplicationResult && deduplicationResult.jobHash) {
      jobDeduplicationService.markAsFailed(jobId, deduplicationResult.jobHash, userId);
    }

    // Handle token refund for certain error types
    if (error.code === ERROR_TYPES.DUPLICATE_JOB_ERROR.code || 
        error.code === ERROR_TYPES.RATE_LIMIT_ERROR.code) {
      
      // Queue token refund if tokens were consumed
      if (error.tokenData) {
        tokenRefundService.queueRefund(jobId, userId, error.tokenData, error.code);
      }
    }

    // Audit: Job failed
    auditLogger.logJobEvent(AUDIT_EVENTS.JOB_FAILED, jobData, {
      error: error.message,
      errorCode: error.code,
      processingTime: errorProcessingTime,
      jobHash: deduplicationResult?.jobHash
    });

    // Save failed result (async)
    try {
      updateAnalysisJobStatus(jobId, 'failed', {
        error_message: error.message,
        error_code: error.code
      });
    } catch (statusError) {
      logger.error('Failed to update job status to failed', {
        jobId,
        statusError: statusError.message
      });
    }

    // Publish analysis failed event (async, non-blocking)
    try {
      const eventPublisher = getEventPublisher();

      eventPublisher.publishAnalysisFailed({
        jobId,
        userId,
        userEmail: jobData.userEmail,
        errorMessage: error.message,
        assessmentName: jobData.assessmentName || 'AI-Driven Talent Mapping',
        processingTime: errorProcessingTime,
        errorType: error.code || 'unknown'
      }).catch(eventError => {
        logger.warn('Failed to publish analysis failed event', {
          jobId,
          userId,
          error: eventError.message
        });

        // Fallback to direct HTTP calls for backward compatibility
        notificationService.sendAnalysisFailureNotification(userId, jobId, error.message)
          .catch(fallbackError => {
            logger.error('Both event publishing and fallback failure notification failed', {
              jobId,
              userId,
              eventError: eventError.message,
              fallbackError: fallbackError.message
            });
          });
      });
    } catch (publishError) {
      logger.warn('Failed to get event publisher for failure event, using fallback notification', {
        jobId,
        userId,
        error: publishError.message
      });

      // Fallback to direct HTTP calls
      notificationService.sendAnalysisFailureNotification(userId, jobId, error.message)
        .catch(fallbackError => {
          logger.error('Fallback failure notification also failed', {
            jobId,
            userId,
            error: fallbackError.message
          });
        });
    }

    throw error;
  }
};

module.exports = {
  processAssessmentOptimized,
  checkRateLimits,
  RATE_LIMITS
};
