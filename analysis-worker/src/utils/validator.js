/**
 * Data validation utilities
 */

const Joi = require('joi');
const logger = require('./logger');
const { personaProfileSchema } = require('../schemas/personaProfile');

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

// Schema for persona profile validation - Now imported from personaProfile.js for consistency

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
