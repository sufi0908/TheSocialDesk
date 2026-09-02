const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Keep credential and reset-token endpoints resistant to brute-force attempts.
const passwordOperationLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 10,
	standardHeaders: 'draft-7',
	legacyHeaders: false,
	message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

// Public Authentication Routes
router.post('/login', passwordOperationLimiter, authController.login);
router.post('/logout', authenticateToken, authController.logout);
router.post('/forgot-password', passwordOperationLimiter, authController.forgotPassword);
router.post('/reset-password', passwordOperationLimiter, authController.resetPassword);

// Protected Authentication Routes
router.get('/me', authenticateToken, authController.getCurrentUser);
router.post('/change-password', passwordOperationLimiter, authenticateToken, authController.changePassword);
router.post('/change-pass', passwordOperationLimiter, authenticateToken, authController.changePassword);

module.exports = router;
