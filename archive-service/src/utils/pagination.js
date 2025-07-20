/**
 * Pagination Utilities
 */

/**
 * Parse and validate pagination parameters
 * @param {Object} query - Query parameters
 * @returns {Object} - Parsed pagination options
 */
const parsePaginationParams = (query) => {
  const defaultPageSize = parseInt(process.env.DEFAULT_PAGE_SIZE) || 10;
  const maxPageSize = parseInt(process.env.MAX_PAGE_SIZE) || 100;
  
  let page = parseInt(query.page) || 1;
  let limit = parseInt(query.limit) || defaultPageSize;
  
  // Validate page
  if (page < 1) {
    page = 1;
  }
  
  // Validate limit
  if (limit < 1) {
    limit = defaultPageSize;
  }
  if (limit > maxPageSize) {
    limit = maxPageSize;
  }
  
  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
};

/**
 * Create pagination metadata
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @param {Number} total - Total items
 * @returns {Object} - Pagination metadata
 */
const createPaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total: parseInt(total),
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};

/**
 * Format paginated response
 * @param {Array} data - Data array
 * @param {Object} pagination - Pagination metadata
 * @returns {Object} - Formatted response
 */
const formatPaginatedResponse = (data, pagination) => {
  return {
    success: true,
    data: {
      results: data,
      pagination
    }
  };
};

module.exports = {
  parsePaginationParams,
  createPaginationMeta,
  formatPaginatedResponse
};
