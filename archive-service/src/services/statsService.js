/**
 * Statistics Service
 * Business logic for user statistics and analytics
 */

const AnalysisResult = require('../models/AnalysisResult');
const logger = require('../utils/logger');

/**
 * Get user statistics
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - User statistics
 */
const getUserStats = async (userId) => {
  try {
    logger.info('Fetching user statistics', { userId });
    
    const stats = await AnalysisResult.getUserStats(userId);
    
    logger.info('User statistics fetched successfully', {
      userId,
      totalAnalyses: stats.total_analyses
    });
    
    return stats;
  } catch (error) {
    logger.error('Failed to fetch user statistics', {
      error: error.message,
      userId
    });
    throw error;
  }
};

/**
 * Get user overview statistics (safe for frontend)
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - User overview statistics
 */
const getUserOverview = async (userId) => {
  try {
    logger.info('Fetching user overview statistics', { userId });

    const { sequelize } = require('../config/database');

    // Get user's basic stats
    const [userStats] = await sequelize.query(`
      SELECT
        COUNT(*) as total_analyses,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_analyses,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_analyses,
        MAX(created_at) as last_analysis_date
      FROM archive.analysis_results
      WHERE user_id = :userId
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    // Get user's recent archetypes (last 5 completed)
    const recentArchetypes = await sequelize.query(`
      SELECT
        test_result->>'archetype' as archetype,
        created_at
      FROM archive.analysis_results
      WHERE user_id = :userId
        AND status = 'completed'
        AND test_result IS NOT NULL
        AND test_result->>'archetype' IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 5
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    const overview = {
      user_stats: {
        total_analyses: parseInt(userStats.total_analyses) || 0,
        completed_analyses: parseInt(userStats.completed_analyses) || 0,
        processing_analyses: parseInt(userStats.processing_analyses) || 0,
        last_analysis_date: userStats.last_analysis_date
      },
      recent_archetypes: recentArchetypes.map(item => ({
        archetype: item.archetype,
        date: item.created_at
      }))
    };

    logger.info('User overview statistics fetched successfully', {
      userId,
      totalAnalyses: overview.user_stats.total_analyses
    });

    return overview;
  } catch (error) {
    logger.error('Failed to fetch user overview statistics', {
      error: error.message,
      userId
    });
    throw error;
  }
};

/**
 * Get summary statistics (for admin or internal use)
 * @returns {Promise<Object>} - Summary statistics
 */
const getSummaryStats = async () => {
  try {
    logger.info('Fetching summary statistics');
    
    const { sequelize } = require('../config/database');
    
    // Get overall statistics
    const [overallStats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_results,
        COUNT(DISTINCT user_id) as total_users,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_results,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_results,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_results,
        AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100 as success_rate
      FROM archive.analysis_results
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    
    // Get top archetypes
    const topArchetypes = await sequelize.query(`
      SELECT
        test_result->>'archetype' as archetype,
        COUNT(*) as count
      FROM archive.analysis_results
      WHERE status = 'completed'
        AND test_result IS NOT NULL
        AND test_result->>'archetype' IS NOT NULL
      GROUP BY test_result->>'archetype'
      ORDER BY count DESC
      LIMIT 5
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    
    // Get recent activity (last 30 days)
    const [recentActivity] = await sequelize.query(`
      SELECT 
        COUNT(*) as results_last_30_days,
        COUNT(DISTINCT user_id) as active_users_last_30_days
      FROM archive.analysis_results
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    
    const stats = {
      overall: {
        total_results: parseInt(overallStats.total_results) || 0,
        total_users: parseInt(overallStats.total_users) || 0,
        completed_results: parseInt(overallStats.completed_results) || 0,
        processing_results: parseInt(overallStats.processing_results) || 0,
        failed_results: parseInt(overallStats.failed_results) || 0,
        success_rate: parseFloat(overallStats.success_rate) || 0
      },
      top_archetypes: topArchetypes.map(item => ({
        archetype: item.archetype,
        count: parseInt(item.count)
      })),
      recent_activity: {
        results_last_30_days: parseInt(recentActivity.results_last_30_days) || 0,
        active_users_last_30_days: parseInt(recentActivity.active_users_last_30_days) || 0
      }
    };
    
    logger.info('Summary statistics fetched successfully', {
      totalResults: stats.overall.total_results,
      totalUsers: stats.overall.total_users
    });
    
    return stats;
  } catch (error) {
    logger.error('Failed to fetch summary statistics', {
      error: error.message
    });
    throw error;
  }
};

module.exports = {
  getUserStats,
  getUserOverview,
  getSummaryStats
};
