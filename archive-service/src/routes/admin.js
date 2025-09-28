const express = require('express');
const adminUserController = require('../controllers/adminUserController');
const { authenticateAdmin, requireAdminRole } = require('../middleware/adminAuth');
const { authenticateService } = require('../middleware/serviceAuth');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation');
const {
  logUserListView,
  logUserView,
  logTokenBalanceUpdate,
  logUserDeletion,
  logProfileUpdate
} = require('../middleware/activityLogger');
const Joi = require('joi');

const router = express.Router();

// Apply service authentication middleware to all routes
router.use(authenticateService);

// Validation schemas
const updateTokenBalanceSchema = Joi.object({
  token_balance: Joi.number().integer().min(0).required()
    .messages({
      'number.base': 'Token balance must be a number',
      'number.integer': 'Token balance must be an integer',
      'number.min': 'Token balance must be non-negative',
      'any.required': 'Token balance is required'
    }),
  action: Joi.string().valid('set', 'add', 'subtract').default('set')
    .messages({
      'any.only': 'Action must be one of: set, add, subtract'
    })
});

const queryParamsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow('').default(''),
  sortBy: Joi.string().valid('email', 'token_balance', 'created_at', 'updated_at').default('created_at'),
  sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC')
});

const uuidParamSchema = Joi.object({
  userId: Joi.string().uuid().required()
    .messages({
      'string.uuid': 'User ID must be a valid UUID',
      'any.required': 'User ID is required'
    })
});

const updateUserProfileSchema = Joi.object({
  full_name: Joi.string().min(1).max(100).allow(null).optional()
    .messages({
      'string.min': 'Full name must be at least 1 character',
      'string.max': 'Full name must not exceed 100 characters'
    }),
  date_of_birth: Joi.date().iso().max('now').allow(null).optional()
    .messages({
      'date.max': 'Date of birth must be in the past'
    }),
  gender: Joi.string().valid('male', 'female').allow(null).optional()
    .messages({
      'any.only': 'Gender must be either male or female'
    }),
  school_id: Joi.number().integer().positive().allow(null).optional()
    .messages({
      'number.integer': 'School ID must be an integer',
      'number.positive': 'School ID must be positive'
    })
}).min(1)
  .messages({
    'object.min': 'At least one field must be provided for update'
  });

// Validation middleware is now imported from '../middleware/validation'

/**
 * GET /admin/users
 * Get all users with pagination and filtering
 * Requires: admin authentication
 */
router.get('/users',
  authenticateAdmin,
  validateQuery(queryParamsSchema),
  logUserListView(),
  adminUserController.getAllUsers
);

/**
 * GET /admin/users/:userId
 * Get user by ID with detailed information
 * Requires: admin authentication
 */
router.get('/users/:userId',
  authenticateAdmin,
  validateParams(uuidParamSchema),
  logUserView(),
  adminUserController.getUserById
);

/**
 * PUT /admin/users/:userId/profile
 * Update user profile information
 * Requires: admin authentication
 */
router.put('/users/:userId/profile',
  authenticateAdmin,
  validateParams(uuidParamSchema),
  validateBody(updateUserProfileSchema),
  logProfileUpdate(),
  adminUserController.updateUserProfile
);

/**
 * PUT /admin/users/:userId/token-balance
 * Update user token balance
 * Requires: admin authentication
 */
router.put('/users/:userId/token-balance',
  authenticateAdmin,
  validateParams(uuidParamSchema),
  validateBody(updateTokenBalanceSchema),
  logTokenBalanceUpdate(),
  adminUserController.updateUserTokenBalance
);

/**
 * DELETE /admin/users/:userId
 * Delete user (soft delete)
 * Requires: admin authentication with admin or superadmin role
 */
router.delete('/users/:userId',
  authenticateAdmin,
  requireAdminRole(['admin', 'superadmin']),
  validateParams(uuidParamSchema),
  logUserDeletion(),
  adminUserController.deleteUser
);

module.exports = router;
