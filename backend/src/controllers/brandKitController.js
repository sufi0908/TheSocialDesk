const brandKitService = require('../services/brandKitService');

class BrandKitController {
  // GET /api/clients/:clientId/brand-kit
  async getBrandKit(req, res, next) {
    try {
      const result = await brandKitService.getBrandKit(req.workspaceId, req.params.clientId, req.user);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/clients/:clientId/brand-kit
  async upsertBrandKit(req, res, next) {
    try {
      const result = await brandKitService.upsertBrandKit(req.user, req.workspaceId, req.params.clientId, req.body);
      return res.status(200).json({
        success: true,
        message: 'Brand kit updated successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/clients/:clientId/brand-kit/upload
  async uploadBrandAsset(req, res, next) {
    try {
      const result = await brandKitService.uploadBrandAsset(
        req.user,
        req.workspaceId,
        req.params.clientId,
        req.file,
        req.body
      );
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/clients/:clientId/brand-kit/assets/:assetId
  async deleteBrandAsset(req, res, next) {
    try {
      const result = await brandKitService.deleteBrandAsset(
        req.user,
        req.workspaceId,
        req.params.clientId,
        req.params.assetId
      );
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BrandKitController();

