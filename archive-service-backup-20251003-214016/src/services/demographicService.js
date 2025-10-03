/**
 * Demographic Service
 * Provides demographic insights and analytics based on user profiles
 */

const { AnalysisResult, UserProfile, School, sequelize } = require('../models');
const logger = require('../utils/logger');

/**
 * Get demographic overview of all analyses
 * @returns {Promise<Object>} Demographic overview
 */
const getDemographicOverview = async () => {
  try {
    // Gender distribution
    const genderStats = await sequelize.query(`
      SELECT 
        COALESCE(up.gender, 'unknown') as gender,
        COUNT(ar.id) as count,
        ROUND(COUNT(ar.id) * 100.0 / SUM(COUNT(ar.id)) OVER (), 2) as percentage
      FROM archive.analysis_results ar
      LEFT JOIN auth.user_profiles up ON ar.user_id = up.user_id
      WHERE ar.status = 'completed'
      GROUP BY up.gender
      ORDER BY count DESC
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    // Age group distribution - optimized dengan index pada date_of_birth
    const ageStats = await sequelize.query(`
      SELECT
        CASE
          WHEN EXTRACT(YEAR FROM AGE(up.date_of_birth)) < 18 THEN 'Under 18'
          WHEN EXTRACT(YEAR FROM AGE(up.date_of_birth)) BETWEEN 18 AND 22 THEN '18-22'
          WHEN EXTRACT(YEAR FROM AGE(up.date_of_birth)) BETWEEN 23 AND 27 THEN '23-27'
          WHEN EXTRACT(YEAR FROM AGE(up.date_of_birth)) BETWEEN 28 AND 35 THEN '28-35'
          WHEN EXTRACT(YEAR FROM AGE(up.date_of_birth)) > 35 THEN 'Over 35'
          ELSE 'Unknown'
        END as age_group,
        COUNT(ar.id) as count,
        ROUND(COUNT(ar.id) * 100.0 / SUM(COUNT(ar.id)) OVER (), 2) as percentage
      FROM archive.analysis_results ar
      INNER JOIN auth.user_profiles up ON ar.user_id = up.user_id
      WHERE ar.status = 'completed'
        AND up.date_of_birth IS NOT NULL
      GROUP BY age_group
      ORDER BY count DESC
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    // Top schools by analysis count
    const schoolStats = await sequelize.query(`
      SELECT
        COALESCE(s.name, 'Unknown') as school_name,
        s.city,
        s.province,
        COUNT(ar.id) as analysis_count,
        COUNT(DISTINCT ar.user_id) as unique_users
      FROM archive.analysis_results ar
      LEFT JOIN auth.user_profiles up ON ar.user_id = up.user_id
      LEFT JOIN public.schools s ON up.school_id = s.id
      WHERE ar.status = 'completed'
      GROUP BY s.id, s.name, s.city, s.province
      HAVING COUNT(ar.id) > 0
      ORDER BY analysis_count DESC
      LIMIT 10
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    // Archetype distribution by gender - optimized dengan index pada gender
    const archetypeByGender = await sequelize.query(`
      SELECT
        ar.persona_profile->>'archetype' as archetype,
        COALESCE(up.gender, 'unknown') as gender,
        COUNT(*) as count
      FROM archive.analysis_results ar
      INNER JOIN auth.user_profiles up ON ar.user_id = up.user_id
      WHERE ar.status = 'completed'
        AND ar.persona_profile->>'archetype' IS NOT NULL
        AND up.gender IS NOT NULL
      GROUP BY ar.persona_profile->>'archetype', up.gender
      ORDER BY archetype, count DESC
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    logger.info('Demographic overview generated', {
      genderGroups: genderStats.length,
      ageGroups: ageStats.length,
      topSchools: schoolStats.length
    });

    return {
      gender_distribution: genderStats,
      age_distribution: ageStats,
      top_schools: schoolStats,
      archetype_by_gender: archetypeByGender,
      generated_at: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error generating demographic overview', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Get demographic insights for a specific archetype
 * @param {string} archetype - The archetype to analyze
 * @returns {Promise<Object>} Archetype demographic insights
 */
const getArchetypeDemographics = async (archetype) => {
  try {
    // Gender distribution for this archetype - optimized dengan composite index
    const genderDistribution = await sequelize.query(`
      SELECT
        up.gender,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
      FROM archive.analysis_results ar
      INNER JOIN auth.user_profiles up ON ar.user_id = up.user_id
      WHERE ar.status = 'completed'
        AND ar.persona_profile->>'archetype' = :archetype
        AND up.gender IS NOT NULL
      GROUP BY up.gender
      ORDER BY count DESC
    `, {
      replacements: { archetype },
      type: sequelize.QueryTypes.SELECT
    });

    // Age statistics for this archetype
    const ageStats = await sequelize.query(`
      SELECT 
        ROUND(AVG(EXTRACT(YEAR FROM AGE(up.date_of_birth))), 1) as average_age,
        MIN(EXTRACT(YEAR FROM AGE(up.date_of_birth))) as min_age,
        MAX(EXTRACT(YEAR FROM AGE(up.date_of_birth))) as max_age,
        COUNT(up.date_of_birth) as profiles_with_age
      FROM archive.analysis_results ar
      LEFT JOIN auth.user_profiles up ON ar.user_id = up.user_id
      WHERE ar.status = 'completed'
        AND ar.persona_profile->>'archetype' = :archetype
        AND up.date_of_birth IS NOT NULL
    `, {
      replacements: { archetype },
      type: sequelize.QueryTypes.SELECT
    });

    // Top schools for this archetype - optimized dengan index pada school_id
    const topSchools = await sequelize.query(`
      SELECT
        s.name as school_name,
        s.city,
        s.province,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
      FROM archive.analysis_results ar
      INNER JOIN auth.user_profiles up ON ar.user_id = up.user_id
      INNER JOIN public.schools s ON up.school_id = s.id
      WHERE ar.status = 'completed'
        AND ar.persona_profile->>'archetype' = :archetype
        AND up.school_id IS NOT NULL
      GROUP BY s.id, s.name, s.city, s.province
      ORDER BY count DESC
      LIMIT 10
    `, {
      replacements: { archetype },
      type: sequelize.QueryTypes.SELECT
    });

    logger.info('Archetype demographics generated', {
      archetype,
      genderGroups: genderDistribution.length,
      topSchools: topSchools.length
    });

    return {
      archetype,
      gender_distribution: genderDistribution,
      age_statistics: ageStats[0] || null,
      top_schools: topSchools,
      generated_at: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error generating archetype demographics', {
      archetype,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Get school-based analytics
 * @param {string} schoolName - Optional school name filter
 * @returns {Promise<Object>} School analytics
 */
const getSchoolAnalytics = async (schoolName = null) => {
  try {
    let whereClause = '';
    let replacements = {};

    if (schoolName) {
      whereClause = 'AND s.name ILIKE :schoolName';
      replacements.schoolName = `%${schoolName}%`;
    }

    // School performance overview
    const schoolStats = await sequelize.query(`
      SELECT
        s.name as school_name,
        s.city,
        s.province,
        COUNT(ar.id) as total_analyses,
        COUNT(DISTINCT ar.user_id) as unique_users,
        COUNT(DISTINCT ar.persona_profile->>'archetype') as unique_archetypes
      FROM archive.analysis_results ar
      INNER JOIN auth.user_profiles up ON ar.user_id = up.user_id
      INNER JOIN public.schools s ON up.school_id = s.id
      WHERE ar.status = 'completed'
        ${whereClause}
      GROUP BY s.id, s.name, s.city, s.province
      ORDER BY total_analyses DESC
      LIMIT 20
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    // Archetype distribution by schools
    const archetypeBySchool = await sequelize.query(`
      SELECT
        s.name as school_name,
        s.city,
        s.province,
        ar.persona_profile->>'archetype' as archetype,
        COUNT(*) as count
      FROM archive.analysis_results ar
      INNER JOIN auth.user_profiles up ON ar.user_id = up.user_id
      INNER JOIN public.schools s ON up.school_id = s.id
      WHERE ar.status = 'completed'
        AND up.school_id IS NOT NULL
        AND ar.persona_profile->>'archetype' IS NOT NULL
        ${whereClause}
      GROUP BY s.id, s.name, s.city, s.province, ar.persona_profile->>'archetype'
      ORDER BY s.name, count DESC
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    logger.info('School analytics generated', {
      schoolFilter: schoolName,
      schoolsAnalyzed: schoolStats.length
    });

    return {
      school_filter: schoolName,
      school_statistics: schoolStats,
      archetype_distribution: archetypeBySchool,
      generated_at: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error generating school analytics', {
      schoolName,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Get optimized demographic insights using composite indexes
 * @param {Object} filters - Demographic filters
 * @returns {Promise<Object>} Optimized demographic insights
 */
const getOptimizedDemographics = async (filters = {}) => {
  try {
    const { gender, ageRange, schoolId, schoolName, archetype } = filters;

    // Base query yang memanfaatkan composite index idx_user_profiles_demographics
    let whereClause = 'ar.status = \'completed\'';
    const replacements = {};

    if (gender) {
      whereClause += ' AND up.gender = :gender';
      replacements.gender = gender;
    }

    if (ageRange && ageRange.min && ageRange.max) {
      const currentYear = new Date().getFullYear();
      const maxBirthYear = currentYear - ageRange.min;
      const minBirthYear = currentYear - ageRange.max;

      whereClause += ' AND up.date_of_birth BETWEEN :minDate AND :maxDate';
      replacements.minDate = `${minBirthYear}-01-01`;
      replacements.maxDate = `${maxBirthYear}-12-31`;
    }

    if (schoolId) {
      whereClause += ' AND up.school_id = :schoolId';
      replacements.schoolId = schoolId;
    }

    if (schoolName) {
      whereClause += ' AND s.name ILIKE :schoolName';
      replacements.schoolName = `%${schoolName}%`;
    }

    if (archetype) {
      whereClause += ' AND ar.persona_profile->>\'archetype\' = :archetype';
      replacements.archetype = archetype;
    }

    // Query yang dioptimalkan menggunakan composite index
    const results = await sequelize.query(`
      SELECT
        up.gender,
        s.name as school_name,
        s.city as school_city,
        s.province as school_province,
        EXTRACT(YEAR FROM AGE(up.date_of_birth)) as age,
        ar.persona_profile->>'archetype' as archetype,
        COUNT(*) as count
      FROM archive.analysis_results ar
      INNER JOIN auth.user_profiles up ON ar.user_id = up.user_id
      LEFT JOIN public.schools s ON up.school_id = s.id
      WHERE ${whereClause}
        AND up.gender IS NOT NULL
        AND up.date_of_birth IS NOT NULL
      GROUP BY up.gender, s.id, s.name, s.city, s.province, up.date_of_birth, ar.persona_profile->>'archetype'
      ORDER BY count DESC
      LIMIT 100
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    logger.info('Optimized demographics generated', {
      filters,
      resultCount: results.length
    });

    return {
      results,
      summary: {
        totalRecords: results.reduce((sum, r) => sum + parseInt(r.count), 0),
        uniqueGenders: [...new Set(results.map(r => r.gender))].length,
        uniqueSchools: [...new Set(results.map(r => r.school_name).filter(Boolean))].length,
        uniqueArchetypes: [...new Set(results.map(r => r.archetype))].length
      }
    };

  } catch (error) {
    logger.error('Error generating optimized demographics', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Get demographic trends over time using optimized queries
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Demographic trends
 */
const getDemographicTrends = async (options = {}) => {
  try {
    const { period = 'month', limit = 12 } = options;

    // Query yang memanfaatkan index pada created_at
    const trends = await sequelize.query(`
      SELECT
        DATE_TRUNC(:period, ar.created_at) as period,
        COUNT(DISTINCT ar.user_id) as unique_users,
        COUNT(*) as total_analyses,
        COUNT(DISTINCT up.gender) as gender_diversity,
        COUNT(DISTINCT up.school_id) as school_diversity,
        AVG(EXTRACT(YEAR FROM AGE(up.date_of_birth))) as avg_age
      FROM archive.analysis_results ar
      INNER JOIN auth.user_profiles up ON ar.user_id = up.user_id
      WHERE ar.status = 'completed'
        AND ar.created_at >= NOW() - INTERVAL '${limit} ${period}s'
      GROUP BY DATE_TRUNC(:period, ar.created_at)
      ORDER BY period DESC
      LIMIT :limit
    `, {
      replacements: { period, limit },
      type: sequelize.QueryTypes.SELECT
    });

    logger.info('Demographic trends generated', {
      period,
      trendsCount: trends.length
    });

    return trends;

  } catch (error) {
    logger.error('Error generating demographic trends', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

module.exports = {
  getDemographicOverview,
  getArchetypeDemographics,
  getSchoolAnalytics,
  getOptimizedDemographics,
  getDemographicTrends
};
