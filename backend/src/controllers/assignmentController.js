const assignmentService = require('../services/assignmentService');

class AssignmentController {
  // POST /api/clients/:clientId/team
  async assignTeamMemberToClient(req, res, next) {
    try {
      const { clientId } = req.params;
      const result = await assignmentService.assignTeamMemberToClient(req.workspaceId, clientId, req.body);
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/clients/:clientId/team/:userId
  async removeTeamMemberFromClient(req, res, next) {
    try {
      const { clientId, userId } = req.params;
      const result = await assignmentService.removeTeamMemberFromClient(req.workspaceId, clientId, userId);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/clients/:clientId/team
  async getClientTeam(req, res, next) {
    try {
      const { clientId } = req.params;
      const result = await assignmentService.getClientTeam(req.workspaceId, clientId);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/users/:userId/clients
  async getUserAssignedClients(req, res, next) {
    try {
      const { userId } = req.params;
      const result = await assignmentService.getUserAssignedClients(req.workspaceId, userId);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/projects/:projectId/members
  async assignMemberToProject(req, res, next) {
    try {
      const { projectId } = req.params;
      const result = await assignmentService.assignMemberToProject(req.workspaceId, projectId, req.body);
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/projects/:projectId/members/:userId
  async removeMemberFromProject(req, res, next) {
    try {
      const { projectId, userId } = req.params;
      const result = await assignmentService.removeMemberFromProject(req.workspaceId, projectId, userId);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/projects/:projectId/members
  async getProjectMembers(req, res, next) {
    try {
      const { projectId } = req.params;
      const result = await assignmentService.getProjectMembers(req.workspaceId, projectId);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AssignmentController();
