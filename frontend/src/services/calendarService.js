import { apiClient } from './apiClient';
import { storage } from './storage';
import { STATUS_TYPES } from '../utils/constants';

export const calendarService = {
  /**
   * Fetch scheduled events for FullCalendar and list views.
   */
  async getCalendarPosts(clientId = null, startDate = null, endDate = null) {
    try {
      const params = {};
      if (clientId && clientId !== 'All') params.clientId = clientId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await apiClient.get('/calendar', { params });
      if (response.data?.success && Array.isArray(response.data?.data)) {
        return response.data.data.map((item) => {
          const dtRaw = item.scheduled_at || item.start_time;
          let dateStr = '';
          let timeStr = '12:00';
          let startIso = '';

          if (dtRaw) {
            const dt = new Date(dtRaw);
            if (!isNaN(dt.getTime())) {
              startIso = dt.toISOString();
              dateStr = dt.toISOString().split('T')[0];
              const hours = String(dt.getHours()).padStart(2, '0');
              const minutes = String(dt.getMinutes()).padStart(2, '0');
              timeStr = `${hours}:${minutes}`;
            }
          }

          return {
            id: item.content_id || item.event_id,
            contentId: item.content_id,
            eventId: item.event_id,
            title: item.title,
            client: item.client_name || item.client_company_name || 'Client',
            clientId: item.client_id,
            project: item.project_name || 'General Campaign',
            projectId: item.project_id,
            time: timeStr,
            date: dateStr,
            start: startIso || `${dateStr}T${timeStr}:00`,
            statusKey: item.content_status || item.event_status || STATUS_TYPES.SCHEDULED,
            assigneeName: item.assignee_name || 'Unassigned',
            assigneeAvatar: item.assignee_avatar || '',
            creatorName: item.creator_name || 'Team Member',
            reviewerName: item.reviewer_name || 'Reviewer',
            platforms: item.platforms || ['instagram'],
            caption: item.caption || '',
            mediaUrl: item.mediaUrl || null,
            media: item.media || null,
            mediaAssets: item.mediaAssets || [],
            timezone: item.timezone || 'UTC',
          };
        });
      }
    } catch (error) {
      console.warn('Backend getCalendarPosts failed, fallback to local storage:', error.message);
    }

    const db = storage.getMockDatabase();
    let list = db.calendarPosts || [];
    if (clientId && clientId !== 'All') {
      list = list.filter((p) => String(p.clientId) === String(clientId));
    }
    if (startDate) {
      const sDay = startDate.slice(0, 10);
      list = list.filter((p) => (p.date || p.scheduledAt || '') >= sDay);
    }
    if (endDate) {
      const eDay = endDate.slice(0, 10);
      list = list.filter((p) => (p.date || p.scheduledAt || '') <= eDay);
    }
    return list;
  },

  /**
   * Fetch approved unscheduled queue.
   */
  async getUnscheduledApprovedPosts(clientId = null) {
    try {
      const params = {};
      if (clientId && clientId !== 'All') params.clientId = clientId;

      const response = await apiClient.get('/calendar/unscheduled', { params });
      if (response.data?.success && Array.isArray(response.data?.data)) {
        return response.data.data.map((item) => ({
          id: item.content_id,
          contentId: item.content_id,
          title: item.title,
          client: item.client_name || item.client_company_name || 'Client',
          clientId: item.client_id,
          project: item.project_name || 'General Campaign',
          projectId: item.project_id,
          statusKey: STATUS_TYPES.APPROVED,
          calendarStatus: 'UNSCHEDULED',
          assigneeName: item.assignee_name || 'Unassigned',
          assigneeAvatar: item.assignee_avatar || '',
          creatorName: item.creator_name || 'Team Member',
          reviewerName: item.reviewer_name || 'Reviewer',
          platforms: item.platforms || ['instagram'],
          caption: item.caption || '',
          mediaUrl: item.mediaUrl || null,
          media: item.media || null,
          mediaAssets: item.mediaAssets || [],
          contentType: item.content_type || 'POST',
        }));
      }
    } catch (error) {
      console.warn('Backend getUnscheduledApprovedPosts failed, fallback to local storage:', error.message);
    }

    const db = storage.getMockDatabase();
    let list = db.unscheduledApproved || [];
    if (clientId && clientId !== 'All') {
      list = list.filter((p) => String(p.clientId) === String(clientId));
    }
    return list;
  },

  /**
   * Schedule an approved content item.
   */
  async schedulePost(postData) {
    const targetId = postData.contentId || postData.id;
    if (targetId && !isNaN(targetId)) {
      try {
        const response = await apiClient.post('/calendar/schedule', {
          contentId: targetId,
          date: postData.date,
          time: postData.time,
          scheduledAt: postData.scheduledAt,
          timezone: postData.timezone || 'UTC',
          platforms: postData.platforms,
        });
        if (response.data?.success) {
          return response.data.data;
        }
      } catch (error) {
        console.error('Backend schedulePost error:', error);
        throw new Error(error.response?.data?.message || 'Failed to schedule post.');
      }
    }

    let scheduledItem = null;
    storage.updateMockDatabase((db) => {
      const currentCal = db.calendarPosts || [];
      const currentUnscheduled = db.unscheduledApproved || [];

      scheduledItem = {
        id: targetId || `cal_${Date.now()}`,
        contentId: targetId,
        title: postData.title,
        client: postData.client,
        clientId: postData.clientId,
        project: postData.project,
        time: postData.time,
        date: postData.date,
        statusKey: STATUS_TYPES.SCHEDULED,
        assigneeName: postData.assigneeName || 'Team Member',
        platforms: postData.platforms || ['instagram'],
        caption: postData.caption,
        mediaUrl: postData.mediaUrl,
      };

      const updatedUnscheduled = currentUnscheduled.filter((u) => String(u.id) !== String(targetId));
      return { ...db, calendarPosts: [scheduledItem, ...currentCal], unscheduledApproved: updatedUnscheduled };
    });

    return scheduledItem;
  },

  /**
   * Reschedule an existing scheduled post.
   */
  async reschedulePost(postId, date, time) {
    if (postId && !isNaN(postId)) {
      try {
        const response = await apiClient.put(`/calendar/${postId}`, {
          date,
          time,
          scheduledAt: `${date} ${time}:00`,
        });
        if (response.data?.success) {
          return response.data.data;
        }
      } catch (error) {
        console.error('Backend reschedulePost error:', error);
        throw new Error(error.response?.data?.message || 'Failed to reschedule post.');
      }
    }

    let updatedItem = null;
    storage.updateMockDatabase((db) => {
      const currentCal = db.calendarPosts || [];
      const updatedList = currentCal.map((p) => {
        if (String(p.id) === String(postId)) {
          updatedItem = { ...p, date, time };
          return updatedItem;
        }
        return p;
      });
      return { ...db, calendarPosts: updatedList };
    });

    return updatedItem;
  },

  /**
   * Check for schedule conflicts.
   */
  async checkConflict({ clientId, contentId, platforms, date, time }) {
    try {
      const response = await apiClient.post('/calendar/check-conflict', {
        clientId,
        contentId,
        platforms,
        date,
        time,
      });
      if (response.data?.success) {
        return response.data.data;
      }
    } catch (error) {
      console.warn('Conflict check failed:', error);
    }
    return { hasConflict: false };
  },

  /**
   * Unschedule content back to APPROVED queue.
   */
  async unschedulePost(postId) {
    if (postId && !isNaN(postId)) {
      try {
        const response = await apiClient.delete(`/calendar/${postId}`);
        if (response.data?.success) {
          return response.data;
        }
      } catch (error) {
        console.error('Backend unschedulePost error:', error);
        throw new Error(error.response?.data?.message || 'Failed to unschedule post.');
      }
    }

    let unscheduledItem = null;
    storage.updateMockDatabase((db) => {
      const currentCal = db.calendarPosts || [];
      const currentUnscheduled = db.unscheduledApproved || [];

      const targetPost = currentCal.find((p) => String(p.id) === String(postId));
      const updatedCal = currentCal.filter((p) => String(p.id) !== String(postId));

      if (targetPost) {
        unscheduledItem = { ...targetPost, statusKey: STATUS_TYPES.APPROVED };
        return { ...db, calendarPosts: updatedCal, unscheduledApproved: [unscheduledItem, ...currentUnscheduled] };
      }

      return { ...db, calendarPosts: updatedCal };
    });

    return unscheduledItem;
  },

  /**
   * Mark content as published.
   */
  async markPublished(postId) {
    if (postId && !isNaN(postId)) {
      try {
        const response = await apiClient.patch(`/calendar/${postId}/published`);
        if (response.data?.success) {
          return response.data.data;
        }
      } catch (error) {
        console.error('Backend markPublished error:', error);
        throw new Error(error.response?.data?.message || 'Failed to mark post as published.');
      }
    }

    let updatedItem = null;
    storage.updateMockDatabase((db) => {
      const currentCal = db.calendarPosts || [];
      const updatedList = currentCal.map((p) => {
        if (String(p.id) === String(postId)) {
          updatedItem = { ...p, statusKey: STATUS_TYPES.PUBLISHED };
          return updatedItem;
        }
        return p;
      });
      return { ...db, calendarPosts: updatedList };
    });

    return updatedItem;
  },
};
