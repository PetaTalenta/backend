/**
 * Statistics Routes
 * Defines routes for statistics and analytics
 */

const express = require('express');
const statsController = require('../controllers/statsController');
const { authenticateToken } = require('../middleware/auth');
const { authenticateService, requireServiceAuth } = require('../middleware/serviceAuth');

const router = express.Router();

// Apply service authentication middleware to all routes
router.use(authenticateService);

/**
 * GET /archive/stats
 * Get statistics for authenticated user
 */
router.get('/',
  authenticateToken,
  statsController.getUserStats
);

/**
 * GET /archive/stats/overview
 * Get overview statistics for authenticated user (frontend accessible)
 */
router.get('/overview',
  authenticateToken,
  statsController.getUserOverview
);

/**
 * GET /archive/stats/summary
 * Get summary statistics (internal service only)
 */
router.get('/summary',
  requireServiceAuth,
  statsController.getSummaryStats
);

module.exports = router;
