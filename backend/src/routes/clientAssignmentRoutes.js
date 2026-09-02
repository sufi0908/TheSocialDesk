const express = require('express');
const assignmentController = require('../controllers/assignmentController');
const workspaceUserController = require('../controllers/workspaceUserController');
const brandKitRoutes = require('./brandKitRoutes');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireRole, requireWorkspaceAccess } = require('../middleware/rbacMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(authenticateToken);
router.use(requireWorkspaceAccess);

// Brand Kit Sub-router
router.use('/:clientId/brand-kit', brandKitRoutes);

// Base Client Routes
router.get('/', workspaceUserController.listWorkspaceClients);
router.post('/', requireRole('superadmin', 'workspace_manager'), upload.single('logo'), workspaceUserController.createClient);
router.get('/:id', workspaceUserController.getWorkspaceClient);
router.put('/:id', requireRole('superadmin', 'workspace_manager'), upload.single('logo'), workspaceUserController.updateWorkspaceClient);
router.patch('/:id', requireRole('superadmin', 'workspace_manager'), upload.single('logo'), workspaceUserController.updateWorkspaceClient);
router.delete('/:id', requireRole('superadmin', 'workspace_manager'), workspaceUserController.deleteWorkspaceClient);
router.post('/:id/logo', requireRole('superadmin', 'workspace_manager'), upload.single('logo'), workspaceUserController.uploadClientLogo);
router.delete('/:id/logo', requireRole('superadmin', 'workspace_manager'), workspaceUserController.removeClientLogo);
router.patch('/:id/status', requireRole('superadmin', 'workspace_manager'), workspaceUserController.updateWorkspaceClientStatus);

// Client Sub-Resources
router.get('/:id/overview', workspaceUserController.getClientOverview);
router.get('/:id/content', workspaceUserController.getClientContent);
router.get('/:id/projects', workspaceUserController.getClientProjects);
router.get('/:id/tasks', workspaceUserController.getClientTasks);
router.get('/:id/assets', workspaceUserController.getClientAssets);

// GET Client Assigned Team Members
router.get('/:clientId/team', assignmentController.getClientTeam);

// POST / PUT Assign Team Member to Client (Managers only)
router.post('/:clientId/team', requireRole('superadmin', 'workspace_manager'), assignmentController.assignTeamMemberToClient);
router.put('/:clientId/team', requireRole('superadmin', 'workspace_manager'), assignmentController.assignTeamMemberToClient);

// DELETE Remove Team Member from Client (Managers only)
router.delete('/:clientId/team/:userId', requireRole('superadmin', 'workspace_manager'), assignmentController.removeTeamMemberFromClient);

module.exports = router;
