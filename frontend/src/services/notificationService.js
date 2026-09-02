import { io } from 'socket.io-client';
import { apiClient } from './apiClient';
import { storage } from './storage';
import { LOCAL_STORAGE_KEYS } from '../utils/constants';

let socketInstance = null;

export const NOTIFICATION_EVENTS = {
  TASK_ASSIGNED: 'Task Assigned',
  TASK_REASSIGNED: 'Task Reassigned',
  TASK_STATUS_CHANGED: 'Task Status Changed',
  TASK_COMPLETED: 'Task Completed',
  TASK_REOPENED: 'Task Reopened',
  TASK_COMMENT: 'Task Comment',
  TASK_ATTACHMENT: 'Task Attachment',
  CONTENT_ASSIGNED: 'Content Assigned',
  CONTENT_SUBMITTED: 'Content Submitted',
  APPROVAL_REQUESTED: 'Approval Requested',
  CONTENT_APPROVED: 'Content Approved',
  REVISION_REQUESTED: 'Revision Requested',
  CONTENT_REJECTED: 'Content Rejected',
  CLIENT_APPROVED: 'Client Approved',
  CONTENT_SCHEDULED: 'Content Scheduled',
  CALENDAR_UPDATED: 'Calendar Updated',
  ASSET_UPLOADED: 'Asset Uploaded',
  CHAT_MENTION: 'Chat Mention',
  CHAT_MESSAGE: 'Chat Message',
};

function normalizeNotification(n) {
  if (!n) return null;

  const targetLink =
    n.link ||
    (n.relatedTaskId || n.related_task_id
      ? `/workspace/tasks/${n.relatedTaskId || n.related_task_id}`
      : n.relatedContentId || n.related_content_id
      ? `/workspace/content/${n.relatedContentId || n.related_content_id}`
      : '/workspace/notifications');

  const createdAtDate = n.createdAt || n.created_at ? new Date(n.createdAt || n.created_at) : new Date();

  return {
    id: n.id,
    userId: n.userId || n.user_id,
    workspaceId: n.workspaceId || n.workspace_id,
    eventType: n.type || 'SYSTEM',
    type: n.type || 'SYSTEM',
    title: n.title || 'Notification',
    message: n.message || '',
    link: targetLink,
    relatedContentId: n.relatedContentId || n.related_content_id || null,
    relatedTaskId: n.relatedTaskId || n.related_task_id || null,
    relatedRevisionId: n.relatedRevisionId || n.related_revision_id || null,
    isRead: Boolean(n.isRead || n.is_read),
    readAt: n.readAt || n.read_at || null,
    createdAt: createdAtDate.toISOString(),
    timestamp: createdAtDate.toISOString(),
    time: createdAtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    category: String(n.type || '').includes('TASK')
      ? 'Tasks'
      : String(n.type || '').includes('CHAT') || String(n.type || '').includes('COMMENT')
      ? 'Comments'
      : String(n.type || '').includes('CALENDAR')
      ? 'Calendar'
      : 'Approvals',
  };
}

export const notificationService = {
  /**
   * Connect real-time Socket.IO notification listener.
   */
  connectSocket(onNotificationReceived) {
    const token = storage.get(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
    if (!token) return null;

    if (!socketInstance) {
      const socketUrl =
        import.meta.env.VITE_SOCKET_URL ||
        (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '');

      socketInstance = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      socketInstance.on('notification', (rawNotif) => {
        const normalized = normalizeNotification(rawNotif);
        if (typeof onNotificationReceived === 'function' && normalized) {
          onNotificationReceived(normalized);
        }
      });
    }

    return socketInstance;
  },

  disconnectSocket() {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
  },

  async getNotifications(categoryFilter = 'All') {
    const token = storage.get(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      try {
        const isRead = categoryFilter === 'Unread' ? 'false' : undefined;
        const response = await apiClient.get('/notifications', { params: { isRead, limit: 50 } });
        if (response.data?.success && Array.isArray(response.data?.data)) {
          let list = response.data.data.map(normalizeNotification);

          if (categoryFilter === 'Unread') {
            list = list.filter((n) => !n.isRead);
          } else if (categoryFilter && categoryFilter !== 'All') {
            list = list.filter((n) => n.category === categoryFilter);
          }

          return list;
        }
      } catch (error) {
        console.warn('Backend getNotifications failed:', error.message);
      }
    }
    return [];
  },

  async getUnreadCount() {
    const token = storage.get(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      try {
        const response = await apiClient.get('/notifications/unread-count');
        if (response.data?.success && response.data?.unreadCount !== undefined) {
          return response.data.unreadCount;
        }
      } catch (error) {
        console.warn('Backend getUnreadCount failed:', error.message);
      }
    }
    return 0;
  },

  async markAsRead(id) {
    if (id && !isNaN(id)) {
      try {
        const response = await apiClient.patch(`/notifications/${id}/read`);
        if (response.data?.success) {
          return true;
        }
      } catch (error) {
        console.warn('Backend markAsRead failed:', error.message);
      }
    }
    return false;
  },

  async markAllAsRead() {
    try {
      const response = await apiClient.patch('/notifications/read-all');
      if (response.data?.success) {
        return true;
      }
    } catch (error) {
      console.warn('Backend markAllAsRead failed:', error.message);
    }
    return false;
  },

  async getActivityFeed() {
    try {
      const response = await apiClient.get('/activity');
      if (response.data?.success && response.data?.data) {
        return response.data.data.map((a) => ({
          id: `act_${a.id}`,
          who: a.userName,
          action: a.action,
          resource: `${a.entityType} #${a.entityId}`,
          client: a.clientName || 'Workspace',
          time: new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          avatar: '',
          eventType: a.action,
        }));
      }
    } catch (error) {
      console.warn('Backend getActivityFeed failed:', error.message);
    }
    return [];
  },
};
