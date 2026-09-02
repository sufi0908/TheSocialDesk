const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  requireRole,
  requireWorkspaceAccess,
  requireClientAccess,
} = require('../middleware/rbacMiddleware');

const router = express.Router();

// Protected Superadmin-only route
router.post(
  '/superadmin-only',
  authenticateToken,
  requireRole('superadmin'),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: 'Superadmin action executed successfully.',
    });
  }
);

// Protected Workspace Manager & Superadmin route
router.post(
  '/manager-action',
  authenticateToken,
  requireRole('superadmin', 'workspace_manager'),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: 'Workspace Manager action executed successfully.',
    });
  }
);

// Protected Workspace Isolated route
router.get(
  '/workspace/:workspaceId',
  authenticateToken,
  requireWorkspaceAccess,
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: `Access granted to workspace ${req.workspaceId}`,
      workspaceId: req.workspaceId,
    });
  }
);

// Protected Client Isolated route
router.get(
  '/client/:clientId',
  authenticateToken,
  requireWorkspaceAccess,
  requireClientAccess,
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: `Access granted to client ${req.clientId}`,
      clientId: req.clientId,
      workspaceId: req.workspaceId,
    });
  }
);

module.exports = router;
