import { apiClient } from './apiClient';
import { storage } from './storage';
import { STATUS_TYPES, ROLES } from '../utils/constants';

export const PLATFORMS = {
  INSTAGRAM: { id: 'instagram', name: 'Instagram', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  FACEBOOK: { id: 'facebook', name: 'Facebook', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  TIKTOK: { id: 'tiktok', name: 'TikTok', color: 'bg-slate-900 text-white border-slate-900' },
  LINKEDIN: { id: 'linkedin', name: 'LinkedIn', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  YOUTUBE: { id: 'youtube', name: 'YouTube', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  X: { id: 'x', name: 'X (Twitter)', color: 'bg-slate-100 text-slate-900 border-slate-300' },
};

export const INITIAL_CONTENT_POSTS = [];

export const contentService = {
  async getContentPosts(filters = {}, options = {}) {
    try {
      const cleanParams = {};
      Object.keys(filters).forEach((key) => {
        const val = filters[key];
        if (val !== undefined && val !== null && val !== '' && val !== 'All' && val !== 'all') {
          cleanParams[key] = val;
        }
      });
      const response = await apiClient.get('/content', { params: cleanParams, ...options });
      if (response.data?.success && Array.isArray(response.data?.data)) {
        return response.data.data.map((c) => ({
          id: c.id,
          title: c.title,
          caption: c.caption || '',
          contentType: c.content_type || 'Single Post',
          client: c.client_name || c.client_company_name || 'General Client',
          clientId: c.client_id,
          project: c.project_name || 'General Project',
          projectId: c.project_id,
          version: 'v1.0',
          assigneeName: c.assignee_name || 'Unassigned',
          assigneeAvatar: c.assignee_avatar || '',
          assignedTo: c.assigned_to,
          reviewerName: c.reviewer_name || '',
          reviewerId: c.reviewer_id,
          platforms: c.platforms || ['instagram'],
          mediaUrl: c.mediaUrl || c.media_url || (c.mediaAssets && c.mediaAssets[0]?.file_url) || (c.media_assets && c.media_assets[0]?.file_url) || '',
          mediaAssets: c.mediaAssets || c.media_assets || [],
          media: c.media || null,
          statusKey: (c.status || 'DRAFT').toLowerCase(),
          createdAt: c.created_at,
          scheduledAt: c.scheduled_at,
        }));
      }
    } catch (error) {
      console.warn('Backend list content failed, fallback to local store:', error.message);
    }

    const db = storage.getMockDatabase();
    let list = db.contentPosts || INITIAL_CONTENT_POSTS;

    if (filters.statusKey && filters.statusKey !== 'All') {
      list = list.filter((p) => p.statusKey === filters.statusKey);
    }

    if (filters.clientId && filters.clientId !== 'All') {
      list = list.filter((p) => p.clientId === filters.clientId);
    }

    if (filters.projectId && filters.projectId !== 'All') {
      list = list.filter((p) => p.projectId === filters.projectId || p.project === filters.projectId);
    }

    if (filters.assigneeName && filters.assigneeName !== 'All') {
      list = list.filter((p) => p.assigneeName === filters.assigneeName);
    }

    if (filters.platform && filters.platform !== 'All') {
      list = list.filter((p) => p.platforms.includes(filters.platform));
    }

    if (filters.contentType && filters.contentType !== 'All') {
      list = list.filter((p) => p.contentType === filters.contentType);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.caption.toLowerCase().includes(q) ||
          p.client.toLowerCase().includes(q)
      );
    }

    return list;
  },

  async createContentPost(postData) {
    if (postData.clientId || postData.client) {
      try {
        const response = await apiClient.post('/content', {
          title: postData.title,
          caption: postData.caption || postData.bodyText,
          contentType: postData.contentType || 'Single Post',
          clientId: postData.clientId || (typeof postData.client === 'number' ? postData.client : undefined),
          projectId: postData.projectId || (typeof postData.project === 'number' ? postData.project : undefined),
          assignedTo: postData.assigneeId || postData.assignedTo,
          reviewerId: postData.reviewerId,
          dueDate: postData.dueDate,
          status: postData.statusKey || postData.status || 'DRAFT',
          internalNotes: postData.notes || postData.internalNotes,
          platforms: postData.platforms || ['instagram'],
          assetId: postData.assetId,
          assetIds: postData.assetIds,
          mediaAssetIds: postData.mediaAssetIds,
          mediaUrl: postData.mediaUrl,
          mediaAssets: postData.mediaAssets,
        });

        if (response.data?.success && response.data?.data) {
          const c = response.data.data;
          const newPost = {
            id: c.id,
            title: c.title,
            caption: c.caption || '',
            contentType: c.content_type || 'Single Post',
            client: c.client_name || c.client_company_name || 'General Client',
            clientId: c.client_id,
            project: c.project_name || 'General Project',
            projectId: c.project_id,
            version: 'v1.0',
            assigneeName: c.assignee_name || 'Unassigned',
            assigneeAvatar: c.assignee_avatar || '',
            assignedTo: c.assigned_to,
            reviewerName: c.reviewer_name || '',
            reviewerId: c.reviewer_id,
            platforms: c.platforms || ['instagram'],
            mediaUrl: c.mediaUrl || (c.mediaAssets && c.mediaAssets[0]?.file_url) || postData.mediaUrl || '',
            mediaAssets: c.mediaAssets || postData.mediaAssets || [],
            media: c.media || null,
            statusKey: (c.status || 'DRAFT').toLowerCase(),
            createdAt: c.created_at,
            scheduledAt: c.scheduled_at,
          };

          storage.updateMockDatabase((db) => {
            const current = db.contentPosts || INITIAL_CONTENT_POSTS;
            return { ...db, contentPosts: [newPost, ...current] };
          });

          return newPost;
        }
      } catch (error) {
        console.warn('Backend createContentPost failed, using local store:', error.message);
      }
    }

    const newPost = {
      id: `cnt_${Date.now()}`,
      statusKey: postData.statusKey || STATUS_TYPES.DRAFT,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
      mediaUrl: postData.mediaUrl || '',
      platforms: postData.platforms || ['instagram'],
      ...postData,
    };

    storage.updateMockDatabase((db) => {
      const current = db.contentPosts || INITIAL_CONTENT_POSTS;
      return { ...db, contentPosts: [newPost, ...current] };
    });

    return newPost;
  },

  async updateContentPost(id, updatedFields) {
    if (id && !isNaN(id)) {
      try {
        const response = await apiClient.put(`/content/${id}`, {
          title: updatedFields.title,
          caption: updatedFields.caption,
          bodyText: updatedFields.bodyText,
          contentType: updatedFields.contentType,
          assignedTo: updatedFields.assignedTo || updatedFields.assigneeId,
          status: updatedFields.statusKey || updatedFields.status,
          platforms: updatedFields.platforms,
          assetId: updatedFields.assetId,
          assetIds: updatedFields.assetIds,
          mediaAssetIds: updatedFields.mediaAssetIds,
          mediaUrl: updatedFields.mediaUrl,
          mediaAssets: updatedFields.mediaAssets,
        });
        if (response.data?.success) {
          const c = response.data.data;
          return {
            id: c.id,
            title: c.title,
            caption: c.caption || '',
            statusKey: c.status,
            mediaUrl: c.mediaUrl || (c.mediaAssets && c.mediaAssets[0]?.file_url) || updatedFields.mediaUrl || '',
            mediaAssets: c.mediaAssets || updatedFields.mediaAssets || [],
            media: c.media || null,
            ...updatedFields,
          };
        }
      } catch (error) {
        console.warn('Backend updateContentPost failed:', error.message);
      }
    }

    let result = null;
    storage.updateMockDatabase((db) => {
      const current = db.contentPosts || INITIAL_CONTENT_POSTS;
      const updatedList = current.map((p) => {
        if (p.id === id) {
          result = { ...p, ...updatedFields };
          return result;
        }
        return p;
      });

      if (result && result.statusKey === STATUS_TYPES.APPROVED) {
        const unscheduled = db.unscheduledApproved || [];
        const calendar = db.calendarPosts || [];
        const existsInUnscheduled = unscheduled.some((u) => u.id === result.id || u.title === result.title);
        const existsInCalendar = calendar.some((c) => c.id === result.id || c.title === result.title);

        if (!existsInUnscheduled && !existsInCalendar) {
          const unscheduledItem = {
            id: `un_${result.id}`,
            title: result.title,
            client: result.client,
            clientId: result.clientId,
            project: result.project,
            statusKey: STATUS_TYPES.APPROVED,
            assigneeName: result.assigneeName,
            assigneeAvatar: result.assigneeAvatar || '',
            platforms: result.platforms || ['instagram'],
            mediaUrl: result.mediaUrl || '',
            caption: result.caption,
            contentType: result.contentType || 'Single Post',
            approvedAt: new Date().toISOString(),
          };

          return { ...db, contentPosts: updatedList, unscheduledApproved: [unscheduledItem, ...unscheduled] };
        }
      }

      return { ...db, contentPosts: updatedList };
    });

    return result;
  },

  async updatePostStatus(id, newStatusKey, extraData = {}) {
    if (id && !isNaN(id)) {
      try {
        await apiClient.patch(`/content/${id}/status`, { status: newStatusKey });
      } catch (error) {
        console.warn('Backend updatePostStatus failed:', error.message);
      }
    }
    return await this.updateContentPost(id, { statusKey: newStatusKey, ...extraData });
  },

  async deleteContentPost(id) {
    if (id && !isNaN(id)) {
      try {
        await apiClient.delete(`/content/${id}`);
      } catch (error) {
        console.warn('Backend deleteContentPost failed:', error.message);
      }
    }
    storage.updateMockDatabase((db) => {
      const current = db.contentPosts || INITIAL_CONTENT_POSTS;
      return { ...db, contentPosts: current.filter((p) => p.id !== id) };
    });
    return true;
  },

  async duplicateContentPost(id) {
    let duplicatedPost = null;

    storage.updateMockDatabase((db) => {
      const current = db.contentPosts || INITIAL_CONTENT_POSTS;
      const target = current.find((p) => p.id === id);
      if (!target) return db;

      duplicatedPost = {
        ...target,
        id: `cnt_${Date.now()}`,
        title: `Copy of ${target.title}`,
        statusKey: STATUS_TYPES.DRAFT,
        createdAt: new Date().toISOString(),
        scheduledAt: null,
        publishedAt: null,
        revisions: [],
        approvalHistory: [],
      };

      return { ...db, contentPosts: [duplicatedPost, ...current] };
    });

    return duplicatedPost;
  },

  async bulkUpdateStatus(ids, newStatusKey) {
    for (const id of ids) {
      await this.updatePostStatus(id, newStatusKey);
    }
    return true;
  },

  async bulkDeleteContent(ids) {
    for (const id of ids) {
      await this.deleteContentPost(id);
    }
    return true;
  },
};
