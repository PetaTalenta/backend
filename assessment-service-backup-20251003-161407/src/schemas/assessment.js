const Joi = require('joi');

// Raw responses schemas - Generic structure for any assessment type
const rawItem = Joi.object({
  questionId: Joi.string().pattern(/^[A-Z0-9\-_.:]+$/).required()
    .messages({ 'string.pattern.base': 'questionId format invalid' }),
  value: Joi.alternatives().try(
    Joi.number().min(0).max(100),
    Joi.string().max(1000),
    Joi.boolean()
  ).required()
    .messages({
      'alternatives.match': 'Answer value must be a number (0-100), string (max 1000 chars), or boolean',
      'any.required': 'Answer value is required'
    }),
  weight: Joi.number().optional(),
  meta: Joi.object().unknown(true).optional()
});

// Generic raw responses schema - can contain any assessment type
const rawResponsesSchema = Joi.object().pattern(
  Joi.string(), // assessment type key (e.g., 'riasec', 'ocean', 'custom_test')
  Joi.array().items(rawItem)
).optional();

// RIASEC Schema (6 dimensions)
const riasecSchema = Joi.object({
  realistic: Joi.number().integer().min(0).max(100).required()
    .messages({
      'number.base': 'Realistic score must be a number',
      'number.integer': 'Realistic score must be an integer',
      'number.min': 'Realistic score must be at least 0',
      'number.max': 'Realistic score must be at most 100',
      'any.required': 'Realistic score is required'
    }),
  investigative: Joi.number().integer().min(0).max(100).required()
    .messages({
      'number.base': 'Investigative score must be a number',
      'number.integer': 'Investigative score must be an integer',
      'number.min': 'Investigative score must be at least 0',
      'number.max': 'Investigative score must be at most 100',
      'any.required': 'Investigative score is required'
    }),
  artistic: Joi.number().integer().min(0).max(100).required()
    .messages({
      'number.base': 'Artistic score must be a number',
      'number.integer': 'Artistic score must be an integer',
      'number.min': 'Artistic score must be at least 0',
      'number.max': 'Artistic score must be at most 100',
      'any.required': 'Artistic score is required'
    }),
  social: Joi.number().integer().min(0).max(100).required()
    .messages({
      'number.base': 'Social score must be a number',
      'number.integer': 'Social score must be an integer',
      'number.min': 'Social score must be at least 0',
      'number.max': 'Social score must be at most 100',
      'any.required': 'Social score is required'
    }),
  enterprising: Joi.number().integer().min(0).max(100).required()
    .messages({
      'number.base': 'Enterprising score must be a number',
      'number.integer': 'Enterprising score must be an integer',
      'number.min': 'Enterprising score must be at least 0',
      'number.max': 'Enterprising score must be at most 100',
      'any.required': 'Enterprising score is required'
    }),
  conventional: Joi.number().integer().min(0).max(100).required()
    .messages({
      'number.base': 'Conventional score must be a number',
      'number.integer': 'Conventional score must be an integer',
      'number.min': 'Conventional score must be at least 0',
      'number.max': 'Conventional score must be at most 100',
      'any.required': 'Conventional score is required'
    })
});

// OCEAN Schema (5 dimensions)
const oceanSchema = Joi.object({
  openness: Joi.number().integer().min(0).max(100).required()
    .messages({
      'number.base': 'Openness score must be a number',
      'number.integer': 'Openness score must be an integer',
      'number.min': 'Openness score must be at least 0',
      'number.max': 'Openness score must be at most 100',
      'any.required': 'Openness score is required'
    }),
  conscientiousness: Joi.number().integer().min(0).max(100).required()
    .messages({
      'number.base': 'Conscientiousness score must be a number',
      'number.integer': 'Conscientiousness score must be an integer',
      'number.min': 'Conscientiousness score must be at least 0',
      'number.max': 'Conscientiousness score must be at most 100',
      'any.required': 'Conscientiousness score is required'
    }),
  extraversion: Joi.number().integer().min(0).max(100).required()
    .messages({
      'number.base': 'Extraversion score must be a number',
      'number.integer': 'Extraversion score must be an integer',
      'number.min': 'Extraversion score must be at least 0',
      'number.max': 'Extraversion score must be at most 100',
      'any.required': 'Extraversion score is required'
    }),
  agreeableness: Joi.number().integer().min(0).max(100).required()
    .messages({
      'number.base': 'Agreeableness score must be a number',
      'number.integer': 'Agreeableness score must be an integer',
      'number.min': 'Agreeableness score must be at least 0',
      'number.max': 'Agreeableness score must be at most 100',
      'any.required': 'Agreeableness score is required'
    }),
  neuroticism: Joi.number().integer().min(0).max(100).required()
    .messages({
      'number.base': 'Neuroticism score must be a number',
      'number.integer': 'Neuroticism score must be an integer',
      'number.min': 'Neuroticism score must be at least 0',
      'number.max': 'Neuroticism score must be at most 100',
      'any.required': 'Neuroticism score is required'
    })
});

// VIA-IS Schema (24 character strengths)
const viaIsSchema = Joi.object({
  creativity: Joi.number().integer().min(0).max(100).required(),
  curiosity: Joi.number().integer().min(0).max(100).required(),
  judgment: Joi.number().integer().min(0).max(100).required(),
  loveOfLearning: Joi.number().integer().min(0).max(100).required(),
  perspective: Joi.number().integer().min(0).max(100).required(),
  bravery: Joi.number().integer().min(0).max(100).required(),
  perseverance: Joi.number().integer().min(0).max(100).required(),
  honesty: Joi.number().integer().min(0).max(100).required(),
  zest: Joi.number().integer().min(0).max(100).required(),
  love: Joi.number().integer().min(0).max(100).required(),
  kindness: Joi.number().integer().min(0).max(100).required(),
  socialIntelligence: Joi.number().integer().min(0).max(100).required(),
  teamwork: Joi.number().integer().min(0).max(100).required(),
  fairness: Joi.number().integer().min(0).max(100).required(),
  leadership: Joi.number().integer().min(0).max(100).required(),
  forgiveness: Joi.number().integer().min(0).max(100).required(),
  humility: Joi.number().integer().min(0).max(100).required(),
  prudence: Joi.number().integer().min(0).max(100).required(),
  selfRegulation: Joi.number().integer().min(0).max(100).required(),
  appreciationOfBeauty: Joi.number().integer().min(0).max(100).required(),
  gratitude: Joi.number().integer().min(0).max(100).required(),
  hope: Joi.number().integer().min(0).max(100).required(),
  humor: Joi.number().integer().min(0).max(100).required(),
  spirituality: Joi.number().integer().min(0).max(100).required()
}).messages({
  'number.base': 'VIA-IS scores must be numbers',
  'number.integer': 'VIA-IS scores must be integers',
  'number.min': 'VIA-IS scores must be at least 0',
  'number.max': 'VIA-IS scores must be at most 100',
  'any.required': 'All 24 VIA-IS character strengths are required'
});

// Industry Score Schema (24 industries) - Optional for backward compatibility
const industryScoreSchema = Joi.object({
  teknologi: Joi.number().integer().min(0).max(100).optional(),
  kesehatan: Joi.number().integer().min(0).max(100).optional(),
  keuangan: Joi.number().integer().min(0).max(100).optional(),
  pendidikan: Joi.number().integer().min(0).max(100).optional(),
  rekayasa: Joi.number().integer().min(0).max(100).optional(),
  pemasaran: Joi.number().integer().min(0).max(100).optional(),
  hukum: Joi.number().integer().min(0).max(100).optional(),
  kreatif: Joi.number().integer().min(0).max(100).optional(),
  media: Joi.number().integer().min(0).max(100).optional(),
  penjualan: Joi.number().integer().min(0).max(100).optional(),
  sains: Joi.number().integer().min(0).max(100).optional(),
  manufaktur: Joi.number().integer().min(0).max(100).optional(),
  agrikultur: Joi.number().integer().min(0).max(100).optional(),
  pemerintahan: Joi.number().integer().min(0).max(100).optional(),
  konsultasi: Joi.number().integer().min(0).max(100).optional(),
  pariwisata: Joi.number().integer().min(0).max(100).optional(),
  logistik: Joi.number().integer().min(0).max(100).optional(),
  energi: Joi.number().integer().min(0).max(100).optional(),
  sosial: Joi.number().integer().min(0).max(100).optional(),
  olahraga: Joi.number().integer().min(0).max(100).optional(),
  properti: Joi.number().integer().min(0).max(100).optional(),
  kuliner: Joi.number().integer().min(0).max(100).optional(),
  perdagangan: Joi.number().integer().min(0).max(100).optional(),
  telekomunikasi: Joi.number().integer().min(0).max(100).optional()
}).messages({
  'number.base': 'Industry scores must be numbers',
  'number.integer': 'Industry scores must be integers',
  'number.min': 'Industry scores must be at least 0',
  'number.max': 'Industry scores must be at most 100'
});


// New Generic Assessment Schema - accepts any structured assessment data
const newAssessmentSchema = Joi.object({
  assessment_name: Joi.string()
    .valid('AI-Driven Talent Mapping', 'AI-Based IQ Test', 'Custom Assessment')
    .default('AI-Driven Talent Mapping')
    .messages({
      'string.base': 'Assessment name must be a string',
      'any.only': 'Assessment name must be one of: AI-Driven Talent Mapping, AI-Based IQ Test, Custom Assessment'
    }),
  assessment_data: Joi.object().required()
    .messages({
      'object.base': 'Assessment data must be an object',
      'any.required': 'Assessment data is required'
    }),
  raw_responses: rawResponsesSchema
    .messages({
      'object.base': 'Raw responses must be an object'
    })
}).messages({
  'object.base': 'Request body must be an object'
});

// Legacy Assessment Schema (RIASEC, OCEAN, VIA-IS + optional assessmentName + optional industryScore)
// Kept for backward compatibility
const legacyAssessmentSchema = Joi.object({
  riasec: riasecSchema.required().messages({
    'any.required': 'RIASEC assessment data is required'
  }),
  ocean: oceanSchema.required().messages({
    'any.required': 'OCEAN assessment data is required'
  }),
  viaIs: viaIsSchema.required().messages({
    'any.required': 'VIA-IS assessment data is required'
  }),
  assessmentName: Joi.string()
    .valid('AI-Driven Talent Mapping', 'AI-Based IQ Test', 'Custom Assessment')
    .optional()
    .messages({
      'string.base': 'Assessment name must be a string',
      'any.only': 'Assessment name must be one of: AI-Driven Talent Mapping, AI-Based IQ Test, Custom Assessment'
    }),
  industryScore: industryScoreSchema.optional().messages({
    'object.base': 'Industry score data must be an object'
  }),
  rawResponses: rawResponsesSchema,
  rawSchemaVersion: Joi.string().default('v1')
}).messages({
  'object.base': 'Assessment data must be an object',
  'any.required': 'All assessment components are required'
});

// Main assessment schema that tries new format first, then falls back to legacy
const assessmentSchema = Joi.alternatives().try(
  newAssessmentSchema,
  legacyAssessmentSchema
).messages({
  'alternatives.match': 'Request must match either new generic format (assessment_name, assessment_data, raw_responses) or legacy format'
});

module.exports = {
  assessmentSchema,
  newAssessmentSchema,
  legacyAssessmentSchema,
  riasecSchema,
  oceanSchema,
  viaIsSchema,
  industryScoreSchema,
  rawResponsesSchema
};
