const express = require('express');
const collaborationController = require('../controllers/collaborationController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireWorkspaceAccess } = require('../middleware/rbacMiddleware');

const router = express.Router();

router.use(authenticateToken);
router.use(requireWorkspaceAccess);

// Standalone Comment Management
router.put('/:id', collaborationController.updateComment);
router.delete('/:id', collaborationController.deleteComment);

module.exports = router;
