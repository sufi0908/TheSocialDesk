const express = require('express');
const brandKitController = require('../controllers/brandKitController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireWorkspaceAccess } = require('../middleware/rbacMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router({ mergeParams: true });

router.use(authenticateToken);
router.use(requireWorkspaceAccess);

// Brand Kit Routes
router.get('/', brandKitController.getBrandKit);
router.put('/', brandKitController.upsertBrandKit);
router.post('/', brandKitController.upsertBrandKit);
router.post('/upload', upload.single('file'), brandKitController.uploadBrandAsset);
router.delete('/assets/:assetId', brandKitController.deleteBrandAsset);

module.exports = router;

