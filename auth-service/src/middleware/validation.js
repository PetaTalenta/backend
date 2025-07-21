const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Validate request body against schema
 * @param {Object} schema - Joi schema
 * @returns {Function} Express middleware
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => detail.message);
      
      logger.warn('Request validation failed', {
        path: req.path,
        method: req.method,
        errors: errorDetails
      });

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errorDetails
        }
      });
    }

    // Replace request body with validated value
    req.body = value;
    next();
  };
};

// Validation schemas
const schemas = {
  // User registration schema
  register: Joi.object({
    email: Joi.string().email().required().max(255)
      .messages({
        'string.email': 'Email must be a valid email address',
        'string.empty': 'Email is required',
        'string.max': 'Email must be at most 255 characters long',
        'any.required': 'Email is required'
      }),
    password: Joi.string().min(8).required()
      .pattern(/[a-zA-Z]/).pattern(/[0-9]/)
      .messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one letter and one number',
        'any.required': 'Password is required'
      })
  }),

  // User login schema
  login: Joi.object({
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Email must be a valid email address',
        'string.empty': 'Email is required',
        'any.required': 'Email is required'
      }),
    password: Joi.string().required()
      .messages({
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
      })
  }),

  // Change password schema
  changePassword: Joi.object({
    currentPassword: Joi.string().required()
      .messages({
        'string.empty': 'Current password is required',
        'any.required': 'Current password is required'
      }),
    newPassword: Joi.string().min(8).required()
      .pattern(/[a-zA-Z]/).pattern(/[0-9]/)
      .messages({
        'string.empty': 'New password is required',
        'string.min': 'New password must be at least 8 characters long',
        'string.pattern.base': 'New password must contain at least one letter and one number',
        'any.required': 'New password is required'
      })
  }),

  // Update profile schema (unified for users and admins)
  updateProfile: Joi.object({
    username: Joi.string().alphanum().min(3).max(100)
      .messages({
        'string.alphanum': 'Username must contain only alphanumeric characters',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username must be at most 100 characters long'
      }),
    email: Joi.string().email().max(255)
      .messages({
        'string.email': 'Email must be a valid email address',
        'string.max': 'Email must be at most 255 characters long'
      }),
    full_name: Joi.string().max(100)
      .messages({
        'string.max': 'Full name must be at most 100 characters long'
      }),

    school_id: Joi.number().integer().positive()
      .messages({
        'number.base': 'School ID must be a number',
        'number.integer': 'School ID must be an integer',
        'number.positive': 'School ID must be a positive number'
      }),
    date_of_birth: Joi.date().iso().max('now')
      .messages({
        'date.base': 'Date of birth must be a valid date',
        'date.format': 'Date of birth must be in ISO format (YYYY-MM-DD)',
        'date.max': 'Date of birth cannot be in the future'
      }),
    gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say')
      .messages({
        'any.only': 'Gender must be one of: male, female, other, prefer_not_to_say'
      })
  }),

  // Token balance update schema
  tokenBalance: Joi.object({
    userId: Joi.string().uuid().required()
      .messages({
        'string.empty': 'User ID is required',
        'string.uuid': 'User ID must be a valid UUID',
        'any.required': 'User ID is required'
      }),
    amount: Joi.number().integer().required()
      .messages({
        'number.base': 'Amount must be a number',
        'number.integer': 'Amount must be an integer',
        'any.required': 'Amount is required'
      }),
    operation: Joi.string().valid('add', 'subtract').required()
      .messages({
        'string.empty': 'Operation is required',
        'any.only': 'Operation must be either "add" or "subtract"',
        'any.required': 'Operation is required'
      })
  }),

  // Verify token schema
  verifyToken: Joi.object({
    token: Joi.string().required()
      .messages({
        'string.empty': 'Token is required',
        'any.required': 'Token is required'
      })
  }),

  // Admin registration schema
  adminRegister: Joi.object({
    username: Joi.string().alphanum().min(3).max(100).required()
      .messages({
        'string.alphanum': 'Username must contain only alphanumeric characters',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username must be at most 100 characters long',
        'string.empty': 'Username is required',
        'any.required': 'Username is required'
      }),
    email: Joi.string().email().required().max(255)
      .messages({
        'string.email': 'Email must be a valid email address',
        'string.empty': 'Email is required',
        'string.max': 'Email must be at most 255 characters long',
        'any.required': 'Email is required'
      }),
    password: Joi.string().min(8).max(128).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password must be at most 128 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
      }),
    full_name: Joi.string().max(255).optional()
      .messages({
        'string.max': 'Full name must be at most 255 characters long'
      }),
    user_type: Joi.string().valid('admin', 'superadmin', 'moderator').default('admin')
      .messages({
        'any.only': 'User type must be one of: admin, superadmin, moderator'
      })
  }),

  // Admin login schema
  adminLogin: Joi.object({
    username: Joi.string().required()
      .messages({
        'string.empty': 'Username or email is required',
        'any.required': 'Username or email is required'
      }),
    password: Joi.string().required()
      .messages({
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
      })
  }),



  // Admin change password schema (same as regular change password)
  adminChangePassword: Joi.object({
    currentPassword: Joi.string().required()
      .messages({
        'string.empty': 'Current password is required',
        'any.required': 'Current password is required'
      }),
    newPassword: Joi.string().min(8).required()
      .pattern(/[a-zA-Z]/).pattern(/[0-9]/)
      .messages({
        'string.empty': 'New password is required',
        'string.min': 'New password must be at least 8 characters long',
        'string.pattern.base': 'New password must contain at least one letter and one number',
        'any.required': 'New password is required'
      })
  }),

  // Admin update profile schema (uses same as updateProfile)
  adminUpdateProfile: Joi.object({
    username: Joi.string().alphanum().min(3).max(100)
      .messages({
        'string.alphanum': 'Username must contain only alphanumeric characters',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username must be at most 100 characters long'
      }),
    email: Joi.string().email().max(255)
      .messages({
        'string.email': 'Email must be a valid email address',
        'string.max': 'Email must be at most 255 characters long'
      }),
    full_name: Joi.string().max(100)
      .messages({
        'string.max': 'Full name must be at most 100 characters long'
      })
  }),

  // School creation schema
  createSchool: Joi.object({
    name: Joi.string().max(200).required()
      .messages({
        'string.empty': 'School name is required',
        'string.max': 'School name must be at most 200 characters long',
        'any.required': 'School name is required'
      }),
    address: Joi.string().optional(),
    city: Joi.string().max(100).optional()
      .messages({
        'string.max': 'City must be at most 100 characters long'
      }),
    province: Joi.string().max(100).optional()
      .messages({
        'string.max': 'Province must be at most 100 characters long'
      })
  })
};

module.exports = {
  validateBody,
  schemas
};
