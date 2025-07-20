const express = require('express');
const { verifyToken, verifyInternalService, verifyAdmin } = require('../middleware/auth');
const { authLimiter, assessmentLimiter, adminLimiter } = require('../middleware/rateLimiter');
const { authServiceProxy, archiveServiceProxy, assessmentServiceProxy } = require('../middleware/proxy');

const router = express.Router();

/**
 * API Gateway Routes Configuration
 * 
 * Route Structure:
 * /api/auth/* -> Auth Service
 * /api/admin/* -> Auth Service (Admin endpoints)
 * /api/archive/* -> Archive Service
 * /api/assessment/* -> Assessment Service
 */

// ===== AUTH SERVICE ROUTES =====

// Public auth endpoints (no authentication required)
router.use('/auth/register', authLimiter, authServiceProxy);
router.use('/auth/register/batch', authLimiter, authServiceProxy);
router.use('/auth/login', authLimiter, authServiceProxy);

// Internal service endpoints
router.use('/auth/verify-token', verifyInternalService, authServiceProxy);
router.use('/auth/token-balance', verifyInternalService, authServiceProxy);

// Protected user endpoints
router.use('/auth/logout', verifyToken, authServiceProxy);
router.use('/auth/change-password', verifyToken, authServiceProxy);
router.use('/auth/profile', verifyToken, authServiceProxy);
router.use('/auth/token-balance', verifyToken, authServiceProxy);

// School endpoints (protected)
router.use('/auth/schools', verifyToken, authServiceProxy);

// Additional school endpoints
router.use('/auth/schools/by-location', verifyToken, authServiceProxy);
router.use('/auth/schools/location-stats', verifyToken, authServiceProxy);
router.use('/auth/schools/distribution', verifyToken, authServiceProxy);

// ===== ADMIN ROUTES =====

// Admin authentication
router.use('/admin/login', authLimiter, authServiceProxy);

// Protected admin endpoints
router.use('/admin/profile', verifyToken, verifyAdmin, adminLimiter, authServiceProxy);

// ===== ARCHIVE SERVICE ROUTES =====

// Analysis Results endpoints
router.use('/archive/results', verifyToken, archiveServiceProxy);

// Analysis Jobs endpoints
router.use('/archive/jobs', verifyToken, archiveServiceProxy);

// Additional archive endpoints
router.use('/archive/jobs/stats', verifyToken, archiveServiceProxy);

// Internal service endpoints for archive
router.use('/archive/batch', verifyInternalService, archiveServiceProxy);

// Development endpoints (if enabled)
if (process.env.NODE_ENV === 'development') {
  router.use('/archive/dev', verifyInternalService, archiveServiceProxy);
}

// ===== ASSESSMENT SERVICE ROUTES =====

// Assessment submission (protected + rate limited)
router.use('/assessment/submit', verifyToken, assessmentLimiter, assessmentServiceProxy);

// Internal callback endpoints
router.use('/assessment/callback/completed', verifyInternalService, assessmentServiceProxy);
router.use('/assessment/callback/failed', verifyInternalService, assessmentServiceProxy);
router.use('/assessment/callback', verifyInternalService, assessmentServiceProxy);

// Development endpoints (if enabled)
if (process.env.NODE_ENV === 'development') {
  router.use('/assessment/test', assessmentServiceProxy);
}

// ===== CATCH-ALL ROUTES =====

// Health endpoints for individual services
router.use('/auth/health', authServiceProxy);
router.use('/archive/health', archiveServiceProxy);
router.use('/assessment/health', assessmentServiceProxy);

// Fallback for any other routes to respective services
router.use('/auth/*', authServiceProxy);
router.use('/admin/*', authServiceProxy);
router.use('/archive/*', archiveServiceProxy);
router.use('/assessment/*', assessmentServiceProxy);

module.exports = router;
