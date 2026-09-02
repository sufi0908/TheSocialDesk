const superadminService = require('../services/superadminService');

class SuperadminController {
  // POST /api/superadmin/workspaces
  async createWorkspace(req, res, next) {
    try {
      const result = await superadminService.createWorkspace(req.user, req.body);
      return res.status(201).json({
        success: true,
        message: 'Workspace created successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/superadmin/workspaces/:workspaceId/manager
  async createWorkspaceManager(req, res, next) {
    try {
      const { workspaceId } = req.params;
      const result = await superadminService.createWorkspaceManager(req.user, workspaceId, req.body);
      return res.status(201).json({
        success: true,
        message: 'Initial Workspace Manager created successfully with temporary credentials.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/superadmin/workspaces
  async listWorkspaces(req, res, next) {
    try {
      const { search, status } = req.query;
      const result = await superadminService.listWorkspaces({ search, status });
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/superadmin/workspaces/:id
  async getWorkspace(req, res, next) {
    try {
      const result = await superadminService.getWorkspace(req.params.id);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/superadmin/workspaces/:id/team
  async getWorkspaceTeam(req, res, next) {
    try {
      const result = await superadminService.getWorkspaceTeam(req.params.id);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/superadmin/workspaces/:id
  async updateWorkspace(req, res, next) {
    try {
      const result = await superadminService.updateWorkspace(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Workspace updated successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/superadmin/workspaces/:id/status
  async updateWorkspaceStatus(req, res, next) {
    try {
      const { status } = req.body;
      const result = await superadminService.updateWorkspaceStatus(req.params.id, status, req.user);
      return res.status(200).json({
        success: true,
        message: `Workspace status updated to ${result.status}.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/superadmin/workspaces/:id
  async deleteWorkspace(req, res, next) {
    try {
      const result = await superadminService.deleteWorkspace(req.params.id, req.user);
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/superadmin/workspaces/:id/manager
  async getWorkspaceManager(req, res, next) {
    try {
      const result = await superadminService.getWorkspaceManager(req.params.id);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/superadmin/users/:id
  async updateUser(req, res, next) {
    try {
      const result = await superadminService.updateUser(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'User details updated successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/superadmin/users/:id/status
  async updateUserStatus(req, res, next) {
    try {
      const { status } = req.body;
      const result = await superadminService.updateUserStatus(req.params.id, status);
      return res.status(200).json({
        success: true,
        message: `User status updated to ${status}.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/superadmin/managers
  async listManagers(req, res, next) {
    try {
      const result = await superadminService.listManagers();
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/superadmin/analytics
  async getMetrics(req, res, next) {
    try {
      const result = await superadminService.getMetrics();
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/superadmin/managers/:id/reset-password or /api/superadmin/users/:id/reset-password
  async resetManagerPassword(req, res, next) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      const result = await superadminService.resetManagerPassword(id, newPassword);
      return res.status(200).json({
        success: true,
        message: `Password reset successfully for ${result.userName}.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SuperadminController();
