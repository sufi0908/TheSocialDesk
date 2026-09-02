const projectService = require('../services/projectService');

class ProjectController {
  // POST /api/projects
  async createProject(req, res, next) {
    try {
      const result = await projectService.createProject(req.user, req.workspaceId, req.body);
      return res.status(201).json({
        success: true,
        message: 'Project created successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/projects
  async listProjects(req, res, next) {
    try {
      const { clientId, status, search } = req.query;
      const result = await projectService.listProjects(req.workspaceId, { clientId, status, search });
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/projects/:id
  async getProject(req, res, next) {
    try {
      const result = await projectService.getProject(req.workspaceId, req.params.id);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/projects/:id
  async updateProject(req, res, next) {
    try {
      const result = await projectService.updateProject(req.workspaceId, req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Project updated successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/projects/:id/status
  async updateProjectStatus(req, res, next) {
    try {
      const { status } = req.body;
      const result = await projectService.updateProjectStatus(req.workspaceId, req.params.id, status);
      return res.status(200).json({
        success: true,
        message: `Project status updated to ${status}.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProjectController();
