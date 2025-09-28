/**
 * Admin System Controller - Phase 2 Implementation
 * Handles system monitoring and analytics endpoints for admin users
 * Built on Phase 1 infrastructure with activity logging integration
 */

const { sequelize } = require('../config/database');
const AnalysisJob = require('../models/AnalysisJob');
const AnalysisResult = require('../models/AnalysisResult');
const analysisJobsService = require('../services/analysisJobsService');
const statsService = require('../services/statsService');
const performanceOptimizationService = require('../services/performanceOptimizationService');
const securityEnhancementService = require('../services/securityEnhancementService');
const logger = require('../utils/logger');

/**
 * Get global system statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getGlobalStats = async (req, res, next) => {
  try {
    const startTime = Date.now();
    
    logger.info('Fetching global system statistics', {
      adminId: req.admin.id,
      adminUsername: req.admin.username
    });

    // Get summary stats using existing service (Phase 1 optimization)
    const summaryStats = await statsService.getSummaryStats();
    
    // Get job statistics using existing service
    const jobStats = await analysisJobsService.getJobStats();
    
    // Calculate system health based on success rate and queue length
    let systemHealth = 'healthy';
    const successRate = jobStats.success_rate || 0;
    const queueLength = jobStats.queued + jobStats.processing;
    
    if (successRate < 0.8 || queueLength > 100) {
      systemHealth = 'warning';
    }
    if (successRate < 0.6 || queueLength > 200) {
      systemHealth = 'critical';
    }

    // Build response following Phase 2 specification
    const globalStats = {
      total_users: summaryStats.total_users || 0,
      total_assessments: summaryStats.total_results || 0,
      total_jobs: jobStats.total_jobs || 0,
      successful_jobs: jobStats.completed || 0,
      failed_jobs: jobStats.failed || 0,
      processing_jobs: jobStats.processing || 0,
      success_rate: parseFloat((successRate * 100).toFixed(2)), // Convert to percentage
      system_health: systemHealth
    };

    const responseTime = Date.now() - startTime;
    
    logger.info('Global statistics retrieved successfully', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      responseTime: `${responseTime}ms`,
      systemHealth,
      totalUsers: globalStats.total_users
    });

    res.status(200).json({
      success: true,
      data: globalStats
    });
  } catch (error) {
    logger.error('Failed to fetch global statistics', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get job monitoring data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getJobMonitor = async (req, res, next) => {
  try {
    const startTime = Date.now();
    
    logger.info('Fetching job monitoring data', {
      adminId: req.admin.id,
      adminUsername: req.admin.username
    });

    // Get active jobs (processing and queued)
    const activeJobsQuery = `
      SELECT 
        aj.job_id,
        aj.user_id,
        aj.status,
        aj.assessment_name,
        aj.created_at as started_at,
        aj.processing_started_at,
        CASE 
          WHEN aj.status = 'processing' AND aj.processing_started_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (NOW() - aj.processing_started_at)) / 60.0
          ELSE NULL 
        END as processing_minutes,
        CASE 
          WHEN aj.status = 'processing' 
          THEN aj.processing_started_at + INTERVAL '5 minutes'
          ELSE aj.created_at + INTERVAL '10 minutes'
        END as estimated_completion
      FROM archive.analysis_jobs aj
      WHERE aj.status IN ('processing', 'queued')
      ORDER BY 
        CASE WHEN aj.status = 'processing' THEN 1 ELSE 2 END,
        aj.priority DESC,
        aj.created_at ASC
      LIMIT 50
    `;

    const activeJobsResult = await sequelize.query(activeJobsQuery, {
      type: sequelize.QueryTypes.SELECT
    });

    // Get queue statistics
    const queueStatsQuery = `
      SELECT 
        COUNT(CASE WHEN status = 'queued' THEN 1 END) as queued,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
        AVG(CASE 
          WHEN status IN ('completed', 'failed') AND completed_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 60.0
          ELSE NULL 
        END) as avg_processing_time_minutes
      FROM archive.analysis_jobs
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `;

    const queueStatsResult = await sequelize.query(queueStatsQuery, {
      type: sequelize.QueryTypes.SELECT
    });

    const queueStats = queueStatsResult[0];

    // Format active jobs
    const activeJobs = activeJobsResult.map(job => ({
      job_id: job.job_id,
      user_id: job.user_id,
      status: job.status,
      assessment_name: job.assessment_name,
      started_at: job.started_at,
      progress: job.status === 'processing' ? 
        Math.min(Math.round((job.processing_minutes || 0) * 20), 95) : 0, // Estimate progress
      estimated_completion: job.estimated_completion
    }));

    const monitoringData = {
      active_jobs: activeJobs,
      queue_stats: {
        queued: parseInt(queueStats.queued) || 0,
        processing: parseInt(queueStats.processing) || 0,
        avg_processing_time: queueStats.avg_processing_time_minutes ? 
          `${Math.round(queueStats.avg_processing_time_minutes)} minutes` : 'N/A'
      }
    };

    const responseTime = Date.now() - startTime;
    
    logger.info('Job monitoring data retrieved successfully', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      responseTime: `${responseTime}ms`,
      activeJobsCount: activeJobs.length,
      queuedJobs: monitoringData.queue_stats.queued,
      processingJobs: monitoringData.queue_stats.processing
    });

    res.status(200).json({
      success: true,
      data: monitoringData
    });
  } catch (error) {
    logger.error('Failed to fetch job monitoring data', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get queue status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getQueueStatus = async (req, res, next) => {
  try {
    const startTime = Date.now();
    
    logger.info('Fetching queue status', {
      adminId: req.admin.id,
      adminUsername: req.admin.username
    });

    // Get detailed queue statistics
    const queueStatusQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        MIN(created_at) as oldest_job,
        MAX(created_at) as newest_job,
        AVG(priority) as avg_priority
      FROM archive.analysis_jobs
      WHERE status IN ('queued', 'processing')
      GROUP BY status
      
      UNION ALL
      
      SELECT 
        'total_today' as status,
        COUNT(*) as count,
        MIN(created_at) as oldest_job,
        MAX(created_at) as newest_job,
        AVG(priority) as avg_priority
      FROM archive.analysis_jobs
      WHERE created_at >= CURRENT_DATE
    `;

    const queueStatusResult = await sequelize.query(queueStatusQuery, {
      type: sequelize.QueryTypes.SELECT
    });

    // Process results
    const statusMap = {};
    queueStatusResult.forEach(row => {
      statusMap[row.status] = {
        count: parseInt(row.count),
        oldest_job: row.oldest_job,
        newest_job: row.newest_job,
        avg_priority: parseFloat(row.avg_priority) || 0
      };
    });

    const queueStatus = {
      queued: statusMap.queued?.count || 0,
      processing: statusMap.processing?.count || 0,
      total_today: statusMap.total_today?.count || 0,
      oldest_queued_job: statusMap.queued?.oldest_job || null,
      queue_health: (statusMap.queued?.count || 0) < 50 ? 'healthy' : 
                   (statusMap.queued?.count || 0) < 100 ? 'warning' : 'critical'
    };

    const responseTime = Date.now() - startTime;
    
    logger.info('Queue status retrieved successfully', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      responseTime: `${responseTime}ms`,
      queuedJobs: queueStatus.queued,
      processingJobs: queueStatus.processing,
      queueHealth: queueStatus.queue_health
    });

    res.status(200).json({
      success: true,
      data: queueStatus
    });
  } catch (error) {
    logger.error('Failed to fetch queue status', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get daily analytics data
 * Phase 3 Implementation - Daily Analytics Endpoint
 */
const getDailyAnalytics = async (req, res, next) => {
  const startTime = Date.now();

  try {
    // Get date parameter or default to today
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATE_FORMAT',
          message: 'Date must be in YYYY-MM-DD format'
        }
      });
    }

    logger.info('Fetching daily analytics', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      targetDate
    });

    // Get daily statistics using raw SQL for optimal performance
    const [dailyStats] = await sequelize.query(`
      WITH daily_data AS (
        SELECT
          DATE(:targetDate) as target_date,
          -- Assessment metrics
          COUNT(CASE WHEN ar.created_at::date = :targetDate THEN 1 END) as assessments_started,
          COUNT(CASE WHEN ar.created_at::date = :targetDate AND ar.status = 'completed' THEN 1 END) as assessments_completed,
          -- Job success rate for the day
          COUNT(CASE WHEN aj.created_at::date = :targetDate AND aj.status = 'completed' THEN 1 END) as jobs_completed,
          COUNT(CASE WHEN aj.created_at::date = :targetDate AND aj.status IN ('completed', 'failed') THEN 1 END) as jobs_finished
        FROM archive.analysis_results ar
        FULL OUTER JOIN archive.analysis_jobs aj ON ar.user_id = aj.user_id
        WHERE ar.created_at::date = :targetDate OR aj.created_at::date = :targetDate
      ),
      user_metrics AS (
        SELECT
          COUNT(DISTINCT ar.user_id) as active_users,
          COUNT(DISTINCT CASE WHEN ar.created_at::date = :targetDate THEN ar.user_id END) as new_assessment_users
        FROM archive.analysis_results ar
        WHERE ar.created_at::date = :targetDate
      ),
      popular_assessments AS (
        SELECT
          ar.assessment_name,
          COUNT(*) as count
        FROM archive.analysis_results ar
        WHERE ar.created_at::date = :targetDate
        GROUP BY ar.assessment_name
        ORDER BY count DESC
        LIMIT 5
      )
      SELECT
        dd.target_date as date,
        COALESCE(um.active_users, 0) as user_logins,
        COALESCE(um.new_assessment_users, 0) as new_users,
        COALESCE(dd.assessments_completed, 0) as assessments_completed,
        COALESCE(dd.assessments_started, 0) as assessments_started,
        CASE
          WHEN dd.jobs_finished > 0
          THEN ROUND((dd.jobs_completed::numeric / dd.jobs_finished::numeric) * 100, 2)
          ELSE 0
        END as job_success_rate
      FROM daily_data dd
      CROSS JOIN user_metrics um
    `, {
      replacements: { targetDate },
      type: sequelize.QueryTypes.SELECT
    });

    // Get popular assessments separately for cleaner query
    const popularAssessments = await sequelize.query(`
      SELECT
        assessment_name as name,
        COUNT(*) as count
      FROM archive.analysis_results
      WHERE created_at::date = :targetDate
      GROUP BY assessment_name
      ORDER BY count DESC
      LIMIT 5
    `, {
      replacements: { targetDate },
      type: sequelize.QueryTypes.SELECT
    });

    const analyticsData = {
      date: targetDate,
      user_logins: parseInt(dailyStats.user_logins) || 0,
      new_users: parseInt(dailyStats.new_users) || 0,
      assessments_completed: parseInt(dailyStats.assessments_completed) || 0,
      assessments_started: parseInt(dailyStats.assessments_started) || 0,
      job_success_rate: parseFloat(dailyStats.job_success_rate) || 0,
      popular_assessments: popularAssessments.map(item => ({
        name: item.name,
        count: parseInt(item.count)
      }))
    };

    const responseTime = Date.now() - startTime;

    logger.info('Daily analytics retrieved successfully', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      responseTime: `${responseTime}ms`,
      targetDate,
      assessmentsCompleted: analyticsData.assessments_completed,
      assessmentsStarted: analyticsData.assessments_started
    });

    res.status(200).json({
      success: true,
      data: analyticsData
    });
  } catch (error) {
    logger.error('Failed to fetch daily analytics', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      error: error.message,
      stack: error.stack,
      targetDate: req.query.date
    });
    next(error);
  }
};

/**
 * Get detailed assessment data by result ID
 * Phase 3 Implementation - Assessment Deep Dive Endpoint
 */
const getAssessmentDetails = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { resultId } = req.params;

    logger.info('Fetching assessment details', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      resultId
    });

    // Get assessment details with full data
    const assessmentResult = await AnalysisResult.findOne({
      where: { id: resultId },
      attributes: [
        'id',
        'user_id',
        'assessment_name',
        'test_data',
        'test_result',
        'raw_responses',
        'status',
        'error_message',
        'created_at',
        'updated_at',
        'is_public',
        'chatbot_id'
      ]
    });

    if (!assessmentResult) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ASSESSMENT_NOT_FOUND',
          message: 'Assessment result not found'
        }
      });
    }

    // Get related job information for processing metadata
    const relatedJob = await AnalysisJob.findOne({
      where: {
        user_id: assessmentResult.user_id,
        assessment_name: assessmentResult.assessment_name
      },
      attributes: [
        'job_id',
        'status',
        'created_at',
        'completed_at',
        'error_message',
        'retry_count'
      ],
      order: [['created_at', 'DESC']]
    });

    // Calculate processing time if job data is available
    let processingTime = null;
    if (relatedJob && relatedJob.completed_at) {
      const startTime = new Date(relatedJob.created_at);
      const endTime = new Date(relatedJob.completed_at);
      processingTime = Math.round((endTime - startTime) / 1000); // in seconds
    }

    // Build detailed response
    const assessmentDetails = {
      id: assessmentResult.id,
      user_id: assessmentResult.user_id,
      assessment_name: assessmentResult.assessment_name,
      test_data: assessmentResult.test_data || {},
      test_result: assessmentResult.test_result || {},
      raw_response: {
        user_answers: assessmentResult.raw_responses?.user_answers || [],
        processing_metadata: assessmentResult.raw_responses?.processing_metadata || {}
      },
      processing_info: {
        started_at: assessmentResult.created_at,
        completed_at: assessmentResult.updated_at,
        processing_time: processingTime ? `${processingTime} seconds` : null,
        ai_model_used: assessmentResult.test_result?.ai_model_used || 'Unknown',
        status: assessmentResult.status,
        error_message: assessmentResult.error_message,
        retry_count: relatedJob?.retry_count || 0
      },
      metadata: {
        is_public: assessmentResult.is_public,
        chatbot_id: assessmentResult.chatbot_id,
        job_id: relatedJob?.job_id || null
      }
    };

    const responseTime = Date.now() - startTime;

    logger.info('Assessment details retrieved successfully', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      responseTime: `${responseTime}ms`,
      resultId,
      assessmentName: assessmentDetails.assessment_name,
      status: assessmentDetails.processing_info.status
    });

    res.status(200).json({
      success: true,
      data: assessmentDetails
    });
  } catch (error) {
    logger.error('Failed to fetch assessment details', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      error: error.message,
      stack: error.stack,
      resultId: req.params.resultId
    });
    next(error);
  }
};

/**
 * Search assessments with filtering and pagination
 * Phase 3 Implementation - Assessment Search Endpoint
 */
const searchAssessments = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const {
      user_id,
      date_from,
      date_to,
      assessment_name,
      status,
      limit = 20,
      offset = 0,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    logger.info('Searching assessments', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      filters: { user_id, date_from, date_to, assessment_name, status },
      pagination: { limit, offset }
    });

    // Build where conditions
    const whereConditions = [];
    const replacements = {};

    if (user_id) {
      whereConditions.push('user_id = :user_id');
      replacements.user_id = user_id;
    }

    if (date_from) {
      whereConditions.push('created_at >= :date_from');
      replacements.date_from = date_from;
    }

    if (date_to) {
      whereConditions.push('created_at <= :date_to');
      replacements.date_to = date_to + ' 23:59:59'; // Include full day
    }

    if (assessment_name) {
      whereConditions.push('assessment_name = :assessment_name');
      replacements.assessment_name = assessment_name;
    }

    if (status) {
      whereConditions.push('status = :status');
      replacements.status = status;
    }

    // Validate sort parameters
    const validSortFields = ['created_at', 'updated_at', 'assessment_name', 'status'];
    const validSortOrders = ['ASC', 'DESC'];

    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = validSortOrders.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'DESC';

    // Build WHERE clause
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Set pagination limits
    const limitValue = Math.min(parseInt(limit) || 20, 100); // Max 100 results per page
    const offsetValue = Math.max(parseInt(offset) || 0, 0);

    replacements.limit = limitValue;
    replacements.offset = offsetValue;

    // Get total count for pagination
    const [countResult] = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM archive.analysis_results
      ${whereClause}
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    const totalCount = parseInt(countResult.total);

    // Get assessment results with pagination
    const assessments = await sequelize.query(`
      SELECT
        id,
        user_id,
        assessment_name,
        status,
        created_at,
        updated_at,
        is_public,
        chatbot_id,
        CASE
          WHEN test_result IS NOT NULL AND test_result->>'archetype' IS NOT NULL
          THEN test_result->>'archetype'
          ELSE 'Unknown'
        END as archetype,
        CASE
          WHEN test_data IS NOT NULL
          THEN jsonb_array_length(COALESCE(test_data->'responses', '[]'::jsonb))
          ELSE 0
        END as response_count
      FROM archive.analysis_results
      ${whereClause}
      ORDER BY ${sortField} ${sortDirection}
      LIMIT :limit OFFSET :offset
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitValue);
    const currentPage = Math.floor(offsetValue / limitValue) + 1;
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    const searchResults = {
      assessments: assessments.map(assessment => ({
        id: assessment.id,
        user_id: assessment.user_id,
        assessment_name: assessment.assessment_name,
        status: assessment.status,
        archetype: assessment.archetype,
        response_count: parseInt(assessment.response_count),
        created_at: assessment.created_at,
        updated_at: assessment.updated_at,
        is_public: assessment.is_public,
        chatbot_id: assessment.chatbot_id
      })),
      pagination: {
        total: totalCount,
        limit: limitValue,
        offset: offsetValue,
        current_page: currentPage,
        total_pages: totalPages,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage
      },
      filters_applied: {
        user_id: user_id || null,
        date_from: date_from || null,
        date_to: date_to || null,
        assessment_name: assessment_name || null,
        status: status || null
      },
      sorting: {
        sort_by: sortField,
        sort_order: sortDirection
      }
    };

    const responseTime = Date.now() - startTime;

    logger.info('Assessment search completed successfully', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      responseTime: `${responseTime}ms`,
      totalResults: totalCount,
      returnedResults: assessments.length,
      filtersApplied: Object.keys(searchResults.filters_applied).filter(key => searchResults.filters_applied[key] !== null).length
    });

    res.status(200).json({
      success: true,
      data: searchResults
    });
  } catch (error) {
    logger.error('Failed to search assessments', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      error: error.message,
      stack: error.stack,
      queryParams: req.query
    });
    next(error);
  }
};

/**
 * Cancel a specific job
 * Phase 4 Implementation - Advanced Job Management
 */
const cancelJob = async (req, res, next) => {
  const startTime = Date.now();
  const { jobId } = req.params;

  try {
    logger.info('Admin attempting to cancel job', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      jobId
    });

    // Check if job exists and get current status
    const job = await AnalysisJob.findOne({
      where: { job_id: jobId }
    });

    if (!job) {
      logger.warn('Job not found for cancellation', {
        adminId: req.admin.id,
        adminUsername: req.admin.username,
        jobId
      });
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // Check if job can be cancelled (only queued or processing jobs)
    if (!['queued', 'processing'].includes(job.status)) {
      logger.warn('Job cannot be cancelled - invalid status', {
        adminId: req.admin.id,
        adminUsername: req.admin.username,
        jobId,
        currentStatus: job.status
      });
      return res.status(400).json({
        success: false,
        error: `Job cannot be cancelled. Current status: ${job.status}. Only queued or processing jobs can be cancelled.`
      });
    }

    // Update job status to cancelled
    const updatedJob = await analysisJobsService.updateJobStatus(jobId, 'cancelled', {
      cancelled_at: new Date(),
      cancelled_by: req.admin.id,
      cancellation_reason: 'Admin cancellation'
    });

    const responseTime = Date.now() - startTime;

    logger.info('Job cancelled successfully by admin', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      jobId,
      previousStatus: job.status,
      responseTime: `${responseTime}ms`
    });

    res.status(200).json({
      success: true,
      message: 'Job cancelled successfully',
      data: {
        job_id: updatedJob.job_id,
        previous_status: job.status,
        current_status: 'cancelled',
        cancelled_at: updatedJob.cancelled_at,
        cancelled_by: req.admin.username
      }
    });
  } catch (error) {
    logger.error('Failed to cancel job', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      jobId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Retry a failed job
 * Phase 4 Implementation - Advanced Job Management
 */
const retryJob = async (req, res, next) => {
  const startTime = Date.now();
  const { jobId } = req.params;

  try {
    logger.info('Admin attempting to retry job', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      jobId
    });

    // Check if job exists and get current status
    const job = await AnalysisJob.findOne({
      where: { job_id: jobId }
    });

    if (!job) {
      logger.warn('Job not found for retry', {
        adminId: req.admin.id,
        adminUsername: req.admin.username,
        jobId
      });
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // Check if job can be retried (only failed or cancelled jobs)
    if (!['failed', 'cancelled'].includes(job.status)) {
      logger.warn('Job cannot be retried - invalid status', {
        adminId: req.admin.id,
        adminUsername: req.admin.username,
        jobId,
        currentStatus: job.status
      });
      return res.status(400).json({
        success: false,
        error: `Job cannot be retried. Current status: ${job.status}. Only failed or cancelled jobs can be retried.`
      });
    }

    // Update job status to queued for retry
    const updatedJob = await analysisJobsService.updateJobStatus(jobId, 'queued', {
      retried_at: new Date(),
      retried_by: req.admin.id,
      retry_count: (job.retry_count || 0) + 1,
      error_message: null // Clear previous error
    });

    const responseTime = Date.now() - startTime;

    logger.info('Job queued for retry successfully by admin', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      jobId,
      previousStatus: job.status,
      retryCount: updatedJob.retry_count,
      responseTime: `${responseTime}ms`
    });

    res.status(200).json({
      success: true,
      message: 'Job queued for retry successfully',
      data: {
        job_id: updatedJob.job_id,
        previous_status: job.status,
        current_status: 'queued',
        retry_count: updatedJob.retry_count,
        retried_at: updatedJob.retried_at,
        retried_by: req.admin.username
      }
    });
  } catch (error) {
    logger.error('Failed to retry job', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      jobId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Bulk job operations (cancel/retry multiple jobs)
 * Phase 4 Implementation - Advanced Job Management
 */
const bulkJobOperation = async (req, res, next) => {
  const startTime = Date.now();
  const { operation, jobIds } = req.body;

  try {
    logger.info('Admin attempting bulk job operation', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      operation,
      jobCount: jobIds?.length || 0
    });

    // Validate operation type
    if (!['cancel', 'retry'].includes(operation)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid operation. Must be "cancel" or "retry"'
      });
    }

    // Validate jobIds array
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'jobIds must be a non-empty array'
      });
    }

    if (jobIds.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 jobs can be processed in a single bulk operation'
      });
    }

    // Get all jobs to validate they exist and check their status
    const jobs = await AnalysisJob.findAll({
      where: { job_id: jobIds }
    });

    if (jobs.length !== jobIds.length) {
      const foundJobIds = jobs.map(job => job.job_id);
      const missingJobIds = jobIds.filter(id => !foundJobIds.includes(id));
      return res.status(404).json({
        success: false,
        error: `Jobs not found: ${missingJobIds.join(', ')}`
      });
    }

    const results = {
      successful: [],
      failed: [],
      skipped: []
    };

    // Process each job based on operation
    for (const job of jobs) {
      try {
        if (operation === 'cancel') {
          // Check if job can be cancelled
          if (['queued', 'processing'].includes(job.status)) {
            await analysisJobsService.updateJobStatus(job.job_id, 'cancelled', {
              cancelled_at: new Date(),
              cancelled_by: req.admin.id,
              cancellation_reason: 'Admin bulk cancellation'
            });
            results.successful.push({
              job_id: job.job_id,
              previous_status: job.status,
              new_status: 'cancelled'
            });
          } else {
            results.skipped.push({
              job_id: job.job_id,
              reason: `Cannot cancel job with status: ${job.status}`,
              current_status: job.status
            });
          }
        } else if (operation === 'retry') {
          // Check if job can be retried
          if (['failed', 'cancelled'].includes(job.status)) {
            await analysisJobsService.updateJobStatus(job.job_id, 'queued', {
              retried_at: new Date(),
              retried_by: req.admin.id,
              retry_count: (job.retry_count || 0) + 1,
              error_message: null
            });
            results.successful.push({
              job_id: job.job_id,
              previous_status: job.status,
              new_status: 'queued',
              retry_count: (job.retry_count || 0) + 1
            });
          } else {
            results.skipped.push({
              job_id: job.job_id,
              reason: `Cannot retry job with status: ${job.status}`,
              current_status: job.status
            });
          }
        }
      } catch (error) {
        logger.error(`Failed to ${operation} job in bulk operation`, {
          adminId: req.admin.id,
          jobId: job.job_id,
          error: error.message
        });
        results.failed.push({
          job_id: job.job_id,
          error: error.message
        });
      }
    }

    const responseTime = Date.now() - startTime;

    logger.info('Bulk job operation completed', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      operation,
      totalJobs: jobIds.length,
      successful: results.successful.length,
      failed: results.failed.length,
      skipped: results.skipped.length,
      responseTime: `${responseTime}ms`
    });

    res.status(200).json({
      success: true,
      message: `Bulk ${operation} operation completed`,
      data: {
        operation,
        total_jobs: jobIds.length,
        summary: {
          successful: results.successful.length,
          failed: results.failed.length,
          skipped: results.skipped.length
        },
        results
      }
    });
  } catch (error) {
    logger.error('Failed to perform bulk job operation', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      operation,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get performance optimization report
 * Phase 4 Implementation - Performance Monitoring
 */
const getPerformanceReport = async (req, res, next) => {
  const startTime = Date.now();

  try {
    logger.info('Admin requesting performance report', {
      adminId: req.admin.id,
      adminUsername: req.admin.username
    });

    // Get comprehensive performance report
    const performanceReport = await performanceOptimizationService.getPerformanceReport();

    const responseTime = Date.now() - startTime;

    logger.info('Performance report generated successfully', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      responseTime: `${responseTime}ms`,
      totalRecommendations: performanceReport.recommendations.length
    });

    res.status(200).json({
      success: true,
      data: performanceReport
    });
  } catch (error) {
    logger.error('Failed to generate performance report', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Optimize database indexes
 * Phase 4 Implementation - Database Optimization
 */
const optimizeDatabase = async (req, res, next) => {
  const startTime = Date.now();

  try {
    logger.info('Admin requesting database optimization', {
      adminId: req.admin.id,
      adminUsername: req.admin.username
    });

    // Run database optimizations
    const [indexOptimization, queryPlanOptimization] = await Promise.all([
      performanceOptimizationService.optimizeIndexes(),
      performanceOptimizationService.optimizeQueryPlans()
    ]);

    const responseTime = Date.now() - startTime;

    const optimizationResult = {
      indexOptimization,
      queryPlanOptimization,
      optimizedAt: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    };

    logger.info('Database optimization completed', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      responseTime: `${responseTime}ms`,
      indexRecommendations: indexOptimization.recommendations.length,
      queryPlanRecommendations: queryPlanOptimization.recommendations.length
    });

    res.status(200).json({
      success: true,
      message: 'Database optimization completed',
      data: optimizationResult
    });
  } catch (error) {
    logger.error('Failed to optimize database', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get security audit report
 * Phase 4 Implementation - Security Enhancement
 */
const getSecurityAuditReport = async (req, res, next) => {
  const startTime = Date.now();

  try {
    logger.info('Admin requesting security audit report', {
      adminId: req.admin.id,
      adminUsername: req.admin.username
    });

    // Get security audit data from activity logs
    const auditData = await sequelize.query(`
      SELECT
        activity_type,
        COUNT(*) as count,
        DATE(created_at) as date,
        admin_id
      FROM archive.user_activity_logs
      WHERE created_at >= NOW() - INTERVAL '30 days'
        AND activity_type LIKE 'security_%'
      GROUP BY activity_type, DATE(created_at), admin_id
      ORDER BY date DESC, count DESC
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    // Get high-risk events
    const highRiskEvents = await sequelize.query(`
      SELECT
        activity_type,
        description,
        admin_id,
        ip_address,
        created_at,
        additional_data
      FROM archive.user_activity_logs
      WHERE created_at >= NOW() - INTERVAL '7 days'
        AND (
          additional_data->>'risk_score' >= '8'
          OR activity_type IN ('access_denied', 'security_suspicious_activity')
        )
      ORDER BY created_at DESC
      LIMIT 50
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    const responseTime = Date.now() - startTime;

    const securityReport = {
      auditSummary: auditData,
      highRiskEvents,
      reportGeneratedAt: new Date().toISOString(),
      reportPeriod: '30 days',
      totalSecurityEvents: auditData.reduce((sum, item) => sum + parseInt(item.count), 0),
      highRiskEventCount: highRiskEvents.length
    };

    logger.info('Security audit report generated', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      responseTime: `${responseTime}ms`,
      totalEvents: securityReport.totalSecurityEvents,
      highRiskEvents: securityReport.highRiskEventCount
    });

    res.status(200).json({
      success: true,
      data: securityReport
    });
  } catch (error) {
    logger.error('Failed to generate security audit report', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Anonymize user data for GDPR compliance
 * Phase 4 Implementation - GDPR Compliance
 */
const anonymizeUserData = async (req, res, next) => {
  const startTime = Date.now();
  const { userId } = req.params;

  try {
    logger.info('Admin requesting user data anonymization', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      userId
    });

    // Log security event
    await securityEnhancementService.logSecurityEvent('data_anonymization_request', req.admin.id, {
      description: `GDPR data anonymization requested for user ${userId}`,
      additionalData: { userId },
      securityLevel: 'high',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Perform anonymization
    const result = await securityEnhancementService.anonymizeUserData(userId, req.admin.id);

    const responseTime = Date.now() - startTime;

    logger.info('User data anonymization completed', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      userId,
      responseTime: `${responseTime}ms`,
      recordsAnonymized: result.recordsAnonymized
    });

    res.status(200).json({
      success: true,
      message: 'User data anonymized successfully',
      data: result
    });
  } catch (error) {
    logger.error('Failed to anonymize user data', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

module.exports = {
  getGlobalStats,
  getJobMonitor,
  getQueueStatus,
  getDailyAnalytics,
  getAssessmentDetails,
  searchAssessments,
  cancelJob,
  retryJob,
  bulkJobOperation,
  getPerformanceReport,
  optimizeDatabase,
  getSecurityAuditReport,
  anonymizeUserData
};
