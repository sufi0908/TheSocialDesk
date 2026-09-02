import { apiClient } from './apiClient';

export const revisionService = {
  /**
   * Request a revision on a content item.
   */
  createRevisionRequest: async (contentId, payload) => {
    const response = await apiClient.post(`/revisions/content/${contentId}`, payload);
    return response.data;
  },

  /**
   * Get revision history for a content item.
   */
  getRevisionHistory: async (contentId) => {
    const response = await apiClient.get(`/revisions/content/${contentId}/history`);
    return response.data;
  },

  /**
   * Start working on a revision (status -> IN_PROGRESS).
   */
  startRevision: async (revisionId) => {
    const response = await apiClient.patch(`/revisions/${revisionId}/start`);
    return response.data;
  },

  /**
   * Resubmit content after completing revisions (status -> RESUBMITTED / PENDING_APPROVAL).
   */
  resubmitRevision: async (revisionId, payload) => {
    const response = await apiClient.patch(`/revisions/${revisionId}/resubmit`, payload);
    return response.data;
  },

  /**
   * Resolve revision request and approve content (status -> RESOLVED / APPROVED).
   */
  resolveAndApprove: async (revisionId, payload = {}) => {
    const response = await apiClient.patch(`/revisions/${revisionId}/resolve`, payload);
    return response.data;
  },

  /**
   * List revisions assigned to or requested by user.
   */
  getMyRevisions: async (filters = {}) => {
    const response = await apiClient.get('/revisions/my', { params: filters });
    return response.data;
  },
};
