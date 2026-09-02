const express = require('express');
const searchController = require('../controllers/searchController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireWorkspaceAccess } = require('../middleware/rbacMiddleware');

const router = express.Router();

router.use(authenticateToken);
router.use(requireWorkspaceAccess);

// Search Route
router.get('/', searchController.globalSearch);

module.exports = router;
