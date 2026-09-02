import { apiClient } from './apiClient';
import { storage } from './storage';
import { STATUS_TYPES, ROLES } from '../utils/constants';

export const INITIAL_APPROVAL_POSTS = [];

export const approvalService = {
  /**
   * List content posts for approvals workflow.
   */
  async getApprovalPosts(filters = {}) {
    try {
      const response = await apiClient.get('/content', { params: filters });
      if (response.data?.success && response.data?.data) {
        return response.data.data.map((c) => ({
          id: c.id,
          title: c.title,
          caption: c.caption || '',
          contentType: c.content_type || 'Single Post',
          client: c.client_name || c.client_company_name || 'General Client',
          clientId: c.client_id,
          project: c.project_name || 'General Project',
          version: 'v1.0',
          creator: c.creator_name || 'Team Member',
          creatorAvatar: c.creator_avatar || '',
          assigneeName: c.assignee_name || 'Unassigned',
          assigneeAvatar: c.assignee_avatar || '',
          assigneeRole: ROLES.GRAPHIC_DESIGNER,
          platforms: c.platforms || ['instagram'],
          mediaUrl: c.mediaUrl || (c.mediaAssets && c.mediaAssets[0]?.file_url) || '',
          media: c.media || null,
          mediaAssets: c.mediaAssets || [],
          statusKey: (c.status || 'DRAFT').toLowerCase(),
          submittedAt: c.created_at,
          revisions: [],
        }));
      }
    } catch (error) {
      console.warn('Backend list content for approval failed, fallback to local store:', error.message);
    }

    const db = storage.getMockDatabase();
    let list = db.approvalPosts || INITIAL_APPROVAL_POSTS;

    if (filters.statusKey && filters.statusKey !== 'All') {
      list = list.filter((p) => p.statusKey === filters.statusKey);
    }

    if (filters.clientId) {
      list = list.filter((p) => p.clientId === filters.clientId);
    }

    return list;
  },

  /**
   * Submit post for internal review.
   */
  async submitInternalReview(postId, data = {}) {
    const payload = typeof data === 'string' ? { notes: data } : data;
    const response = await apiClient.post(`/content/${postId}/submit-internal-review`, payload);
    return response.data?.data || { id: postId, statusKey: STATUS_TYPES.INTERNAL_REVIEW };
  },

  /**
   * Internal Reviewer / Manager approves post -> Moves to CLIENT_REVIEW.
   */
  async internalApprove(postId, data = {}) {
    const payload = typeof data === 'string' ? { notes: data } : data;
    const response = await apiClient.post(`/content/${postId}/internal-approve`, payload);
    return response.data?.data || { id: postId, statusKey: STATUS_TYPES.CLIENT_REVIEW };
  },

  // Alias for backward compatibility
  async approveInternal(postId, reviewerName = 'Reviewer', notes = '') {
    const noteText = typeof reviewerName === 'string' && notes ? notes : typeof reviewerName === 'string' ? '' : reviewerName?.notes || '';
    return this.internalApprove(postId, { notes: noteText });
  },

  /**
   * Internal Reviewer / Manager requests revision -> Moves to REVISION_REQUIRED.
   */
  async internalRevision(postId, data = {}) {
    const payload = typeof data === 'string' ? { notes: data, comment: data } : data;
    const response = await apiClient.post(`/content/${postId}/internal-revision`, payload);
    return response.data?.data || { id: postId, statusKey: STATUS_TYPES.REVISION_REQUIRED };
  },

  async requestInternalRevision(postId, comment = '') {
    return this.internalRevision(postId, { notes: comment, comment });
  },

  /**
   * Team Member resubmits content after making revisions.
   */
  async resubmitContent(postId, data = {}) {
    const payload = typeof data === 'string' ? { notes: data } : data;
    const response = await apiClient.post(`/content/${postId}/resubmit`, payload);
    return response.data?.data || { id: postId, statusKey: STATUS_TYPES.INTERNAL_REVIEW };
  },

  /**
   * Submit directly for client review.
   */
  async submitClientReview(postId, data = {}) {
    const payload = typeof data === 'string' ? { notes: data } : data;
    const response = await apiClient.post(`/content/${postId}/submit-client-review`, payload);
    return response.data?.data || { id: postId, statusKey: STATUS_TYPES.CLIENT_REVIEW };
  },

  /**
   * Client approves content inside SocialDesk -> Moves to APPROVED.
   */
  async clientApprove(postId, data = {}) {
    const payload = typeof data === 'string' ? { notes: data } : data;
    const response = await apiClient.post(`/content/${postId}/client-approve`, payload);
    return response.data?.data || { id: postId, statusKey: STATUS_TYPES.APPROVED, calendarStatus: 'UNSCHEDULED' };
  },

  // Alias for backward compatibility
  async approveClient(postId, clientName = 'Client', notes = '') {
    const noteText = typeof clientName === 'string' && notes ? notes : typeof clientName === 'string' ? '' : clientName?.notes || '';
    return this.clientApprove(postId, { notes: noteText });
  },

  /**
   * Client requests revision -> Moves to REVISION_REQUIRED.
   */
  async clientRevision(postId, data = {}) {
    const payload = typeof data === 'string' ? { notes: data, comment: data } : data;
    const response = await apiClient.post(`/content/${postId}/client-revision`, payload);
    return response.data?.data || { id: postId, statusKey: STATUS_TYPES.REVISION_REQUIRED };
  },

  async requestClientRevision(postId, comment = '') {
    return this.clientRevision(postId, { notes: comment, comment });
  },

  /**
   * Universal revision request helper.
   */
  async requestRevision(postId, arg2, arg3, arg4) {
    let actualReason = typeof arg2 === 'string' ? arg2 : '';
    if (typeof arg4 === 'string' && arg4.trim().length > 0) {
      actualReason = arg4;
    } else if (typeof arg3 === 'string' && arg3.trim().length > 0) {
      actualReason = arg3;
    }
    return this.clientRevision(postId, { notes: actualReason, comment: actualReason });
  },

  /**
   * Workspace Manager records external client approval (e.g. WhatsApp, Email, Phone, Other).
   */
  async externalClientApprove(postId, data = {}) {
    const response = await apiClient.post(`/content/${postId}/external-client-approve`, data);
    return response.data?.data || { id: postId, statusKey: STATUS_TYPES.APPROVED, calendarStatus: 'UNSCHEDULED' };
  },

  async markExternalClientApproval(postId, data = {}) {
    return this.externalClientApprove(postId, data);
  },

  /**
   * Reject post.
   */
  async rejectPost(postId, reason, reviewerName) {
    const reasonText = typeof reason === 'string' ? reason : reason?.notes || reason?.reason || 'Rejected.';
    const response = await apiClient.post(`/content/${postId}/reject`, { notes: reasonText, reason: reasonText });
    return response.data?.data || { id: postId, statusKey: STATUS_TYPES.REJECTED };
  },

  /**
   * Get approval log trail history.
   */
  async getApprovalHistory(postId) {
    if (postId && !isNaN(postId)) {
      try {
        const response = await apiClient.get(`/content/${postId}/approvals`);
        if (response.data?.success && response.data?.data) {
          return response.data.data;
        }
      } catch (error) {
        console.warn('Backend getApprovalHistory failed:', error.message);
      }
    }
    return [];
  },
};
