const express = require('express');
const projectController = require('../controllers/projectController');
const assignmentController = require('../controllers/assignmentController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireRole, requireWorkspaceAccess } = require('../middleware/rbacMiddleware');

const router = express.Router();

router.use(authenticateToken);
router.use(requireWorkspaceAccess);

// Project CRUD Endpoints
router.post('/', requireRole('superadmin', 'workspace_manager'), projectController.createProject);
router.get('/', projectController.listProjects);
router.get('/:id', projectController.getProject);
router.put('/:id', requireRole('superadmin', 'workspace_manager'), projectController.updateProject);
router.patch('/:id/status', requireRole('superadmin', 'workspace_manager'), projectController.updateProjectStatus);

// Project Members Assignment Endpoints
router.get('/:projectId/members', assignmentController.getProjectMembers);
router.post('/:projectId/members', requireRole('superadmin', 'workspace_manager'), assignmentController.assignMemberToProject);
router.delete('/:projectId/members/:userId', requireRole('superadmin', 'workspace_manager'), assignmentController.removeMemberFromProject);

module.exports = router;
