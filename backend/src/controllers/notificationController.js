const notificationService = require('../services/notificationService');

class NotificationController {
  // GET /api/notifications
  async listNotifications(req, res, next) {
    try {
      const { isRead, limit } = req.query;
      const result = await notificationService.listNotifications(req.user.id, req.workspaceId, { isRead, limit });
      return res.status(200).json({
        success: true,
        data: result.notifications,
        unreadCount: result.unreadCount,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/notifications/unread-count
  async getUnreadCount(req, res, next) {
    try {
      const count = await notificationService.getUnreadCount(req.user.id, req.workspaceId);
      return res.status(200).json({
        success: true,
        data: { unreadCount: count },
        unreadCount: count,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/notifications/:id/read
  async markAsRead(req, res, next) {
    try {
      const result = await notificationService.markAsRead(req.user.id, req.params.id);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/notifications/read-all
  async markAllAsRead(req, res, next) {
    try {
      const result = await notificationService.markAllAsRead(req.user.id, req.workspaceId);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();
