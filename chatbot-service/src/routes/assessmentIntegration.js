const express = require('express');
const AssessmentIntegrationController = require('../controllers/assessmentIntegrationController');
const { validateBody, validateQuery, validateParams, schemas } = require('../middleware/validation');
const { authenticateToken, setUserContext } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const assessmentController = new AssessmentIntegrationController();

/**
 * Assessment Integration Routes
 * Handles assessment-to-chatbot integration endpoints
 */

/**
 * Create conversation from assessment
 * POST /from-assessment
 */
router.post('/from-assessment',
  (req, res, next) => {
    console.log('=== ROUTE REACHED: /from-assessment ===');
    console.log('Has user:', !!req.user);
    console.log('Has auth header:', !!req.headers.authorization);
    console.log('Auth header:', req.headers.authorization);
    logger.info('Route reached: /from-assessment', {
      hasUser: !!req.user,
      hasAuthHeader: !!req.headers.authorization,
      url: req.originalUrl
    });
    next();
  },
  authenticateToken,
  setUserContext,
  validateBody(schemas.createFromAssessment),
  async (req, res) => {
    try {
      logger.info('About to call createFromAssessment', {
        hasUser: !!req.user,
        userId: req.user?.id
      });
      await assessmentController.createFromAssessment(req, res);
    } catch (error) {
      logger.error('Route error: createFromAssessment', {
        error: error.message,
        userId: req.user?.id
      });
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);


/**
 * Check assessment readiness for user
 * GET /assessment-ready/:userId
 */
router.get('/assessment-ready/:userId',
  authenticateToken,
  setUserContext,
  validateParams(schemas.assessmentReadyParams),
  async (req, res) => {
    try {
      await assessmentController.checkAssessmentReady(req, res);
    } catch (error) {
      logger.error('Route error: checkAssessmentReady', {
        error: error.message,
        userId: req.params.userId
      });
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * Generate suggestions for conversation
 * GET /conversations/:conversationId/suggestions
 */
router.get('/conversations/:conversationId/suggestions',
  authenticateToken,
  setUserContext,
  validateParams(schemas.conversationSuggestionsParams),
  async (req, res) => {
    try {
      await assessmentController.getConversationSuggestions(req, res);
    } catch (error) {
      logger.error('Route error: getConversationSuggestions', {
        error: error.message,
        conversationId: req.params.conversationId,
        userId: req.user?.id
      });
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * Auto-initialize assessment conversation
 * POST /auto-initialize
 */
router.post('/auto-initialize',
  authenticateToken,
  setUserContext,
  async (req, res) => {
    try {
      await assessmentController.autoInitialize(req, res);
    } catch (error) {
      logger.error('Route error: autoInitialize', {
        error: error.message,
        userId: req.user?.id
      });
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);



module.exports = router;
