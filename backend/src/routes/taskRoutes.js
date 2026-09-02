const express = require('express');
const taskController = require('../controllers/taskController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireRole, requireWorkspaceAccess } = require('../middleware/rbacMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(authenticateToken);
router.use(requireWorkspaceAccess);

// Task CRUD & Management Endpoints
router.post('/', requireRole('superadmin', 'workspace_manager', 'social_media_manager', 'graphic_team_head'), upload.any(), taskController.createTask);
router.get('/', taskController.listTasks);
router.get('/my', taskController.getMyTasks);
router.get('/:id', taskController.getTask);
router.put('/:id', taskController.updateTask);
router.post('/:id/assign', requireRole('superadmin', 'workspace_manager', 'graphic_team_head'), taskController.reassignTask);
router.patch('/:id/status', taskController.updateTaskStatus);
router.post('/:id/duplicate', requireRole('superadmin', 'workspace_manager', 'graphic_team_head'), taskController.duplicateTask);
router.delete('/:id', requireRole('superadmin', 'workspace_manager'), taskController.deleteTask);

// Task Comments
router.get('/:id/comments', taskController.getTaskComments);
router.post('/:id/comments', taskController.addComment);
router.delete('/:id/comments/:commentId', taskController.deleteComment);

// Task Attachments
router.post('/:id/attachments', upload.any(), taskController.addAttachment);
router.delete('/:id/attachments/:attachmentId', taskController.deleteAttachment);

// Task Activity
router.get('/:id/activity', taskController.getTaskActivity);

module.exports = router;
