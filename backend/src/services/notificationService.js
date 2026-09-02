const { db } = require('../config/database');
const { emitNotificationToUser } = require('../config/socket');

class NotificationService {
  /**
   * Centralized createNotification method for the entire SocialDesk application.
   * Persists to MySQL and emits real-time Socket.IO event to recipient's private room.
   */
  async createNotification(data) {
    const recipientId = data.recipientId || data.userId;
    const workspaceId = data.workspaceId || null;
    const senderId = data.senderId || null;
    const title = data.title ? String(data.title).trim() : '';
    const message = data.message ? String(data.message).trim() : '';
    const type = (data.type || 'SYSTEM').toUpperCase();
    const link = data.link || null;
    const relatedContentId = data.relatedContentId || data.contentId || null;
    const relatedTaskId = data.relatedTaskId || data.taskId || null;
    const relatedRevisionId = data.relatedRevisionId || data.revisionId || null;

    if (!recipientId || !title || !message) {
      return null;
    }

    // Do NOT notify sender of their own action
    if (senderId && Number(senderId) === Number(recipientId)) {
      return null;
    }

    try {
      const [result] = await db.execute(
        `INSERT INTO notifications 
          (user_id, workspace_id, related_content_id, related_task_id, related_revision_id, title, message, type, link, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
        [
          recipientId,
          workspaceId,
          relatedContentId,
          relatedTaskId,
          relatedRevisionId,
          title,
          message,
          type,
          link,
        ]
      );

      const payload = {
        id: result.insertId,
        userId: recipientId,
        recipientId,
        workspaceId,
        senderId,
        title,
        message,
        type,
        link:
          link ||
          (relatedTaskId
            ? `/workspace/tasks/${relatedTaskId}`
            : relatedContentId
            ? `/workspace/content/${relatedContentId}`
            : '/workspace/notifications'),
        relatedContentId,
        relatedTaskId,
        relatedRevisionId,
        isRead: false,
        readAt: null,
        createdAt: new Date().toISOString(),
      };

      // Emit real-time Socket.IO notification to user's private room
      try {
        emitNotificationToUser(recipientId, payload);
      } catch (socketErr) {
        console.warn('Real-time socket emit warning:', socketErr.message);
      }

      return payload;
    } catch (err) {
      console.error('Failed to create notification in database:', err.message);
      throw err;
    }
  }

  /**
   * Notify Workspace Managers, Superadmins, and Team Leads.
   */
  async notifyWorkspaceManagers(workspaceId, { title, message, type, link, relatedContentId, relatedTaskId, senderId }) {
    if (!workspaceId) return;
    try {
      const [rows] = await db.execute(
        `SELECT u.id
         FROM users u
         JOIN workspace_users wu ON u.id = wu.user_id
         JOIN roles r ON u.role_id = r.id
         WHERE wu.workspace_id = ? 
           AND r.name IN ('superadmin', 'workspace_manager', 'social_media_manager', 'graphic_team_head') 
           AND u.deleted_at IS NULL`,
        [workspaceId]
      );

      for (const user of rows) {
        if (senderId && Number(user.id) === Number(senderId)) continue;
        await this.createNotification({
          recipientId: user.id,
          workspaceId,
          senderId,
          title,
          message,
          type,
          link,
          relatedContentId,
          relatedTaskId,
        });
      }
    } catch (e) {
      console.warn('notifyWorkspaceManagers error:', e.message);
    }
  }

  /**
   * Notify Client Users for a given client ID.
   */
  async notifyClientUsers(clientId, workspaceId, { title, message, type, link, relatedContentId, senderId }) {
    if (!clientId) return;
    try {
      const [rows] = await db.execute(
        `SELECT u.id
         FROM users u
         JOIN client_team ct ON u.id = ct.user_id
         WHERE ct.client_id = ? AND u.deleted_at IS NULL`,
        [clientId]
      );

      for (const user of rows) {
        if (senderId && Number(user.id) === Number(senderId)) continue;
        await this.createNotification({
          recipientId: user.id,
          workspaceId,
          senderId,
          title,
          message,
          type,
          link,
          relatedContentId,
        });
      }
    } catch (e) {
      console.warn('notifyClientUsers error:', e.message);
    }
  }

  /**
   * Get live unread notifications count for a user from MySQL.
   */
  async getUnreadCount(userId, workspaceId = null) {
    let query = 'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = 0';
    const params = [userId];

    if (workspaceId) {
      query += ' AND (workspace_id = ? OR workspace_id IS NULL)';
      params.push(workspaceId);
    }

    const [rows] = await db.execute(query, params);
    return rows[0]?.unread_count || 0;
  }

  /**
   * Get persistent notifications for the authenticated user.
   * Scoped strictly by recipient user_id.
   */
  async listNotifications(userId, workspaceId, filters = {}) {
    const { isRead, limit = 50 } = filters;

    let query = `
      SELECT id, user_id, workspace_id, related_content_id, related_task_id, related_revision_id, title, message, type, link, is_read, read_at, created_at
      FROM notifications
      WHERE user_id = ?
    `;
    const params = [userId];

    if (workspaceId) {
      query += ' AND (workspace_id = ? OR workspace_id IS NULL)';
      params.push(workspaceId);
    }

    if (isRead !== undefined && isRead !== null && isRead !== '') {
      query += ' AND is_read = ?';
      params.push(isRead === 'true' || isRead === true || isRead === '1' ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const [rows] = await db.execute(query, params);
    const unreadCount = await this.getUnreadCount(userId, workspaceId);

    return {
      notifications: rows.map((n) => ({
        id: n.id,
        userId: n.user_id,
        workspaceId: n.workspace_id,
        relatedContentId: n.related_content_id,
        relatedTaskId: n.related_task_id,
        relatedRevisionId: n.related_revision_id,
        title: n.title,
        message: n.message,
        type: n.type,
        link:
          n.link ||
          (n.related_task_id
            ? `/workspace/tasks/${n.related_task_id}`
            : n.related_content_id
            ? `/workspace/content/${n.related_content_id}`
            : '/workspace/notifications'),
        isRead: Boolean(n.is_read),
        readAt: n.read_at,
        createdAt: n.created_at,
      })),
      unreadCount,
    };
  }

  /**
   * Mark a single notification as read with ownership verification.
   */
  async markAsRead(userId, notificationId) {
    const [result] = await db.execute(
      'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      const error = new Error('Notification not found or access denied.');
      error.status = 404;
      throw error;
    }

    return { success: true, message: 'Notification marked as read.', id: parseInt(notificationId, 10) };
  }

  /**
   * Mark all notifications for the user as read.
   */
  async markAllAsRead(userId, workspaceId = null) {
    let query = 'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0';
    const params = [userId];

    if (workspaceId) {
      query += ' AND (workspace_id = ? OR workspace_id IS NULL)';
      params.push(workspaceId);
    }

    await db.execute(query, params);
    return { success: true, message: 'All notifications marked as read.' };
  }
}

module.exports = new NotificationService();
