const express = require('express');
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireWorkspaceAccess, requireRole } = require('../middleware/rbacMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

// Apply auth and workspace isolation middleware to all chat routes
router.use(authenticateToken);
router.use(requireWorkspaceAccess);

// Group management routes
router.get('/groups', chatController.getGroups);
router.post('/groups', chatController.createGroup);
router.get('/groups/:id', chatController.getGroupDetails);
router.put('/groups/:id', chatController.updateGroup);
router.delete('/groups/:id', chatController.archiveGroup);

// Group member management
router.get('/groups/:id/members', chatController.getGroupMembers);
router.post('/groups/:id/members', chatController.addMembers);
router.delete('/groups/:id/members/:userId', chatController.removeMember);
router.patch('/groups/:id/members/:userId/role', chatController.updateMemberRole);
router.post('/groups/:id/leave', chatController.leaveGroup);
router.patch('/groups/:id/preferences', chatController.updatePreferences);

// Group shared media & workspace users
router.get('/groups/:id/media', chatController.getGroupMedia);
router.get('/workspace-users', chatController.getWorkspaceUsers);

// Message routes
router.get('/groups/:id/messages', chatController.getMessages);
router.post('/groups/:id/messages', chatController.sendMessage);
router.put('/messages/:id', chatController.editMessage);
router.delete('/messages/:id', chatController.deleteMessage);
router.post('/messages/:id/reactions', chatController.toggleReaction);
router.patch('/groups/:id/read', chatController.markRead);

// Unread count badge
router.get('/unread-count', chatController.getUnreadCount);

// File & Voice note upload & stream routes
router.post('/upload', upload.any(), chatController.uploadFile);
router.get('/files/view', chatController.streamFile);

module.exports = router;
