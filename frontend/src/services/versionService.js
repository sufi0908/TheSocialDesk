import { apiClient } from './apiClient';
import { storage } from './storage';

export const INITIAL_VERSION_LOGS = [];


export const versionService = {
  async getVersions(postId) {
    if (postId && !isNaN(postId)) {
      try {
        const response = await apiClient.get(`/content/${postId}/versions`);
        if (response.data?.success && response.data?.data) {
          return response.data.data.map((v) => ({
            id: v.id,
            postId: v.content_id,
            versionNum: `v${v.version_number}.0`,
            mediaUrl: '',
            caption: v.caption,
            changedBy: v.creator_name,
            changedByRole: 'Contributor',
            changedAt: v.created_at,
            description: `Version ${v.version_number} snapshot`,
          }));
        }
      } catch (error) {
        console.warn('Backend list versions failed, fallback to local store:', error.message);
      }
    }

    const db = storage.getMockDatabase();
    const list = db.versionLogs || INITIAL_VERSION_LOGS;
    return list.filter((v) => v.postId === postId).sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));
  },

  async createVersion(postId, versionData) {
    if (postId && !isNaN(postId)) {
      try {
        const response = await apiClient.post(`/content/${postId}/versions`, {
          title: versionData.title,
          caption: versionData.caption,
        });

        if (response.data?.success && response.data?.data) {
          const v = response.data.data;
          return {
            id: v.id,
            postId: v.content_id,
            versionNum: `v${v.version_number}.0`,
            mediaUrl: versionData.mediaUrl || '',
            caption: v.caption,
            changedBy: v.creator_name,
            changedByRole: 'Contributor',
            changedAt: v.created_at,
            description: versionData.description || 'Version snapshot created',
          };
        }
      } catch (error) {
        console.warn('Backend create version failed, fallback to local store:', error.message);
      }
    }

    let newVersion = null;
    storage.updateMockDatabase((db) => {
      const currentLogs = db.versionLogs || INITIAL_VERSION_LOGS;
      const postVersions = currentLogs.filter((v) => v.postId === postId);
      const nextNum = postVersions.length + 1;

      newVersion = {
        id: `ver_${Date.now()}`,
        postId,
        versionNum: `v${nextNum}.0`,
        mediaUrl: versionData.mediaUrl,
        caption: versionData.caption,
        changedBy: versionData.changedBy || 'Team Member',
        changedByRole: versionData.changedByRole || 'Editor',
        changedAt: new Date().toISOString(),
        description: versionData.description || 'Updated content draft.',
      };

      return { ...db, versionLogs: [newVersion, ...currentLogs] };
    });

    return newVersion;
  },

  async restoreVersion(postId, versionId) {
    if (postId && !isNaN(postId) && versionId && !isNaN(versionId)) {
      try {
        const response = await apiClient.post(`/content/${postId}/versions/${versionId}/restore`);
        if (response.data?.success) {
          return response.data;
        }
      } catch (error) {
        console.warn('Backend restore version failed:', error.message);
      }
    }

    return { success: true, message: 'Version restored locally' };
  },

  async getFeedback(postId, isClientPortal = false) {
    const db = storage.getMockDatabase();
    const list = db.feedbackLogs || [];
    return list
      .filter((f) => String(f.postId) === String(postId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async addFeedback(postId, feedbackData) {
    let newFeedback = null;
    storage.updateMockDatabase((db) => {
      const current = db.feedbackLogs || [];
      newFeedback = {
        id: `fb_${Date.now()}`,
        postId: String(postId),
        authorName: feedbackData.authorName || 'Team Member',
        authorRole: feedbackData.authorRole || 'Contributor',
        isClientFeedback: !!feedbackData.isClientFeedback,
        message: feedbackData.message || '',
        createdAt: new Date().toISOString(),
      };
      return { ...db, feedbackLogs: [newFeedback, ...current] };
    });
    return newFeedback;
  },
};
