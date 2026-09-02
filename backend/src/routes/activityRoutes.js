const express = require('express');
const activityController = require('../controllers/activityController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireWorkspaceAccess } = require('../middleware/rbacMiddleware');

const router = express.Router();

router.use(authenticateToken);
router.use(requireWorkspaceAccess);

// Activity Log Routes
router.get('/', activityController.listActivities);

module.exports = router;
