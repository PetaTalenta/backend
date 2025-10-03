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

/**
 * Cursor-based Pagination Implementation
 * Phase 2.1: Replace OFFSET/LIMIT with cursor-based pagination for 70-90% faster performance
 */

/**
 * Encode cursor from object
 * @param {Object} obj - Object to encode
 * @returns {String} - Base64 encoded cursor
 */
const encodeCursor = (obj) => {
  if (!obj) return null;
  return Buffer.from(JSON.stringify(obj)).toString('base64');
};

/**
 * Decode cursor to object
 * @param {String} cursor - Base64 encoded cursor
 * @returns {Object} - Decoded object
 */
const decodeCursor = (cursor) => {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString());
  } catch (error) {
    return null;
  }
};

/**
 * Parse cursor pagination parameters
 * @param {Object} query - Query parameters
 * @returns {Object} - Parsed cursor pagination options
 */
const parseCursorParams = (query) => {
  const defaultLimit = parseInt(process.env.DEFAULT_PAGE_SIZE) || 10;
  const maxLimit = parseInt(process.env.MAX_PAGE_SIZE) || 100;

  let limit = parseInt(query.limit) || defaultLimit;

  // Validate limit
  if (limit < 1) {
    limit = defaultLimit;
  }
  if (limit > maxLimit) {
    limit = maxLimit;
  }

  const cursor = query.cursor || null;
  const orderBy = query.orderBy || 'created_at';
  const orderDirection = (query.orderDirection || 'DESC').toUpperCase();

  return {
    cursor,
    limit,
    orderBy,
    orderDirection,
    decodedCursor: decodeCursor(cursor)
  };
};

/**
 * Create cursor pagination metadata
 * @param {Array} data - Data array
 * @param {Object} options - Pagination options
 * @returns {Object} - Cursor pagination metadata
 */
const createCursorMeta = (data, options) => {
  const { limit, orderBy, orderDirection } = options;

  const hasMore = data.length > limit;
  const results = hasMore ? data.slice(0, limit) : data;

  let nextCursor = null;
  let prevCursor = null;

  if (results.length > 0) {
    // Create next cursor from last item
    if (hasMore) {
      const lastItem = results[results.length - 1];
      nextCursor = encodeCursor({
        [orderBy]: lastItem[orderBy],
        id: lastItem.id
      });
    }

    // Create previous cursor from first item
    const firstItem = results[0];
    prevCursor = encodeCursor({
      [orderBy]: firstItem[orderBy],
      id: firstItem.id
    });
  }

  return {
    limit,
    orderBy,
    orderDirection,
    hasMore,
    nextCursor,
    prevCursor,
    count: results.length
  };
};

/**
 * Build cursor-based WHERE clause
 * @param {Object} decodedCursor - Decoded cursor object
 * @param {String} orderBy - Order by field
 * @param {String} orderDirection - Order direction (ASC/DESC)
 * @returns {Object} - Sequelize WHERE clause
 */
const buildCursorWhere = (decodedCursor, orderBy, orderDirection) => {
  if (!decodedCursor) return {};

  const { Op } = require('sequelize');
  const cursorValue = decodedCursor[orderBy];
  const cursorId = decodedCursor.id;

  if (orderDirection === 'DESC') {
    return {
      [Op.or]: [
        { [orderBy]: { [Op.lt]: cursorValue } },
        {
          [Op.and]: [
            { [orderBy]: cursorValue },
            { id: { [Op.lt]: cursorId } }
          ]
        }
      ]
    };
  } else {
    return {
      [Op.or]: [
        { [orderBy]: { [Op.gt]: cursorValue } },
        {
          [Op.and]: [
            { [orderBy]: cursorValue },
            { id: { [Op.gt]: cursorId } }
          ]
        }
      ]
    };
  }
};

/**
 * Cursor-based pagination class
 */
class CursorPagination {
  /**
   * Paginate using cursor-based approach
   * @param {Object} model - Sequelize model
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} - Paginated results
   */
  static async paginate(model, options = {}) {
    const {
      where = {},
      include = [],
      attributes,
      cursor,
      limit = 10,
      orderBy = 'created_at',
      orderDirection = 'DESC'
    } = options;

    const decodedCursor = decodeCursor(cursor);
    const cursorWhere = buildCursorWhere(decodedCursor, orderBy, orderDirection);

    // Combine WHERE clauses
    const { Op } = require('sequelize');
    const finalWhere = Object.keys(cursorWhere).length > 0
      ? { [Op.and]: [where, cursorWhere] }
      : where;

    // Fetch one extra item to check if there are more results
    const results = await model.findAll({
      where: finalWhere,
      include,
      attributes,
      order: [[orderBy, orderDirection], ['id', orderDirection]],
      limit: limit + 1,
      raw: false
    });

    const pagination = createCursorMeta(results, {
      limit,
      orderBy,
      orderDirection
    });

    return {
      results: pagination.hasMore ? results.slice(0, limit) : results,
      pagination
    };
  }
}

/**
 * Format cursor-based paginated response
 * @param {Array} data - Data array
 * @param {Object} pagination - Cursor pagination metadata
 * @returns {Object} - Formatted response
 */
const formatCursorResponse = (data, pagination) => {
  return {
    success: true,
    data: {
      results: data,
      pagination
    }
  };
};

module.exports = {
  // Legacy pagination
  parsePaginationParams,
  createPaginationMeta,
  formatPaginatedResponse,

  // Cursor-based pagination
  CursorPagination,
  parseCursorParams,
  createCursorMeta,
  formatCursorResponse,
  encodeCursor,
  decodeCursor,
  buildCursorWhere
};
