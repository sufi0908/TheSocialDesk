const express = require('express');
const assignmentController = require('../controllers/assignmentController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireRole, requireWorkspaceAccess } = require('../middleware/rbacMiddleware');

const router = express.Router();

router.use(authenticateToken);
router.use(requireWorkspaceAccess);

// GET Project Members
router.get('/:projectId/members', assignmentController.getProjectMembers);

// POST Assign Member to Project (Managers only)
router.post('/:projectId/members', requireRole('superadmin', 'workspace_manager'), assignmentController.assignMemberToProject);

// DELETE Remove Member from Project (Managers only)
router.delete('/:projectId/members/:userId', requireRole('superadmin', 'workspace_manager'), assignmentController.removeMemberFromProject);

module.exports = router;
