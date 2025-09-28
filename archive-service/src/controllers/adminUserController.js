const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Get all users with pagination and filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getAllUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Build search condition
    let searchCondition = '';
    const replacements = {
      limit: limitNum,
      offset: offset
    };

    if (search) {
      searchCondition = `WHERE (email ILIKE :search OR id::text ILIKE :search)`;
      replacements.search = `%${search}%`;
    }

    // Build sort condition
    const allowedSortFields = ['email', 'token_balance', 'created_at', 'updated_at'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get users with pagination
    const usersQuery = `
      SELECT 
        id,
        email,
        token_balance,
        created_at,
        updated_at
      FROM auth.users
      ${searchCondition}
      ORDER BY ${sortField} ${sortDirection}
      LIMIT :limit OFFSET :offset
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM auth.users
      ${searchCondition}
    `;

    const users = await sequelize.query(usersQuery, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    const countResult = await sequelize.query(countQuery, {
      replacements: search ? { search: replacements.search } : {},
      type: sequelize.QueryTypes.SELECT
    });

    const total = parseInt(countResult[0].total);
    const totalPages = Math.ceil(total / limitNum);

    logger.info('Users retrieved successfully by admin', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      page: parseInt(page),
      limit: limitNum,
      total,
      search
    });

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total,
          totalPages,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const userQuery = `
      SELECT
        id,
        email,
        token_balance,
        created_at,
        updated_at
      FROM auth.users
      WHERE id = :userId
    `;

    const userResult = await sequelize.query(userQuery, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    const user = userResult[0];
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Get user profile information
    const profileQuery = `
      SELECT
        up.full_name,
        up.date_of_birth,
        up.gender,
        up.school_id,
        up.created_at as profile_created_at,
        up.updated_at as profile_updated_at,
        s.name as school_name,
        s.type as school_type,
        s.city as school_city,
        s.province as school_province
      FROM auth.user_profiles up
      LEFT JOIN archive.schools s ON up.school_id = s.id
      WHERE up.user_id = :userId
    `;

    const profileResult = await sequelize.query(profileQuery, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    const profile = profileResult[0] || null;

    // Get user's analysis results count
    const statsQuery = `
      SELECT
        COUNT(*) as total_analyses,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_analyses,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_analyses,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_analyses,
        MAX(created_at) as latest_analysis
      FROM archive.analysis_results
      WHERE user_id = :userId
    `;

    const statsResult = await sequelize.query(statsQuery, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    const stats = statsResult[0];

    // Get user's job statistics
    const jobStatsQuery = `
      SELECT
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_jobs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
        COUNT(CASE WHEN status = 'queued' THEN 1 END) as queued_jobs
      FROM archive.analysis_jobs
      WHERE user_id = :userId
    `;

    const jobStatsResult = await sequelize.query(jobStatsQuery, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    const jobStats = jobStatsResult[0];

    logger.info('User details retrieved by admin', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      userId,
      userEmail: user.email,
      hasProfile: !!profile
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          ...user,
          profile: profile ? {
            full_name: profile.full_name,
            date_of_birth: profile.date_of_birth,
            gender: profile.gender,
            school_id: profile.school_id,
            school: profile.school_id ? {
              id: profile.school_id,
              name: profile.school_name,
              type: profile.school_type,
              city: profile.school_city,
              province: profile.school_province
            } : null,
            profile_created_at: profile.profile_created_at,
            profile_updated_at: profile.profile_updated_at
          } : null,
          stats: {
            analyses: stats ? {
              total: parseInt(stats.total_analyses) || 0,
              completed: parseInt(stats.completed_analyses) || 0,
              processing: parseInt(stats.processing_analyses) || 0,
              failed: parseInt(stats.failed_analyses) || 0,
              latest_analysis: stats.latest_analysis
            } : {
              total: 0,
              completed: 0,
              processing: 0,
              failed: 0,
              latest_analysis: null
            },
            jobs: jobStats ? {
              total: parseInt(jobStats.total_jobs) || 0,
              completed: parseInt(jobStats.completed_jobs) || 0,
              processing: parseInt(jobStats.processing_jobs) || 0,
              failed: parseInt(jobStats.failed_jobs) || 0,
              queued: parseInt(jobStats.queued_jobs) || 0
            } : {
              total: 0,
              completed: 0,
              processing: 0,
              failed: 0,
              queued: 0
            }
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user token balance
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const updateUserTokenBalance = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { token_balance, action = 'set' } = req.body;

    // Validate token balance
    if (typeof token_balance !== 'number' || token_balance < 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Token balance must be a non-negative number'
        }
      });
    }

    // Check if user exists
    const checkUserQuery = `
      SELECT id, email, token_balance
      FROM auth.users
      WHERE id = :userId
    `;

    const existingUserResult = await sequelize.query(checkUserQuery, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    const existingUser = existingUserResult[0];
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    let newBalance;
    let updateQuery;

    if (action === 'add') {
      newBalance = existingUser.token_balance + token_balance;
      updateQuery = `
        UPDATE auth.users 
        SET token_balance = token_balance + :token_balance, updated_at = CURRENT_TIMESTAMP
        WHERE id = :userId
        RETURNING id, email, token_balance, updated_at
      `;
    } else if (action === 'subtract') {
      newBalance = Math.max(0, existingUser.token_balance - token_balance);
      updateQuery = `
        UPDATE auth.users 
        SET token_balance = GREATEST(0, token_balance - :token_balance), updated_at = CURRENT_TIMESTAMP
        WHERE id = :userId
        RETURNING id, email, token_balance, updated_at
      `;
    } else {
      // Default: set
      newBalance = token_balance;
      updateQuery = `
        UPDATE auth.users 
        SET token_balance = :token_balance, updated_at = CURRENT_TIMESTAMP
        WHERE id = :userId
        RETURNING id, email, token_balance, updated_at
      `;
    }

    const updatedUserResult = await sequelize.query(updateQuery, {
      replacements: { userId, token_balance },
      type: sequelize.QueryTypes.SELECT
    });

    const updatedUser = updatedUserResult[0];

    logger.info('User token balance updated by admin', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      userId,
      userEmail: updatedUser.email,
      action,
      previousBalance: existingUser.token_balance,
      newBalance: updatedUser.token_balance,
      changeAmount: token_balance
    });

    res.status(200).json({
      success: true,
      message: 'Token balance updated successfully',
      data: {
        user: updatedUser,
        change: {
          action,
          amount: token_balance,
          previousBalance: existingUser.token_balance,
          newBalance: updatedUser.token_balance
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user (soft delete by setting email to deleted state)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const checkUserQuery = `
      SELECT id, email
      FROM auth.users
      WHERE id = :userId
    `;

    const existingUserResult2 = await sequelize.query(checkUserQuery, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    const existingUser2 = existingUserResult2[0];
    if (!existingUser2) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Soft delete by updating email to include deleted timestamp
    const deleteQuery = `
      UPDATE auth.users 
      SET 
        email = CONCAT('deleted_', EXTRACT(EPOCH FROM NOW())::bigint, '_', email),
        token_balance = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = :userId
      RETURNING id, email, updated_at
    `;

    const deletedUserResult = await sequelize.query(deleteQuery, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    const deletedUser = deletedUserResult[0];

    logger.warn('User deleted by admin', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      userId,
      originalEmail: existingUser2.email,
      newEmail: deletedUser.email
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: {
        deletedUser: {
          id: deletedUser.id,
          originalEmail: existingUser2.email,
          deletedAt: deletedUser.updated_at
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const updateUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { full_name, date_of_birth, gender, school_id } = req.body;

    // Check if user exists
    const checkUserQuery = `
      SELECT id, email
      FROM auth.users
      WHERE id = :userId
    `;

    const existingUserResult = await sequelize.query(checkUserQuery, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    const existingUser = existingUserResult[0];
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Validate school_id if provided
    if (school_id) {
      const schoolQuery = `
        SELECT id FROM archive.schools WHERE id = :schoolId
      `;
      const schoolResult = await sequelize.query(schoolQuery, {
        replacements: { schoolId: school_id },
        type: sequelize.QueryTypes.SELECT
      });

      if (schoolResult.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SCHOOL',
            message: 'School not found'
          }
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth;
    if (gender !== undefined) updateData.gender = gender;
    if (school_id !== undefined) updateData.school_id = school_id;

    // If no data to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_UPDATE_DATA',
          message: 'No profile data provided for update'
        }
      });
    }

    // Check if profile exists, create if not
    const checkProfileQuery = `
      SELECT user_id FROM auth.user_profiles WHERE user_id = :userId
    `;
    const profileExists = await sequelize.query(checkProfileQuery, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    let updatedProfile;
    if (profileExists.length === 0) {
      // Create new profile
      const createProfileQuery = `
        INSERT INTO auth.user_profiles (user_id, full_name, date_of_birth, gender, school_id, created_at, updated_at)
        VALUES (:userId, :full_name, :date_of_birth, :gender, :school_id, NOW(), NOW())
        RETURNING *
      `;

      const createResult = await sequelize.query(createProfileQuery, {
        replacements: {
          userId,
          full_name: updateData.full_name || null,
          date_of_birth: updateData.date_of_birth || null,
          gender: updateData.gender || null,
          school_id: updateData.school_id || null
        },
        type: sequelize.QueryTypes.SELECT
      });

      updatedProfile = createResult[0];
    } else {
      // Update existing profile
      const setParts = [];
      const replacements = { userId };

      Object.keys(updateData).forEach(key => {
        setParts.push(`${key} = :${key}`);
        replacements[key] = updateData[key];
      });

      const updateProfileQuery = `
        UPDATE auth.user_profiles
        SET ${setParts.join(', ')}, updated_at = NOW()
        WHERE user_id = :userId
        RETURNING *
      `;

      const updateResult = await sequelize.query(updateProfileQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      updatedProfile = updateResult[0];
    }

    logger.info('User profile updated by admin', {
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      userId,
      userEmail: existingUser.email,
      updatedFields: Object.keys(updateData)
    });

    res.status(200).json({
      success: true,
      message: 'User profile updated successfully',
      data: {
        profile: updatedProfile,
        updatedFields: Object.keys(updateData)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserTokenBalance,
  deleteUser,
  updateUserProfile
};
