const express = require('express');
const superadminController = require('../controllers/superadminController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/rbacMiddleware');

const router = express.Router();

// Enforce authentication & Superadmin role on all routes in this router
router.use(authenticateToken);
router.use(requireRole('superadmin'));

// Workspace Creation & Management
router.post('/workspaces', superadminController.createWorkspace);
router.get('/workspaces', superadminController.listWorkspaces);
router.get('/workspaces/:id', superadminController.getWorkspace);
router.get('/workspaces/:id/team', superadminController.getWorkspaceTeam);
router.put('/workspaces/:id', superadminController.updateWorkspace);
router.patch('/workspaces/:id/status', superadminController.updateWorkspaceStatus);
router.delete('/workspaces/:id', superadminController.deleteWorkspace);

// Workspace Initial Manager Creation & Retrieval
router.post('/workspaces/:workspaceId/manager', superadminController.createWorkspaceManager);
router.get('/workspaces/:id/manager', superadminController.getWorkspaceManager);

// Workspace Managers Directory
router.get('/managers', superadminController.listManagers);

// Global SaaS Metrics / Analytics
router.get('/analytics', superadminController.getMetrics);

// Manager Account Updates & Status Control
router.put('/users/:id', superadminController.updateUser);
router.patch('/users/:id/status', superadminController.updateUserStatus);
router.post('/users/:id/reset-password', superadminController.resetManagerPassword);
router.post('/managers/:id/reset-password', superadminController.resetManagerPassword);

module.exports = router;
