const express = require('express');
const { verifyToken, verifyInternalService, verifyAdmin } = require('../middleware/auth');
const { authLimiter, assessmentLimiter, adminLimiter, archiveLimiter } = require('../middleware/rateLimiter');
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

// Internal token balance endpoint (for service-to-service communication)
router.put('/auth/token-balance', verifyInternalService, authServiceProxy);

// Protected user endpoints
router.use('/auth/logout', verifyToken, authServiceProxy);
router.use('/auth/change-password', verifyToken, authServiceProxy);

// Profile endpoints (all HTTP methods)
router.get('/auth/profile', verifyToken, authServiceProxy);
router.put('/auth/profile', verifyToken, authServiceProxy);
router.delete('/auth/profile', verifyToken, authServiceProxy);

// User token balance endpoint (for user queries)
router.get('/auth/token-balance', verifyToken, authServiceProxy);

// School endpoints (protected)
router.get('/auth/schools', verifyToken, authServiceProxy);
router.post('/auth/schools', verifyToken, authServiceProxy);

// Specific school endpoints (must come before general /auth/schools/* pattern)
router.get('/auth/schools/by-location', verifyToken, authServiceProxy);
router.get('/auth/schools/location-stats', verifyToken, authServiceProxy);
router.get('/auth/schools/distribution', verifyToken, authServiceProxy);

// School users endpoint (with parameter)
router.get('/auth/schools/:schoolId/users', verifyToken, authServiceProxy);

// ===== ADMIN ROUTES =====

// Admin authentication (public)
router.post('/admin/login', authLimiter, authServiceProxy);

// Protected admin endpoints
router.get('/admin/profile', verifyToken, verifyAdmin, adminLimiter, authServiceProxy);
router.put('/admin/profile', verifyToken, verifyAdmin, adminLimiter, authServiceProxy);
router.post('/admin/change-password', verifyToken, verifyAdmin, adminLimiter, authServiceProxy);
router.post('/admin/logout', verifyToken, verifyAdmin, adminLimiter, authServiceProxy);

// Superadmin only endpoints
router.post('/admin/register', verifyToken, verifyAdmin, adminLimiter, authServiceProxy);

// ===== ARCHIVE SERVICE ROUTES =====

// Specific endpoints first (most specific to least specific)

// Analysis Results endpoints - specific routes first
router.post('/archive/results/batch', verifyInternalService, archiveServiceProxy);
router.get('/archive/results/:id', verifyToken, archiveLimiter, archiveServiceProxy);
router.put('/archive/results/:id', verifyToken, archiveLimiter, archiveServiceProxy); // Can be user or service
router.delete('/archive/results/:id', verifyToken, archiveLimiter, archiveServiceProxy);
router.get('/archive/results', verifyToken, archiveLimiter, archiveServiceProxy);
router.post('/archive/results', verifyInternalService, archiveServiceProxy);

// Analysis Jobs endpoints - specific routes first
router.get('/archive/jobs/stats', verifyToken, archiveLimiter, archiveServiceProxy);
router.put('/archive/jobs/:jobId/status', verifyInternalService, archiveServiceProxy);
router.get('/archive/jobs/:jobId', verifyToken, archiveLimiter, archiveServiceProxy);
router.delete('/archive/jobs/:jobId', verifyToken, archiveLimiter, archiveServiceProxy);
router.get('/archive/jobs', verifyToken, archiveLimiter, archiveServiceProxy);
router.post('/archive/jobs', verifyInternalService, archiveServiceProxy);

// Batch processing endpoints (internal service only)
router.get('/archive/batch/stats', verifyInternalService, archiveServiceProxy);
router.post('/archive/batch/process', verifyInternalService, archiveServiceProxy);
router.post('/archive/batch/clear', verifyInternalService, archiveServiceProxy);

// Statistics endpoints
router.get('/archive/stats/summary', verifyInternalService, archiveServiceProxy);
router.get('/archive/stats/overview', verifyToken, archiveLimiter, archiveServiceProxy);
router.get('/archive/stats', verifyToken, archiveLimiter, archiveServiceProxy);

// Demographics endpoints (internal service only)
router.get('/archive/demographics/overview', verifyInternalService, archiveServiceProxy);
router.get('/archive/demographics/archetype/:archetype', verifyInternalService, archiveServiceProxy);
router.get('/archive/demographics/schools', verifyInternalService, archiveServiceProxy);
router.get('/archive/demographics/optimized', verifyInternalService, archiveServiceProxy);
router.get('/archive/demographics/trends', verifyInternalService, archiveServiceProxy);
router.get('/archive/demographics/performance', verifyInternalService, archiveServiceProxy);

// Metrics endpoints (internal service only)
router.get('/archive/metrics/health', archiveServiceProxy); // No auth required
router.get('/archive/metrics/database', verifyInternalService, archiveServiceProxy);
router.get('/archive/metrics/cache', verifyInternalService, archiveServiceProxy);
router.get('/archive/metrics/performance', verifyInternalService, archiveServiceProxy);
router.post('/archive/metrics/reset', verifyInternalService, archiveServiceProxy);
router.post('/archive/metrics/cache/invalidate', verifyInternalService, archiveServiceProxy);
router.get('/archive/metrics', verifyInternalService, archiveServiceProxy);

// Admin endpoints for archive service (admin authentication required)
router.get('/archive/admin/users/:userId', verifyToken, verifyAdmin, adminLimiter, archiveServiceProxy);
router.put('/archive/admin/users/:userId/token-balance', verifyToken, verifyAdmin, adminLimiter, archiveServiceProxy);
router.delete('/archive/admin/users/:userId', verifyToken, verifyAdmin, adminLimiter, archiveServiceProxy);
router.get('/archive/admin/users', verifyToken, verifyAdmin, adminLimiter, archiveServiceProxy);

// Unified API v1 endpoints
router.get('/archive/api/v1/stats', (req, res, next) => {
  // Flexible authentication based on type parameter
  const type = req.query.type || 'user';
  if (['system', 'demographic', 'performance'].includes(type)) {
    return verifyInternalService(req, res, next);
  } else {
    return verifyToken(req, res, () => {
      archiveLimiter(req, res, next);
    });
  }
}, archiveServiceProxy);

// Health endpoints (no authentication required)
router.get('/archive/health/detailed', archiveServiceProxy);
router.get('/archive/health', archiveServiceProxy);

// Development endpoints (if enabled)
if (process.env.NODE_ENV === 'development') {
  router.post('/archive/dev/create-user', verifyInternalService, archiveServiceProxy);
  router.use('/archive/dev', verifyInternalService, archiveServiceProxy);
}

// ===== DIRECT ACCESS ROUTES FOR ARCHIVE SERVICE =====
// These routes provide direct access without /archive prefix as mentioned in documentation

// Direct Results endpoints (for service-to-service communication)
router.post('/results/batch', verifyInternalService, archiveServiceProxy);
router.get('/results/:id', verifyInternalService, archiveServiceProxy);
router.put('/results/:id', verifyInternalService, archiveServiceProxy);
router.delete('/results/:id', verifyInternalService, archiveServiceProxy);
router.get('/results', verifyInternalService, archiveServiceProxy);
router.post('/results', verifyInternalService, archiveServiceProxy);

// Direct Jobs endpoints (for service-to-service communication)
router.get('/jobs/stats', verifyInternalService, archiveServiceProxy);
router.put('/jobs/:jobId/status', verifyInternalService, archiveServiceProxy);
router.get('/jobs/:jobId', verifyInternalService, archiveServiceProxy);
router.delete('/jobs/:jobId', verifyInternalService, archiveServiceProxy);
router.get('/jobs', verifyInternalService, archiveServiceProxy);
router.post('/jobs', verifyInternalService, archiveServiceProxy);

// ===== ASSESSMENT SERVICE ROUTES =====

// Root endpoint (service information)
router.get('/assessment', assessmentServiceProxy);

// Health endpoints (public)
router.get('/assessment/health', assessmentServiceProxy);
router.get('/assessment/health/ready', assessmentServiceProxy);
router.get('/assessment/health/live', assessmentServiceProxy);
router.get('/assessment/health/queue', assessmentServiceProxy);

// Assessment submission (protected + rate limited)
router.use('/assessment/submit', verifyToken, assessmentLimiter, assessmentServiceProxy);

// Assessment status check (protected)
router.use('/assessment/status', verifyToken, assessmentServiceProxy);

// Queue monitoring (protected)
router.use('/assessment/queue/status', verifyToken, assessmentServiceProxy);

// Idempotency endpoints (protected)
router.use('/assessment/idempotency/health', verifyToken, assessmentServiceProxy);
router.use('/assessment/idempotency/cleanup', verifyToken, assessmentServiceProxy);

// Internal callback endpoints
router.use('/assessment/callback/completed', verifyInternalService, assessmentServiceProxy);
router.use('/assessment/callback/failed', verifyInternalService, assessmentServiceProxy);
router.use('/assessment/callback', verifyInternalService, assessmentServiceProxy);

// Development endpoints (if enabled)
if (process.env.NODE_ENV === 'development') {
  router.post('/assessment/test/submit', assessmentServiceProxy);
  router.get('/assessment/test/status', assessmentServiceProxy);
  router.use('/assessment/test', assessmentServiceProxy); // Fallback for other test endpoints
}

// ===== HEALTH CHECK ROUTES =====

// Global health endpoints (no authentication required)
router.get('/health', authServiceProxy); // Main health check
router.get('/health/metrics', authServiceProxy); // Metrics endpoint
router.get('/health/ready', authServiceProxy); // Readiness probe
router.get('/health/live', authServiceProxy); // Liveness probe

// ===== CATCH-ALL ROUTES =====

// Health endpoints for individual services (these are already handled above, but kept for compatibility)
router.use('/auth/health', authServiceProxy);
router.use('/archive/health', archiveServiceProxy);
// Assessment health endpoints are handled specifically above

// Fallback for any other routes to respective services
router.use('/auth/*', authServiceProxy);
router.use('/admin/*', authServiceProxy);
router.use('/archive/*', archiveServiceProxy);
router.use('/assessment/*', assessmentServiceProxy);

module.exports = router;
