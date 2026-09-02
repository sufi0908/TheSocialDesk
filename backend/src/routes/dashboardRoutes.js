const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireWorkspaceAccess } = require('../middleware/rbacMiddleware');

const router = express.Router();

router.use(authenticateToken);
router.use(requireWorkspaceAccess);

// GET /api/dashboard
router.get('/', dashboardController.getDashboard);

module.exports = router;
