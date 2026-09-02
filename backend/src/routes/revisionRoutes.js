const express = require('express');
const router = express.Router();
const revisionController = require('../controllers/revisionController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireWorkspaceAccess } = require('../middleware/rbacMiddleware');

router.use(authenticateToken);
router.use(requireWorkspaceAccess);

// List revisions assigned to / requested by user
router.get('/my', (req, res, next) => revisionController.listMyRevisions(req, res, next));

// Revision item actions
router.patch('/:id/start', (req, res, next) => revisionController.startRevision(req, res, next));
router.patch('/:id/resubmit', (req, res, next) => revisionController.resubmitRevision(req, res, next));
router.patch('/:id/resolve', (req, res, next) => revisionController.resolveAndApprove(req, res, next));

// Content revision routes
router.post('/content/:contentId', (req, res, next) => revisionController.createRevisionRequest(req, res, next));
router.get('/content/:contentId/history', (req, res, next) => revisionController.getRevisionHistory(req, res, next));
router.get('/:contentId/history', (req, res, next) => revisionController.getRevisionHistory(req, res, next));

module.exports = router;
