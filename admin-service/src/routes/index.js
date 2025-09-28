const express = require('express');
const Joi = require('joi');
const { adminProxy, usersProxy, tokenProxy } = require('../services/proxy');

const router = express.Router();

// Admin auth (proxy to auth-service)
router.post('/admin/login', (req, res) => adminProxy('/admin/login', { method: 'POST', body: req.body }, req, res));
router.get('/admin/profile', (req, res) => adminProxy('/admin/profile', { method: 'GET', headers: { authorization: req.headers.authorization } }, req, res));
router.put('/admin/profile', (req, res) => adminProxy('/admin/profile', { method: 'PUT', body: req.body, headers: { authorization: req.headers.authorization } }, req, res));
router.post('/admin/logout', (req, res) => adminProxy('/admin/logout', { method: 'POST', headers: { authorization: req.headers.authorization } }, req, res));

// Users management (proxy to archive-service admin)
router.get('/users', (req, res) => usersProxy('/archive/admin/users', { method: 'GET', query: req.query, headers: { authorization: req.headers.authorization } }, req, res));
router.get('/users/:userId', (req, res) => usersProxy(`/archive/admin/users/${req.params.userId}`, { method: 'GET', headers: { authorization: req.headers.authorization } }, req, res));
router.put('/users/:userId/profile', (req, res) => usersProxy(`/archive/admin/users/${req.params.userId}/profile`, { method: 'PUT', body: req.body, headers: { authorization: req.headers.authorization } }, req, res));
router.delete('/users/:userId', (req, res) => usersProxy(`/archive/admin/users/${req.params.userId}`, { method: 'DELETE', headers: { authorization: req.headers.authorization } }, req, res));

// Token operations
// Preferred path: via auth-service internal /auth/token-balance
const tokenBalanceSchema = Joi.object({
  operation: Joi.string().valid('add', 'subtract', 'set').required(),
  amount: Joi.number().integer().min(0).required()
});

router.post('/users/:userId/token-balance', async (req, res) => {
  const { error, value } = tokenBalanceSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message } });
  const { userId } = req.params;
  const { operation, amount } = value;
  return tokenProxy('/auth/token-balance', { method: 'PUT', body: { userId, amount, operation } }, req, res);
});

// Optional path B: via archive-service admin (supports set/add/subtract)
const archiveBalanceSchema = Joi.object({
  token_balance: Joi.number().integer().min(0).required(),
  action: Joi.string().valid('set', 'add', 'subtract').default('set')
});
router.put('/users/:userId/token-balance/archive', (req, res) => {
  const { error, value } = archiveBalanceSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message } });
  const { userId } = req.params;
  return usersProxy(`/archive/admin/users/${userId}/token-balance`, { method: 'PUT', body: value, headers: { authorization: req.headers.authorization } }, req, res);
});

// ===== PHASE 2: SYSTEM MONITORING & ANALYTICS =====

// Global statistics
router.get('/stats/global', (req, res) => usersProxy('/archive/admin/stats/global', { method: 'GET', headers: { authorization: req.headers.authorization } }, req, res));

// Job monitoring
router.get('/jobs/monitor', (req, res) => usersProxy('/archive/admin/jobs/monitor', { method: 'GET', headers: { authorization: req.headers.authorization } }, req, res));

// Queue status
router.get('/jobs/queue', (req, res) => usersProxy('/archive/admin/jobs/queue', { method: 'GET', headers: { authorization: req.headers.authorization } }, req, res));

// ===== PHASE 3: DEEP ANALYTICS & ASSESSMENT DETAILS =====

// Daily analytics
router.get('/analytics/daily', (req, res) => usersProxy('/archive/admin/analytics/daily', { method: 'GET', query: req.query, headers: { authorization: req.headers.authorization } }, req, res));

// Assessment details
router.get('/assessments/:resultId/details', (req, res) => usersProxy(`/archive/admin/assessments/${req.params.resultId}/details`, { method: 'GET', headers: { authorization: req.headers.authorization } }, req, res));

// Assessment search
router.get('/assessments/search', (req, res) => usersProxy('/archive/admin/assessments/search', { method: 'GET', query: req.query, headers: { authorization: req.headers.authorization } }, req, res));

// ===== PHASE 4: ADVANCED JOB MANAGEMENT =====

// Cancel job
router.post('/jobs/:jobId/cancel', (req, res) => usersProxy(`/archive/admin/jobs/${req.params.jobId}/cancel`, { method: 'POST', headers: { authorization: req.headers.authorization } }, req, res));

// Retry job
router.post('/jobs/:jobId/retry', (req, res) => usersProxy(`/archive/admin/jobs/${req.params.jobId}/retry`, { method: 'POST', headers: { authorization: req.headers.authorization } }, req, res));

// Bulk job operations
router.post('/jobs/bulk', (req, res) => usersProxy('/archive/admin/jobs/bulk', { method: 'POST', body: req.body, headers: { authorization: req.headers.authorization } }, req, res));

// ===== PHASE 4: PERFORMANCE OPTIMIZATION =====

// Performance report
router.get('/performance/report', (req, res) => usersProxy('/archive/admin/performance/report', { method: 'GET', headers: { authorization: req.headers.authorization } }, req, res));

// Database optimization
router.post('/performance/optimize', (req, res) => usersProxy('/archive/admin/performance/optimize', { method: 'POST', headers: { authorization: req.headers.authorization } }, req, res));

// ===== PHASE 4: SECURITY ENHANCEMENTS =====

// Security audit report
router.get('/security/audit', (req, res) => usersProxy('/archive/admin/security/audit', { method: 'GET', headers: { authorization: req.headers.authorization } }, req, res));

// GDPR data anonymization
router.post('/security/anonymize/:userId', (req, res) => usersProxy(`/archive/admin/security/anonymize/${req.params.userId}`, { method: 'POST', headers: { authorization: req.headers.authorization } }, req, res));

module.exports = router;

