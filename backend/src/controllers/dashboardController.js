const dashboardService = require('../services/dashboardService');

class DashboardController {
  // GET /api/workspace/dashboard OR GET /api/dashboard
  async getDashboard(req, res, next) {
    try {
      const workspaceId = req.workspaceId;
      const currentUser = req.user;

      let data;
      if (currentUser.role === 'client' || currentUser.role === 'client_user') {
        data = await dashboardService.getClientDashboard(currentUser, workspaceId);
      } else {
        data = await dashboardService.getWorkspaceDashboard(currentUser, workspaceId);
      }

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
