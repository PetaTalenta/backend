const express = require('express');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const { authenticateToken, authenticateInternalService } = require('../middleware/auth');
const { validateBody, schemas } = require('../middleware/validation');

const router = express.Router();

// Public routes (no authentication required)
router.post('/register',
  validateBody(schemas.register),
  authController.register
);

router.post('/register/batch',
  authController.registerBatch
);

router.post('/login',
  validateBody(schemas.login),
  authController.login
);

// Protected routes (authentication required)
router.get('/profile',
  authenticateToken,
  userController.getProfile
);

router.put('/profile',
  authenticateToken,
  validateBody(schemas.updateProfile),
  userController.updateProfile
);

router.delete('/profile',
  authenticateToken,
  userController.deleteProfile
);

router.delete('/account',
  authenticateToken,
  userController.deleteAccount
);

router.post('/change-password',
  authenticateToken,
  validateBody(schemas.changePassword),
  authController.changePassword
);

router.post('/logout',
  authenticateToken,
  authController.logout
);

router.get('/token-balance',
  authenticateToken,
  userController.getTokenBalance
);

// School-related routes (moved from profile routes)
router.get('/schools',
  authenticateToken,
  userController.getSchools
);

router.post('/schools',
  authenticateToken,
  validateBody(schemas.createSchool),
  userController.createSchool
);



// Internal service routes (internal authentication required)
router.post('/verify-token', 
  validateBody(schemas.verifyToken),
  authController.verifyUserToken
);

router.put('/token-balance',
  authenticateInternalService,
  validateBody(schemas.tokenBalance),
  userController.updateTokenBalance
);



module.exports = router;
