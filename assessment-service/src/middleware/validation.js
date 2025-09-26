const Joi = require('joi');
const logger = require('../utils/logger');
const { sendValidationError, sendError } = require('../utils/responseHelper');

/**
 * Middleware for validating request body against a Joi schema
 * @param {Object} schema - Joi schema to validate against
 * @param {String} source - Request property to validate ('body', 'query', 'params')
 * @returns {Function} - Express middleware function
 */
const validateSchema = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = {};

      // Format validation errors
      error.details.forEach(detail => {
        const path = detail.path.join('.');
        details[path] = detail.message;
      });

      logger.warn('Validation error', {
        source,
        errors: details,
        userId: req.user?.id,
        url: req.originalUrl
      });

      return sendValidationError(res, 'Validation failed', details);
    }

    // Replace request data with validated data
    req[source] = value;

    next();
  };
};

/**
 * Enhanced validation middleware with data transformation and centralized business logic
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @returns {Function} - Express middleware function
 */
const validateAndTransformAssessment = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors = {};
      error.details.forEach(detail => {
        const field = detail.path.join('.');
        validationErrors[field] = detail.message;
      });

      logger.warn('Assessment validation failed', {
        errors: validationErrors,
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return sendError(res, 'VALIDATION_ERROR', 'Assessment data validation failed', validationErrors, 400);
    }

    // Transform legacy format to new format if needed
    if (value.riasec || value.ocean || value.viaIs) {
      // Legacy format detected - transform to new format
      const transformedData = {
        assessment_name: value.assessmentName || 'AI-Driven Talent Mapping',
        assessment_data: {
          riasec: value.riasec,
          ocean: value.ocean,
          viaIs: value.viaIs,
          industryScore: value.industryScore
        },
        raw_responses: value.rawResponses || {}
      };

      // Add metadata about transformation
      transformedData.assessment_data._metadata = {
        format: 'legacy_transformed',
        transformedAt: new Date().toISOString(),
        originalSchema: 'v1'
      };

      req.body = transformedData;
      req.isLegacyFormat = true;
    } else {
      // New format - add metadata
      if (!value.assessment_data._metadata) {
        value.assessment_data._metadata = {
          format: 'generic',
          receivedAt: new Date().toISOString(),
          schema: 'v2'
        };
      }

      req.body = value;
      req.isLegacyFormat = false;
    }

    // Additional business validation
    try {
      validateBusinessRules(req.body);
    } catch (businessError) {
      logger.warn('Business validation failed', {
        error: businessError.message,
        userId: req.user?.id,
        assessmentName: req.body.assessment_name
      });

      return sendError(res, 'BUSINESS_VALIDATION_ERROR', businessError.message, {}, 400);
    }

    logger.info('Assessment validation successful', {
      userId: req.user?.id,
      assessmentName: req.body.assessment_name,
      isLegacyFormat: req.isLegacyFormat,
      dataSize: JSON.stringify(req.body.assessment_data).length
    });

    next();
  };
};

/**
 * Centralized business rules validation
 * @param {Object} assessmentData - Validated assessment data
 * @throws {Error} - If business rules are violated
 */
const validateBusinessRules = (assessmentData) => {
  const { assessment_name, assessment_data, raw_responses } = assessmentData;

  // Rule 1: Assessment data cannot be empty
  if (!assessment_data || Object.keys(assessment_data).length === 0) {
    throw new Error('Assessment data cannot be empty');
  }

  // Rule 2: For AI-Driven Talent Mapping, ensure minimum required data
  if (assessment_name === 'AI-Driven Talent Mapping') {
    const requiredFields = ['riasec', 'ocean', 'viaIs'];
    const missingFields = requiredFields.filter(field => !assessment_data[field]);

    if (missingFields.length > 0) {
      throw new Error(`AI-Driven Talent Mapping requires: ${missingFields.join(', ')}`);
    }
  }

  // Rule 3: Raw responses should match assessment data structure if provided
  if (raw_responses && Object.keys(raw_responses).length > 0) {
    const assessmentTypes = Object.keys(assessment_data).filter(key => !key.startsWith('_'));
    const rawResponseTypes = Object.keys(raw_responses);

    // Check if raw responses have corresponding assessment data
    const orphanedResponses = rawResponseTypes.filter(type => !assessmentTypes.includes(type));
    if (orphanedResponses.length > 0) {
      logger.warn('Raw responses found without corresponding assessment data', {
        orphanedTypes: orphanedResponses,
        assessmentTypes,
        rawResponseTypes
      });
    }
  }

  // Rule 4: Data size limits
  const dataSize = JSON.stringify(assessment_data).length;
  const MAX_DATA_SIZE = 1024 * 1024; // 1MB limit

  if (dataSize > MAX_DATA_SIZE) {
    throw new Error(`Assessment data too large: ${dataSize} bytes (max: ${MAX_DATA_SIZE} bytes)`);
  }
};

module.exports = {
  validateSchema,
  validateAndTransformAssessment,
  validateBusinessRules
};
