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
const assessmentDataSchema = Joi.object().unknown(true);

// Career recommendation schema
const careerRecommendationSchema = Joi.object({
  careerName: Joi.string().required(),
  careerProspect: Joi.object({
    jobAvailability: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required(),
    salaryPotential: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required(),
    careerProgression: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required(),
    industryGrowth: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required(),
    skillDevelopment: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required()
  }).required()
});

// Persona profile schema
const personaProfileSchema = Joi.object({
  archetype: Joi.string().required(),
  shortSummary: Joi.string().required(),
  strengths: Joi.array().items(Joi.string()).min(3).max(5).required(),
  weaknesses: Joi.array().items(Joi.string()).min(3).max(5).required(),
  careerRecommendation: Joi.array().items(careerRecommendationSchema).min(3).max(5).required(),
  insights: Joi.array().items(Joi.string()).min(3).max(5).required(),
  workEnvironment: Joi.string().required(),
  roleModel: Joi.array().items(Joi.string()).min(4).max(5).required()
}).required();

// Create analysis result schema
// Note: assessment_data validation is simplified since it's already validated in assessment-service
const createAnalysisResultSchema = Joi.object({
  user_id: uuidSchema,
  assessment_data: assessmentDataSchema.optional(),
  persona_profile: personaProfileSchema.allow(null), // Allow null for failed analyses
  status: Joi.string().valid('completed', 'processing', 'failed').default('completed'),
  error_message: Joi.string().optional(), // Error message for failed analyses
  assessment_name: assessmentNameSchema.optional()
});

// Update analysis result schema
const updateAnalysisResultSchema = Joi.object({
  persona_profile: personaProfileSchema.allow(null).optional(),
  status: Joi.string().valid('completed', 'processing', 'failed').optional(),
  error_message: Joi.string().optional(),
  assessment_name: assessmentNameSchema.optional()
}).min(1);

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
