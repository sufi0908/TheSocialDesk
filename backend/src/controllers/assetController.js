const fs = require('fs');
const assetService = require('../services/assetService');

class AssetController {
  // GET /api/assets/stats
  async getAssetStats(req, res, next) {
    try {
      const result = await assetService.getAssetStats(req.workspaceId, req.user);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/assets/upload (Single)
  async uploadAsset(req, res, next) {
    try {
      const file = req.file || (req.files && req.files[0]);
      const result = await assetService.createUploadedAsset(req.user, req.workspaceId, file, req.body);
      return res.status(201).json({ success: true, message: 'Asset uploaded successfully.', data: result });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/assets/bulk (Multiple)
  async uploadAssetsBulk(req, res, next) {
    try {
      const files = req.files || (req.file ? [req.file] : []);
      const result = await assetService.createUploadedAssetsBulk(req.user, req.workspaceId, files, req.body);
      return res.status(201).json({ success: true, message: 'Assets uploaded successfully.', data: result });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/assets/:id/file or GET /api/assets/:id/view (Inline preview with HTTP Range support for video playback)
  async viewAsset(req, res, next) {
    try {
      const { asset, filePath } = await assetService.getAssetFile(req.workspaceId, req.params.id, req.user);
      const mime = asset.mime_type || 'application/octet-stream';

      const stat = await fs.promises.stat(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(asset.file_name)}"`);
      res.setHeader('Cache-Control', 'private, max-age=86400');
      res.setHeader('Accept-Ranges', 'bytes');

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (isNaN(start) || start >= fileSize || (end && end >= fileSize)) {
          res.setHeader('Content-Range', `bytes */${fileSize}`);
          return res.status(416).send('Requested range not satisfiable');
        }

        const chunkSize = end - start + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': mime,
        });

        fileStream.on('error', (err) => {
          if (!res.headersSent) next(err);
        });
        return fileStream.pipe(res);
      }

      res.setHeader('Content-Length', fileSize);
      const stream = fs.createReadStream(filePath);
      stream.on('error', (err) => {
        if (!res.headersSent) next(err);
      });
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/assets/:id/download (Attachment download)
  async downloadAsset(req, res, next) {
    try {
      const { asset, filePath } = await assetService.getAssetFile(req.workspaceId, req.params.id, req.user);
      res.type(asset.mime_type || 'application/octet-stream');
      res.download(filePath, asset.display_name || asset.file_name, { dotfiles: 'deny' }, (error) => {
        if (error && !res.headersSent) next(error);
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/assets (Paginated, Search, Filter, Sort)
  async listAssets(req, res, next) {
    try {
      const result = await assetService.listAssets(req.workspaceId, {
        ...req.query,
        currentUser: req.user,
      });
      return res.status(200).json({
        success: true,
        data: result.assets,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/assets/:id
  async getAsset(req, res, next) {
    try {
      const result = await assetService.getAsset(req.workspaceId, req.params.id, req.user);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/assets/:id/usage
  async getAssetUsage(req, res, next) {
    try {
      const usage = await assetService.getAssetUsage(req.workspaceId, req.params.id);
      return res.status(200).json({ success: true, data: usage });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/assets/:id
  async updateAsset(req, res, next) {
    try {
      const result = await assetService.updateAsset(req.user, req.workspaceId, req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Asset updated successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/assets/:id
  async deleteAsset(req, res, next) {
    try {
      const force = req.query.force === 'true' || req.body.force === true;
      const result = await assetService.deleteAsset(req.workspaceId, req.params.id, { forceDelete: force });
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/assets/bulk-delete
  async bulkDelete(req, res, next) {
    try {
      const { assetIds, force } = req.body;
      const result = await assetService.bulkDeleteAssets(req.workspaceId, assetIds, { forceDelete: force });
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/assets/bulk-move
  async bulkMove(req, res, next) {
    try {
      const { assetIds, folderId } = req.body;
      const result = await assetService.bulkMoveAssets(req.workspaceId, assetIds, folderId);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/assets/:id/attach
  async attachAssetToContent(req, res, next) {
    try {
      const { contentId } = req.body;
      const result = await assetService.attachAssetToContent(req.workspaceId, req.params.id, contentId);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // --- FOLDER ENDPOINTS ---

  async listFolders(req, res, next) {
    try {
      const folders = await assetService.listFolders(req.workspaceId, req.query.clientId);
      return res.status(200).json({ success: true, data: folders });
    } catch (error) {
      next(error);
    }
  }

  async createFolder(req, res, next) {
    try {
      const folder = await assetService.createFolder(req.user, req.workspaceId, req.body);
      return res.status(201).json({ success: true, data: folder });
    } catch (error) {
      next(error);
    }
  }

  async renameFolder(req, res, next) {
    try {
      const result = await assetService.renameFolder(req.user, req.workspaceId, req.params.id, req.body);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteFolder(req, res, next) {
    try {
      const result = await assetService.deleteFolder(req.user, req.workspaceId, req.params.id);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AssetController();
