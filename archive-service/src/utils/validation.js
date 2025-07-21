/**
 * Validation Schemas using Joi
 */

const Joi = require('joi');

// UUID validation pattern
const uuidSchema = Joi.string().uuid().required();

// Assessment name validation
const assessmentNameSchema = Joi.string()
  .valid('AI-Driven Talent Mapping', 'AI-Based IQ Test', 'Custom Assessment')
  .default('AI-Driven Talent Mapping');

// Assessment data schema - simplified since validation is already done in assessment-service
// We trust that the data coming from analysis-worker is already validated
// But we add some basic security checks
const assessmentDataSchema = Joi.object().unknown(true).custom((value, helpers) => {
  // Security check: remove any potentially dangerous fields
  if (value && typeof value === 'object') {
    const dangerousFields = ['password', 'token', 'secret', 'key', 'auth', '__proto__', 'constructor'];
    const cleanedValue = { ...value };

    dangerousFields.forEach(field => {
      if (field in cleanedValue) {
        delete cleanedValue[field];
      }
    });

    return cleanedValue;
  }
  return value;
});

// Career recommendation schema with enhanced validation
const careerRecommendationSchema = Joi.object({
  careerName: Joi.string().trim().min(1).max(100).required()
    .messages({
      'string.empty': 'Career name cannot be empty',
      'string.max': 'Career name must be at most 100 characters',
      'any.required': 'Career name is required'
    }),
  careerProspect: Joi.object({
    jobAvailability: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required()
      .messages({
        'any.only': 'Job availability must be one of: super high, high, moderate, low, super low',
        'any.required': 'Job availability is required'
      }),
    salaryPotential: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required()
      .messages({
        'any.only': 'Salary potential must be one of: super high, high, moderate, low, super low',
        'any.required': 'Salary potential is required'
      }),
    careerProgression: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required()
      .messages({
        'any.only': 'Career progression must be one of: super high, high, moderate, low, super low',
        'any.required': 'Career progression is required'
      }),
    industryGrowth: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required()
      .messages({
        'any.only': 'Industry growth must be one of: super high, high, moderate, low, super low',
        'any.required': 'Industry growth is required'
      }),
    skillDevelopment: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required()
      .messages({
        'any.only': 'Skill development must be one of: super high, high, moderate, low, super low',
        'any.required': 'Skill development is required'
      })
  }).required()
    .messages({
      'any.required': 'Career prospect is required'
    })
});

// Persona profile schema with enhanced validation and sanitization
const personaProfileSchema = Joi.object({
  archetype: Joi.string().trim().min(1).max(100).required()
    .messages({
      'string.empty': 'Archetype cannot be empty',
      'string.max': 'Archetype must be at most 100 characters',
      'any.required': 'Archetype is required'
    }),
  shortSummary: Joi.string().trim().min(10).max(1000).required()
    .messages({
      'string.empty': 'Short summary cannot be empty',
      'string.min': 'Short summary must be at least 10 characters',
      'string.max': 'Short summary must be at most 1000 characters',
      'any.required': 'Short summary is required'
    }),
  strengths: Joi.array().items(
    Joi.string().trim().min(1).max(200)
  ).min(3).max(5).required()
    .messages({
      'array.min': 'Must have at least 3 strengths',
      'array.max': 'Must have at most 5 strengths',
      'any.required': 'Strengths are required'
    }),
  weaknesses: Joi.array().items(
    Joi.string().trim().min(1).max(200)
  ).min(3).max(5).required()
    .messages({
      'array.min': 'Must have at least 3 weaknesses',
      'array.max': 'Must have at most 5 weaknesses',
      'any.required': 'Weaknesses are required'
    }),
  careerRecommendation: Joi.array().items(careerRecommendationSchema).min(3).max(5).required()
    .messages({
      'array.min': 'Must have at least 3 career recommendations',
      'array.max': 'Must have at most 5 career recommendations',
      'any.required': 'Career recommendations are required'
    }),
  insights: Joi.array().items(
    Joi.string().trim().min(1).max(500)
  ).min(3).max(5).required()
    .messages({
      'array.min': 'Must have at least 3 insights',
      'array.max': 'Must have at most 5 insights',
      'any.required': 'Insights are required'
    }),
  workEnvironment: Joi.string().trim().min(1).max(500).required()
    .messages({
      'string.empty': 'Work environment cannot be empty',
      'string.max': 'Work environment must be at most 500 characters',
      'any.required': 'Work environment is required'
    }),
  roleModel: Joi.array().items(
    Joi.string().trim().min(1).max(100)
  ).min(4).max(5).required()
    .messages({
      'array.min': 'Must have at least 4 role models',
      'array.max': 'Must have at most 5 role models',
      'any.required': 'Role models are required'
    })
}).required();

// Create analysis result schema with enhanced validation
const createAnalysisResultSchema = Joi.object({
  user_id: uuidSchema,
  assessment_data: assessmentDataSchema.optional(),
  persona_profile: personaProfileSchema.allow(null), // Allow null for failed analyses
  status: Joi.string().valid('completed', 'processing', 'failed').default('completed')
    .messages({
      'any.only': 'Status must be one of: completed, processing, failed'
    }),
  error_message: Joi.string().trim().max(2000).optional()
    .messages({
      'string.max': 'Error message must be at most 2000 characters'
    }),
  assessment_name: assessmentNameSchema.optional()
}).custom((value, helpers) => {
  // Business logic validation at schema level
  if (value.status === 'completed' && !value.persona_profile) {
    return helpers.error('custom.completedWithoutProfile');
  }

  if (value.status === 'failed' && !value.error_message) {
    return helpers.error('custom.failedWithoutError');
  }

  if (value.status === 'failed' && value.persona_profile) {
    // Auto-clean persona_profile for failed status
    value.persona_profile = null;
  }

  return value;
}).messages({
  'custom.completedWithoutProfile': 'Completed analysis must have persona_profile',
  'custom.failedWithoutError': 'Failed analysis must have error_message'
});

// Update analysis result schema with enhanced validation
const updateAnalysisResultSchema = Joi.object({
  persona_profile: personaProfileSchema.allow(null).optional(),
  status: Joi.string().valid('completed', 'processing', 'failed').optional()
    .messages({
      'any.only': 'Status must be one of: completed, processing, failed'
    }),
  error_message: Joi.string().trim().max(2000).optional()
    .messages({
      'string.max': 'Error message must be at most 2000 characters'
    }),
  assessment_name: assessmentNameSchema.optional(),
  // Explicitly forbid certain fields from being updated
  user_id: Joi.forbidden().messages({
    'any.unknown': 'Cannot update user_id'
  }),
  created_at: Joi.forbidden().messages({
    'any.unknown': 'Cannot update created_at'
  }),
  id: Joi.forbidden().messages({
    'any.unknown': 'Cannot update id'
  })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
}).custom((value, helpers) => {
  // Business logic validation for updates
  if (value.status === 'completed' && value.persona_profile === null) {
    return helpers.error('custom.completedWithoutProfile');
  }

  if (value.status === 'failed' && value.persona_profile && !value.error_message) {
    return helpers.error('custom.failedWithoutError');
  }

  return value;
}).messages({
  'custom.completedWithoutProfile': 'Cannot mark as completed without persona_profile',
  'custom.failedWithoutError': 'Failed status requires error_message'
});

// Query parameters schema for list results
const listResultsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid('completed', 'processing', 'failed').optional(),
  assessment_name: Joi.string().valid('AI-Driven Talent Mapping', 'AI-Based IQ Test', 'Custom Assessment').optional(),
  sort: Joi.string().valid('created_at', 'updated_at').default('created_at'),
  order: Joi.string().valid('asc', 'desc', 'ASC', 'DESC').default('desc')
});

// UUID parameter schema
const uuidParamSchema = Joi.object({
  id: uuidSchema
});

// Job ID parameter schema
const jobIdParamSchema = Joi.object({
  jobId: Joi.string().required()
});

// Create analysis job schema
const createAnalysisJobSchema = Joi.object({
  job_id: Joi.string().required(),
  user_id: uuidSchema,
  assessment_data: assessmentDataSchema.optional(),
  status: Joi.string().valid('queued', 'processing', 'completed', 'failed').default('queued'),
  assessment_name: assessmentNameSchema.optional()
});

// Update analysis job status schema
const updateAnalysisJobStatusSchema = Joi.object({
  status: Joi.string().valid('queued', 'processing', 'completed', 'failed').required(),
  result_id: uuidSchema.optional(),
  error_message: Joi.string().optional()
}).min(1);

// Query parameters schema for list jobs
const listJobsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid('queued', 'processing', 'completed', 'failed').optional(),
  assessment_name: Joi.string().valid('AI-Driven Talent Mapping', 'AI-Based IQ Test', 'Custom Assessment').optional(),
  sort: Joi.string().valid('created_at', 'updated_at').default('created_at'),
  order: Joi.string().valid('asc', 'desc', 'ASC', 'DESC').default('desc')
});

module.exports = {
  createAnalysisResultSchema,
  updateAnalysisResultSchema,
  listResultsQuerySchema,
  uuidParamSchema,
  jobIdParamSchema,
  createAnalysisJobSchema,
  updateAnalysisJobStatusSchema,
  listJobsQuerySchema,
  assessmentDataSchema,
  personaProfileSchema,
  assessmentNameSchema
};
