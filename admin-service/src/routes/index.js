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

module.exports = router;

