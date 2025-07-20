const Joi = require('joi');
const logger = require('./logger');

const analysisCompleteSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  jobId: Joi.string().uuid().required(),
  resultId: Joi.string().uuid().required(),
  status: Joi.string().valid('completed').required(),
  message: Joi.string().optional()
});

const analysisFailedSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  jobId: Joi.string().uuid().required(),
  error: Joi.string().required(),
  message: Joi.string().optional()
});

const validateNotification = (req, res, next) => {
  let schema;
  
  if (req.path === '/analysis-complete') {
    schema = analysisCompleteSchema;
  } else if (req.path === '/analysis-failed') {
    schema = analysisFailedSchema;
  } else {
    return next();
  }

  const { error, value } = schema.validate(req.body);

  if (error) {
    logger.warn('Notification validation failed', {
      path: req.path,
      error: error.details[0].message,
      body: req.body
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.details[0].message
      }
    });
  }

  req.body = value;
  next();
};

module.exports = { validateNotification };