/**
 * Query Builder Utility
 * Centralized query building functions to reduce code duplication
 */

const { sequelize } = require('../config/database');

/**
 * Build demographic filter WHERE clause
 * @param {Object} filters - Demographic filters
 * @returns {Object} - { whereClause, replacements }
 */
const buildDemographicFilters = (filters = {}) => {
  const { gender, ageRange, schoolOrigin, archetype, status = 'completed' } = filters;
  
  let whereClause = 'ar.status = :status';
  const replacements = { status };

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

  if (schoolOrigin) {
    whereClause += ' AND up.school_origin ILIKE :schoolOrigin';
    replacements.schoolOrigin = `%${schoolOrigin}%`;
  }

  if (archetype) {
    whereClause += ' AND ar.persona_profile->>\'archetype\' = :archetype';
    replacements.archetype = archetype;
  }

  return { whereClause, replacements };
};

/**
 * Execute demographic analysis query with optimized indexes
 * @param {Object} filters - Demographic filters
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Query results
 */
const executeDemographicAnalysis = async (filters = {}, options = {}) => {
  const { limit = 100, includeAge = true, includeSchool = true } = options;
  const { whereClause, replacements } = buildDemographicFilters(filters);
  
  replacements.limit = limit;

  // Build SELECT clause based on options
  let selectClause = `
    ar.id,
    ar.user_id,
    ar.persona_profile->>'archetype' as archetype,
    ar.status,
    ar.created_at,
    up.gender
  `;

  if (includeSchool) {
    selectClause += ', up.school_origin';
  }

  if (includeAge) {
    selectClause += ', EXTRACT(YEAR FROM AGE(up.date_of_birth)) as age';
  }

  // Optimized query using composite indexes
  const results = await sequelize.query(`
    SELECT ${selectClause}
    FROM archive.analysis_results ar
    INNER JOIN auth.user_profiles up ON ar.user_id = up.user_id
    WHERE ${whereClause}
    ORDER BY ar.created_at DESC
    LIMIT :limit
  `, {
    replacements,
    type: sequelize.QueryTypes.SELECT
  });

  return results;
};

/**
 * Build pagination parameters
 * @param {Object} query - Query parameters
 * @returns {Object} - Pagination parameters
 */
const buildPaginationParams = (query = {}) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
};

/**
 * Build sorting parameters
 * @param {Object} query - Query parameters
 * @param {Array} allowedFields - Allowed sort fields
 * @returns {Object} - Sort parameters
 */
const buildSortParams = (query = {}, allowedFields = ['created_at']) => {
  const sort = allowedFields.includes(query.sort) ? query.sort : 'created_at';
  const order = ['ASC', 'DESC'].includes(query.order?.toUpperCase()) ? 
    query.order.toUpperCase() : 'DESC';
  
  return { sort, order };
};

/**
 * Execute archetype distribution query
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Archetype distribution results
 */
const executeArchetypeDistribution = async (options = {}) => {
  const { includeDemo = true, limit = 50 } = options;

  let query = `
    SELECT
      ar.persona_profile->>'archetype' as archetype,
      COUNT(*) as total_count
  `;

  if (includeDemo) {
    query += `,
      COUNT(CASE WHEN up.gender = 'male' THEN 1 END) as male_count,
      COUNT(CASE WHEN up.gender = 'female' THEN 1 END) as female_count,
      ROUND(AVG(EXTRACT(YEAR FROM AGE(up.date_of_birth))), 1) as avg_age,
      COUNT(DISTINCT up.school_origin) as unique_schools
    `;
  }

  query += `
    FROM archive.analysis_results ar
    INNER JOIN auth.user_profiles up ON ar.user_id = up.user_id
    WHERE ar.status = 'completed'
      AND ar.persona_profile->>'archetype' IS NOT NULL
  `;

  if (includeDemo) {
    query += `
      AND up.gender IS NOT NULL
      AND up.date_of_birth IS NOT NULL
    `;
  }

  query += `
    GROUP BY ar.persona_profile->>'archetype'
    ORDER BY total_count DESC
    LIMIT :limit
  `;

  return sequelize.query(query, {
    replacements: { limit },
    type: sequelize.QueryTypes.SELECT
  });
};

/**
 * Execute user statistics query
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - User statistics
 */
const executeUserStatsQuery = async (userId) => {
  const [results] = await sequelize.query(`
    SELECT 
      COUNT(*) as total_analyses,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
      MAX(created_at) as latest_analysis
    FROM archive.analysis_results 
    WHERE user_id = :userId
  `, {
    replacements: { userId },
    type: sequelize.QueryTypes.SELECT
  });

  // Get most common archetype - optimized with index
  const [archetypeResult] = await sequelize.query(`
    SELECT
      persona_profile->>'archetype' as archetype,
      COUNT(*) as count
    FROM archive.analysis_results
    WHERE user_id = :userId
      AND status = 'completed'
      AND persona_profile IS NOT NULL
    GROUP BY persona_profile->>'archetype'
    ORDER BY count DESC
    LIMIT 1
  `, {
    replacements: { userId },
    type: sequelize.QueryTypes.SELECT
  });

  return {
    total_analyses: parseInt(results.total_analyses) || 0,
    completed: parseInt(results.completed) || 0,
    processing: parseInt(results.processing) || 0,
    failed: parseInt(results.failed) || 0,
    latest_analysis: results.latest_analysis,
    most_common_archetype: archetypeResult?.archetype || null
  };
};

module.exports = {
  buildDemographicFilters,
  executeDemographicAnalysis,
  buildPaginationParams,
  buildSortParams,
  executeArchetypeDistribution,
  executeUserStatsQuery
};
