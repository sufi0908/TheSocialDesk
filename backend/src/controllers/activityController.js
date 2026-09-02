const activityService = require('../services/activityService');

class ActivityController {
  // GET /api/activity
  async listActivities(req, res, next) {
    try {
      const { entityType, userId, clientId, limit } = req.query;
      const result = await activityService.listActivities(req.workspaceId, req.user, {
        entityType,
        userId,
        clientId,
        limit,
      });
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ActivityController();
