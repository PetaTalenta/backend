const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticateAdminToken, requireAdminRole } = require('../middleware/auth');
const { validateBody, schemas } = require('../middleware/validation');

const router = express.Router();

// Public admin routes (no authentication required)
router.post('/login', 
  validateBody(schemas.adminLogin),
  adminController.login
);

// Protected admin routes (admin authentication required)
router.get('/profile', 
  authenticateAdminToken,
  adminController.getProfile
);

router.put('/profile', 
  authenticateAdminToken,
  validateBody(schemas.adminUpdateProfile),
  adminController.updateProfile
);

router.post('/change-password', 
  authenticateAdminToken,
  validateBody(schemas.adminChangePassword),
  adminController.changePassword
);

router.post('/logout', 
  authenticateAdminToken,
  adminController.logout
);

// Superadmin only routes
router.post('/register', 
  authenticateAdminToken,
  requireAdminRole('superadmin'),
  validateBody(schemas.adminRegister),
  adminController.register
);

module.exports = router;
