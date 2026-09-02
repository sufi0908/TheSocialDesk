const workspaceUserService = require('../services/workspaceUserService');

class WorkspaceUserController {
  // POST /api/workspace/users
  async createTeamMember(req, res, next) {
    try {
      const result = await workspaceUserService.createTeamMember(req.user, req.workspaceId, req.body, req.file);
      return res.status(201).json({
        success: true,
        message: 'Team member account created successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/workspace/clients
  async createClient(req, res, next) {
    try {
      const result = await workspaceUserService.createClient(req.user, req.workspaceId, req.body);
      return res.status(201).json({
        success: true,
        message: 'Client and client user account created successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/workspace/users
  async listWorkspaceUsers(req, res, next) {
    try {
      const { search, role, status } = req.query;
      const result = await workspaceUserService.listWorkspaceUsers(req.workspaceId, { search, role, status });
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/workspace/users/:id
  async getWorkspaceUser(req, res, next) {
    try {
      const result = await workspaceUserService.getWorkspaceUser(req.workspaceId, req.params.id);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/workspace/users/:id
  async updateWorkspaceUser(req, res, next) {
    try {
      const result = await workspaceUserService.updateWorkspaceUser(req.workspaceId, req.params.id, req.body, req.file);
      return res.status(200).json({
        success: true,
        message: 'User updated successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/workspace/users/:id/status
  async updateWorkspaceUserStatus(req, res, next) {
    try {
      const { status } = req.body;
      const result = await workspaceUserService.updateWorkspaceUserStatus(req.workspaceId, req.params.id, status);
      return res.status(200).json({
        success: true,
        message: `User status updated to ${status}.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/workspace/users/:id/reset-password
  async resetWorkspaceUserPassword(req, res, next) {
    try {
      const { newPassword, confirmPassword } = req.body;
      const result = await workspaceUserService.resetWorkspaceUserPassword(
        req.workspaceId,
        req.params.id,
        newPassword,
        confirmPassword
      );
      return res.status(200).json({
        success: true,
        message: 'Team member password reset successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/workspace/clients
  async listWorkspaceClients(req, res, next) {
    try {
      const result = await workspaceUserService.listWorkspaceClients(req.workspaceId, req.query, req.user);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/workspace/clients/:id
  async getWorkspaceClient(req, res, next) {
    try {
      const result = await workspaceUserService.getWorkspaceClient(req.workspaceId, req.params.id, req.user);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/workspace/clients/:id
  async updateWorkspaceClient(req, res, next) {
    try {
      const result = await workspaceUserService.updateWorkspaceClient(req.workspaceId, req.params.id, req.body, req.file, req.user);
      return res.status(200).json({
        success: true,
        message: 'Client updated successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/workspace/clients/:id/logo
  async uploadClientLogo(req, res, next) {
    try {
      const result = await workspaceUserService.uploadClientLogo(req.user, req.workspaceId, req.params.id, req.file);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/workspace/clients/:id/logo
  async removeClientLogo(req, res, next) {
    try {
      const result = await workspaceUserService.removeClientLogo(req.workspaceId, req.params.id);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/workspace/clients/:id/status
  async updateWorkspaceClientStatus(req, res, next) {
    try {
      const { status } = req.body;
      const result = await workspaceUserService.updateWorkspaceClientStatus(req.workspaceId, req.params.id, status);
      return res.status(200).json({
        success: true,
        message: `Client status updated to ${status}.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/workspace/clients/:id
  async deleteWorkspaceClient(req, res, next) {
    try {
      const result = await workspaceUserService.deleteWorkspaceClient(req.workspaceId, req.params.id);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/workspace/clients/:id/overview
  async getClientOverview(req, res, next) {
    try {
      const result = await workspaceUserService.getClientOverview(req.workspaceId, req.params.id, req.user);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/workspace/clients/:id/content
  async getClientContent(req, res, next) {
    try {
      const result = await workspaceUserService.getClientContent(req.workspaceId, req.params.id, req.user, req.query);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/workspace/clients/:id/projects
  async getClientProjects(req, res, next) {
    try {
      const result = await workspaceUserService.getClientProjects(req.workspaceId, req.params.id, req.user);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/workspace/clients/:id/tasks
  async getClientTasks(req, res, next) {
    try {
      const result = await workspaceUserService.getClientTasks(req.workspaceId, req.params.id, req.user, req.query);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/workspace/clients/:id/assets
  async getClientAssets(req, res, next) {
    try {
      const result = await workspaceUserService.getClientAssets(req.workspaceId, req.params.id, req.user, req.query);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WorkspaceUserController();
