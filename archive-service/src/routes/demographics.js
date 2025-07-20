/**
 * Demographics Routes
 * Defines routes for demographic analytics and insights
 */

const express = require('express');
const demographicController = require('../controllers/demographicController');
const { authenticateService, requireServiceAuth } = require('../middleware/serviceAuth');

const router = express.Router();

// Apply service authentication middleware to all routes
router.use(authenticateService);

/**
 * GET /archive/demographics/overview
 * Get overall demographic overview (internal service only)
 */
router.get('/overview',
  requireServiceAuth,
  demographicController.getDemographicOverview
);

/**
 * GET /archive/demographics/archetype/:archetype
 * Get demographic insights for a specific archetype (internal service only)
 */
router.get('/archetype/:archetype',
  requireServiceAuth,
  demographicController.getArchetypeDemographics
);

/**
 * GET /archive/demographics/schools
 * Get school-based analytics (internal service only)
 * Query parameters:
 * - school: Optional school name filter
 */
router.get('/schools',
  requireServiceAuth,
  demographicController.getSchoolAnalytics
);

/**
 * GET /archive/demographics/optimized
 * Get optimized demographic insights using composite indexes (internal service only)
 * Query parameters:
 * - gender: Filter by gender
 * - ageMin: Minimum age
 * - ageMax: Maximum age
 * - schoolOrigin: Filter by school origin
 * - archetype: Filter by archetype
 * - limit: Result limit (default: 100)
 */
router.get('/optimized',
  requireServiceAuth,
  demographicController.getOptimizedDemographics
);

/**
 * GET /archive/demographics/trends
 * Get demographic trends over time (internal service only)
 * Query parameters:
 * - period: Time period (day, week, month, year)
 * - limit: Number of periods to include
 */
router.get('/trends',
  requireServiceAuth,
  demographicController.getDemographicTrends
);

/**
 * GET /archive/demographics/performance
 * Get query performance metrics (internal service only)
 */
router.get('/performance',
  requireServiceAuth,
  demographicController.getPerformanceMetrics
);

module.exports = router;
