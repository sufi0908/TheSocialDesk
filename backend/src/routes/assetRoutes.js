const express = require('express');
const assetController = require('../controllers/assetController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireWorkspaceAccess } = require('../middleware/rbacMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

// Public File Serving Endpoints for Browser <img/>, <video/>, and <audio/> elements
router.get('/:id/view', (req, res, next) => assetController.viewAsset(req, res, next));
router.get('/:id/file', (req, res, next) => assetController.viewAsset(req, res, next));
router.get('/:id/download', (req, res, next) => assetController.downloadAsset(req, res, next));

// Authenticated Routes
router.use(authenticateToken);
router.use(requireWorkspaceAccess);

// Asset Statistics & Folders
router.get('/stats', (req, res, next) => assetController.getAssetStats(req, res, next));
router.get('/folders', (req, res, next) => assetController.listFolders(req, res, next));
router.post('/folders', (req, res, next) => assetController.createFolder(req, res, next));
router.put('/folders/:id', (req, res, next) => assetController.renameFolder(req, res, next));
router.patch('/folders/:id', (req, res, next) => assetController.renameFolder(req, res, next));
router.delete('/folders/:id', (req, res, next) => assetController.deleteFolder(req, res, next));

// Bulk Operations
router.post('/bulk-delete', (req, res, next) => assetController.bulkDelete(req, res, next));
router.patch('/bulk-move', (req, res, next) => assetController.bulkMove(req, res, next));

// Asset Upload
router.post('/bulk', upload.any(), (req, res, next) => assetController.uploadAssetsBulk(req, res, next));
router.post('/upload', upload.any(), (req, res, next) => assetController.uploadAsset(req, res, next));
router.post('/', upload.any(), (req, res, next) => assetController.uploadAsset(req, res, next));
router.get('/:id/usage', (req, res, next) => assetController.getAssetUsage(req, res, next));

// Core CRUD
router.get('/', (req, res, next) => assetController.listAssets(req, res, next));
router.get('/:id', (req, res, next) => assetController.getAsset(req, res, next));
router.put('/:id', (req, res, next) => assetController.updateAsset(req, res, next));
router.delete('/:id', (req, res, next) => assetController.deleteAsset(req, res, next));
router.post('/:id/attach', (req, res, next) => assetController.attachAssetToContent(req, res, next));

module.exports = router;
