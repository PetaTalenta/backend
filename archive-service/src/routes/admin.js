const express = require('express');
const adminUserController = require('../controllers/adminUserController');
const { authenticateAdmin, requireAdminRole } = require('../middleware/adminAuth');
const { authenticateService } = require('../middleware/serviceAuth');
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

// Validation middleware
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query validation failed',
          details: errorDetails
        }
      });
    }

    req.query = value;
    next();
  };
};

const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Parameter validation failed',
          details: errorDetails
        }
      });
    }

    req.params = value;
    next();
  };
};

const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Body validation failed',
          details: errorDetails
        }
      });
    }

    req.body = value;
    next();
  };
};

/**
 * GET /admin/users
 * Get all users with pagination and filtering
 * Requires: admin authentication
 */
router.get('/users',
  authenticateAdmin,
  validateQuery(queryParamsSchema),
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
  adminUserController.getUserById
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
  adminUserController.deleteUser
);

module.exports = router;
