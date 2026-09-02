const contentService = require('../services/contentService');

class ContentController {
  // POST /api/content
  async createContent(req, res, next) {
    try {
      const result = await contentService.createContent(req.user, req.workspaceId, req.body);
      return res.status(201).json({
        success: true,
        message: 'Content created successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/content
  async listContent(req, res, next) {
    try {
      const { clientId, projectId, status, platform, assignedTo, contentType, date, search, page, limit } = req.query;
      const result = await contentService.listContent(req.workspaceId, {
        clientId,
        projectId,
        status,
        platform,
        assignedTo,
        contentType,
        date,
        search,
        page,
        limit,
        currentUser: req.user,
      });
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/content/:id
  async getContent(req, res, next) {
    try {
      const result = await contentService.getContent(req.workspaceId, req.params.id, req.user);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/content/:id
  async updateContent(req, res, next) {
    try {
      const result = await contentService.updateContent(req.user, req.workspaceId, req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Content updated successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/content/:id/status
  async updateContentStatus(req, res, next) {
    try {
      const { status } = req.body;
      const result = await contentService.updateContentStatus(req.user, req.workspaceId, req.params.id, status);
      return res.status(200).json({
        success: true,
        message: `Content status updated to ${status}.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/content/:id
  async deleteContent(req, res, next) {
    try {
      const result = await contentService.deleteContent(req.workspaceId, req.params.id);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ContentController();
