const collaborationService = require('../services/collaborationService');

class CollaborationController {
  // POST /api/content/:id/versions
  async createVersion(req, res, next) {
    try {
      const result = await collaborationService.createVersion(req.user, req.workspaceId, req.params.id, req.body);
      return res.status(201).json({
        success: true,
        message: 'Content version snapshot created.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/content/:id/versions
  async listVersions(req, res, next) {
    try {
      const result = await collaborationService.listVersions(req.workspaceId, req.params.id);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/content/:id/versions/:versionId
  async getVersion(req, res, next) {
    try {
      const result = await collaborationService.getVersion(req.workspaceId, req.params.id, req.params.versionId);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/content/:id/versions/:versionId/restore
  async restoreVersion(req, res, next) {
    try {
      const result = await collaborationService.restoreVersion(req.user, req.workspaceId, req.params.id, req.params.versionId);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/content/:id/comments
  async createComment(req, res, next) {
    try {
      const result = await collaborationService.createComment(req.user, req.workspaceId, req.params.id, req.body);
      return res.status(201).json({
        success: true,
        message: 'Comment added successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/content/:id/comments
  async listComments(req, res, next) {
    try {
      const result = await collaborationService.listComments(req.user, req.workspaceId, req.params.id);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/comments/:id
  async updateComment(req, res, next) {
    try {
      const result = await collaborationService.updateComment(req.user, req.workspaceId, req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Comment updated successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/comments/:id
  async deleteComment(req, res, next) {
    try {
      const result = await collaborationService.deleteComment(req.user, req.workspaceId, req.params.id);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CollaborationController();
