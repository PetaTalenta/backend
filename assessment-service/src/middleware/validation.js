const logger = require('../utils/logger');
const { sendValidationError } = require('../utils/responseHelper');

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

module.exports = {
  validateSchema
};
