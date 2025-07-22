/**
 * Data validation utilities
 */

const Joi = require('joi');
const logger = require('./logger');

// Schema for job message validation - simplified to only validate message structure
// Assessment data validation is already done in assessment-service
const jobMessageSchema = Joi.object({
  jobId: Joi.string().uuid().required(),
  userId: Joi.string().uuid().required(),
  userEmail: Joi.string().email().required(),
  assessmentData: Joi.object().required(), // Trust that assessment-service already validated this
  assessmentName: Joi.string().valid('AI-Driven Talent Mapping', 'AI-Based IQ Test', 'Custom Assessment').default('AI-Driven Talent Mapping').optional(),
  timestamp: Joi.string().isoDate().required(),
  retryCount: Joi.number().min(0).default(0)
});

// Schema for persona profile validation - Updated to match personaProfile.js schema
const personaProfileSchema = Joi.object({
  archetype: Joi.string().required()
    .description('Nama archetype yang paling sesuai dengan persona'),

  shortSummary: Joi.string().required()
    .description('Ringkasan singkat tentang persona (1-2 paragraf)'),

  strengthSummary: Joi.string().required()
    .description('Ringkasan kekuatan utama persona (1 paragraf)'),

  strengths: Joi.array().items(Joi.string()).min(3).max(5).required()
    .description('Daftar kekuatan/strength dari persona'),

  weaknessSummary: Joi.string().required()
    .description('Ringkasan kelemahan utama persona (1 paragraf)'),

  weaknesses: Joi.array().items(Joi.string()).min(3).max(5).required()
    .description('Daftar kelemahan/weakness dari persona'),

  careerRecommendation: Joi.array().items(
    Joi.object({
      careerName: Joi.string().required()
        .description('Nama karir atau profesi yang direkomendasikan'),
      careerProspect: Joi.object({
        jobAvailability: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required()
          .description('Sejauh mana lapangan pekerjaan tersedia di bidang tersebut'),
        salaryPotential: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required()
          .description('Potensi pendapatan dari profesi tersebut'),
        careerProgression: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required()
          .description('Peluang naik jabatan atau spesialisasi di bidang tersebut'),
        industryGrowth: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required()
          .description('Pertumbuhan industri terkait profesi ini di masa depan'),
        skillDevelopment: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required()
          .description('Peluang mengembangkan keahlian di profesi ini')
      }).required()
    })
  ).min(3).max(5).required()
    .description('Daftar rekomendasi karir yang sesuai dengan persona'),

  insights: Joi.array().items(Joi.string()).min(3).max(5).required()
    .description('Daftar insight atau saran pengembangan diri'),

  skillSuggestion: Joi.array().items(Joi.string()).min(3).max(5).required()
    .description('Rekomendasi pengembangan skill jangka pendek dan menengah'),

  possiblePitfalls: Joi.array().items(Joi.string()).min(2).max(5).required()
    .description('Kesalahan atau jebakan karir yang perlu diwaspadai'),

  riskTolerance: Joi.string().valid('very high', 'high', 'moderate', 'low', 'very low').required()
    .description('Seberapa tinggi toleransi risiko persona dalam karir dan pekerjaan'),

  workEnvironment: Joi.string().required()
    .description('Deskripsi lingkungan kerja yang ideal untuk persona'),

  roleModel: Joi.array().items(Joi.string()).min(2).max(3).required()
    .description('Daftar role model yang relevan dan inspiratif')

}).required();

/**
 * Validate job message
 * @param {Object} message - Job message to validate
 * @returns {Object} - Validation result
 */
const validateJobMessage = (message) => {
  try {
    const { error, value } = jobMessageSchema.validate(message, { abortEarly: false });
    
    if (error) {
      logger.error('Job message validation failed', {
        jobId: message.jobId,
        errors: error.details.map(detail => detail.message)
      });
      
      return {
        isValid: false,
        error: error.details.map(detail => detail.message).join(', '),
        value: null
      };
    }
    
    return {
      isValid: true,
      error: null,
      value
    };
  } catch (validationError) {
    logger.error('Error during job message validation', {
      error: validationError.message
    });
    
    return {
      isValid: false,
      error: validationError.message,
      value: null
    };
  }
};

/**
 * Validate persona profile
 * @param {Object} profile - Persona profile to validate
 * @returns {Object} - Validation result
 */
const validatePersonaProfile = (profile) => {
  try {
    const { error, value } = personaProfileSchema.validate(profile, { abortEarly: false });
    
    if (error) {
      logger.error('Persona profile validation failed', {
        errors: error.details.map(detail => detail.message)
      });
      
      return {
        isValid: false,
        error: error.details.map(detail => detail.message).join(', '),
        value: null
      };
    }
    
    return {
      isValid: true,
      error: null,
      value
    };
  } catch (validationError) {
    logger.error('Error during persona profile validation', {
      error: validationError.message
    });
    
    return {
      isValid: false,
      error: validationError.message,
      value: null
    };
  }
};

module.exports = {
  validateJobMessage,
  validatePersonaProfile
};
