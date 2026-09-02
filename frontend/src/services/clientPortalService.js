import { apiClient } from './apiClient';
import { storage } from './storage';
import { STATUS_TYPES } from '../utils/constants';

export const INITIAL_CLIENT_PORTAL_POSTS = [];

export const clientPortalService = {
  async getDashboardMetrics() {
    try {
      const posts = await this.getClientPosts('All');
      return {
        pendingApprovalCount: posts.filter((p) => p.statusKey === STATUS_TYPES.CLIENT_REVIEW || p.statusKey === 'client_review').length,
        approvedCount: posts.filter((p) => p.statusKey === STATUS_TYPES.APPROVED || p.statusKey === 'approved').length,
        revisionRequiredCount: posts.filter((p) => p.statusKey === STATUS_TYPES.REVISION_REQUIRED || p.statusKey === 'revision_required').length,
        rejectedCount: posts.filter((p) => p.statusKey === STATUS_TYPES.REJECTED || p.statusKey === 'rejected').length,
        scheduledCount: posts.filter((p) => p.statusKey === STATUS_TYPES.SCHEDULED || p.statusKey === 'scheduled').length,
      };
    } catch (error) {
      console.warn('Backend client metrics failed, fallback to local store:', error.message);
    }

    const db = storage.getMockDatabase();
    const posts = db.clientPortalPosts || INITIAL_CLIENT_PORTAL_POSTS;

    return {
      pendingApprovalCount: posts.filter((p) => p.statusKey === STATUS_TYPES.CLIENT_REVIEW).length,
      approvedCount: posts.filter((p) => p.statusKey === STATUS_TYPES.APPROVED).length,
      revisionRequiredCount: posts.filter((p) => p.statusKey === STATUS_TYPES.REVISION_REQUIRED).length,
      rejectedCount: posts.filter((p) => p.statusKey === STATUS_TYPES.REJECTED).length,
      scheduledCount: posts.filter((p) => p.statusKey === STATUS_TYPES.SCHEDULED).length,
    };
  },

  async getClientPosts(statusFilter = 'All', search = '') {
    try {
      const params = {};
      if (statusFilter && statusFilter !== 'All') {
        params.status = statusFilter;
      }
      if (search) {
        params.search = search;
      }

      const response = await apiClient.get('/content', { params });
      if (response.data?.success && Array.isArray(response.data?.data)) {
        return response.data.data.map((c) => ({
          id: c.id,
          title: c.title,
          caption: c.caption || '',
          contentType: c.content_type || 'Single Post',
          client: c.client_name || c.client_company_name || 'Your Brand',
          clientId: c.client_id,
          project: c.project_name || 'General Campaign',
          version: 'v1.0',
          assigneeName: c.assignee_name || 'Agency Team',
          platforms: c.platforms || ['instagram'],
          mediaUrl: c.mediaUrl || (c.mediaAssets && c.mediaAssets[0]?.file_url) || '',
          media: c.media || null,
          mediaAssets: c.mediaAssets || [],
          statusKey: (c.status || 'DRAFT').toLowerCase(),
          createdAt: c.created_at,
          scheduledAt: c.scheduled_at,
        }));
      }
    } catch (error) {
      console.warn('Backend list client posts failed, fallback to local store:', error.message);
    }

    const db = storage.getMockDatabase();
    let posts = db.clientPortalPosts || INITIAL_CLIENT_PORTAL_POSTS;

    if (statusFilter && statusFilter !== 'All') {
      posts = posts.filter((p) => p.statusKey === statusFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      posts = posts.filter(
        (p) => p.title.toLowerCase().includes(q) || p.caption.toLowerCase().includes(q)
      );
    }

    return posts;
  },

  async approvePost(postId) {
    const response = await apiClient.post(`/content/${postId}/client-approve`, { notes: 'Approved by Client' });
    return response.data?.data || { id: postId, statusKey: STATUS_TYPES.APPROVED };
  },

  async requestRevision(postId, reason) {
    const response = await apiClient.post(`/content/${postId}/client-revision`, { notes: reason, comment: reason });
    return response.data?.data || { id: postId, statusKey: STATUS_TYPES.REVISION_REQUIRED };
  },
};
