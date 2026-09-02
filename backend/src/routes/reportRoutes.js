const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireRole, requireWorkspaceAccess } = require('../middleware/rbacMiddleware');

const router = express.Router();

// Enforce authentication & workspace isolation
router.use(authenticateToken);
router.use(requireWorkspaceAccess);
router.use(requireRole('superadmin', 'workspace_manager', 'team_member'));

// Full aggregated report
router.get('/', reportController.getReports);

// Individual report sections
router.get('/overview', reportController.getOverview);
router.get('/team-workload', reportController.getTeamWorkload);
router.get('/project-progress', reportController.getProjectProgress);
router.get('/task-completion', reportController.getTaskCompletion);
router.get('/content-status', reportController.getContentStatus);
router.get('/approval-status', reportController.getApprovalStatus);
router.get('/deadline-status', reportController.getDeadlineStatus);
router.get('/client-summary', reportController.getClientSummary);

module.exports = router;
