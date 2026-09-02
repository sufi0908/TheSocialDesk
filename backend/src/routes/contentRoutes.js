const express = require('express');
const contentController = require('../controllers/contentController');
const collaborationController = require('../controllers/collaborationController');
const approvalController = require('../controllers/approvalController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireRole, requireWorkspaceAccess } = require('../middleware/rbacMiddleware');

const router = express.Router();

router.use(authenticateToken);
router.use(requireWorkspaceAccess);

// Content CRUD & Management Endpoints
router.post('/', contentController.createContent);
router.get('/', contentController.listContent);
router.get('/:id', contentController.getContent);
router.put('/:id', contentController.updateContent);
router.patch('/:id/status', contentController.updateContentStatus);
router.delete('/:id', requireRole('superadmin', 'workspace_manager'), contentController.deleteContent);

// --- CONTENT VERSIONING ENDPOINTS ---
router.post('/:id/versions', collaborationController.createVersion);
router.get('/:id/versions', collaborationController.listVersions);
router.get('/:id/versions/:versionId', collaborationController.getVersion);
router.post('/:id/versions/:versionId/restore', collaborationController.restoreVersion);

// --- CONTENT COMMENTS ENDPOINTS ---
router.post('/:id/comments', collaborationController.createComment);
router.get('/:id/comments', collaborationController.listComments);

// --- CONTENT APPROVAL WORKFLOW ENDPOINTS ---
router.post('/:id/submit-internal-review', approvalController.submitInternalReview);
router.post('/:id/internal-approve', approvalController.internalApprove);
router.post('/:id/internal-revision', approvalController.internalRevision);
router.post('/:id/resubmit', approvalController.resubmitContent);
router.post('/:id/submit-client-review', approvalController.submitClientReview);
router.post('/:id/client-approve', approvalController.clientApprove);
router.post('/:id/external-client-approve', approvalController.externalClientApprove);
router.post('/:id/client-revision', approvalController.clientRevision);
router.post('/:id/reject', approvalController.rejectContent);
router.get('/:id/approvals', approvalController.getApprovalHistory);

module.exports = router;
