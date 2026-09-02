const express = require('express');
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

// Admin-controlled user creation (Protected endpoint)
router.post('/create', authenticateToken, userController.createUser);

// Profile Avatar routes
router.post('/me/avatar', authenticateToken, upload.single('file'), userController.uploadAvatar);
router.delete('/me/avatar', authenticateToken, userController.removeAvatar);
router.get('/:id/avatar', userController.getAvatar);

module.exports = router;

