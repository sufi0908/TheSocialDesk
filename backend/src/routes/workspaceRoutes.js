const express = require('express');
const workspaceUserController = require('../controllers/workspaceUserController');
const dashboardController = require('../controllers/dashboardController');
const superadminService = require('../services/superadminService');
const brandKitRoutes = require('./brandKitRoutes');
const reportRoutes = require('./reportRoutes');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireRole, requireWorkspaceAccess } = require('../middleware/rbacMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

// Enforce authentication on all routes in this router
router.use(authenticateToken);

// --- WORKSPACE LISTING FOR CURRENT AUTHENTICATED USER ---
router.get('/', async (req, res, next) => {
  try {
    if (req.user.role === 'superadmin') {
      const workspaces = await superadminService.listWorkspaces({});
      return res.status(200).json({ success: true, data: workspaces });
    }

    const [rows] = await db.execute(
      `SELECT w.id, w.name, w.slug, w.logo_url as logoUrl, w.status, wu.role as workspaceRole, w.created_at as createdAt
       FROM workspace_users wu
       JOIN workspaces w ON wu.workspace_id = w.id
       WHERE wu.user_id = ? AND wu.status = 'ACTIVE' AND w.deleted_at IS NULL
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.get('/my', async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT w.id, w.name, w.slug, w.logo_url as logoUrl, w.status, wu.role as workspaceRole, w.created_at as createdAt
       FROM workspace_users wu
       JOIN workspaces w ON wu.workspace_id = w.id
       WHERE wu.user_id = ? AND wu.status = 'ACTIVE' AND w.deleted_at IS NULL
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// Enforce workspace isolation on workspace-scoped resource routes
router.use(requireWorkspaceAccess);

// --- WORKSPACE DASHBOARD ENDPOINT ---
router.get('/dashboard', dashboardController.getDashboard);

// --- WORKSPACE REPORTS ENDPOINTS ---
router.use('/reports', reportRoutes);
router.use('/:workspaceId/reports', reportRoutes);

// --- TEAM MEMBER MANAGEMENT ROUTES ---
router.post('/users', requireRole('workspace_manager'), upload.single('profileImage'), workspaceUserController.createTeamMember);
router.get('/users', workspaceUserController.listWorkspaceUsers);
router.get('/users/:id', workspaceUserController.getWorkspaceUser);
router.put('/users/:id', requireRole('workspace_manager'), upload.single('profileImage'), workspaceUserController.updateWorkspaceUser);
router.patch('/users/:id/status', requireRole('workspace_manager'), workspaceUserController.updateWorkspaceUserStatus);
router.patch('/users/:id/reset-password', requireRole('workspace_manager'), workspaceUserController.resetWorkspaceUserPassword);

// --- CLIENT MANAGEMENT ROUTES ---
router.post('/clients', requireRole('superadmin', 'workspace_manager'), upload.single('logo'), workspaceUserController.createClient);
router.get('/clients', workspaceUserController.listWorkspaceClients);
router.get('/clients/:id', workspaceUserController.getWorkspaceClient);
router.put('/clients/:id', requireRole('superadmin', 'workspace_manager'), upload.single('logo'), workspaceUserController.updateWorkspaceClient);
router.patch('/clients/:id', requireRole('superadmin', 'workspace_manager'), upload.single('logo'), workspaceUserController.updateWorkspaceClient);
router.post('/clients/:id/logo', requireRole('superadmin', 'workspace_manager'), upload.single('logo'), workspaceUserController.uploadClientLogo);
router.delete('/clients/:id/logo', requireRole('superadmin', 'workspace_manager'), workspaceUserController.removeClientLogo);
router.patch('/clients/:id/status', requireRole('superadmin', 'workspace_manager'), workspaceUserController.updateWorkspaceClientStatus);
router.delete('/clients/:id', requireRole('superadmin', 'workspace_manager'), workspaceUserController.deleteWorkspaceClient);

// --- CLIENT DETAIL SUB-RESOURCES ---
router.use('/clients/:clientId/brand-kit', brandKitRoutes);
router.get('/clients/:id/overview', workspaceUserController.getClientOverview);
router.get('/clients/:id/content', workspaceUserController.getClientContent);
router.get('/clients/:id/projects', workspaceUserController.getClientProjects);
router.get('/clients/:id/tasks', workspaceUserController.getClientTasks);
router.get('/clients/:id/assets', workspaceUserController.getClientAssets);

module.exports = router;
