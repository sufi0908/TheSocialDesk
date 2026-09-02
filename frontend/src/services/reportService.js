import { apiClient } from './apiClient';

export const reportService = {
  /**
   * Fetch full agency production reports with filters.
   * Scoped to the active workspace via apiClient header 'x-workspace-id'.
   */
  async getAgencyReports(filters = {}) {
    const params = {
      dateRange: filters.dateRange || 'This Month',
      clientId: filters.clientId && filters.clientId !== 'All' ? filters.clientId : undefined,
      projectId: filters.projectId && filters.projectId !== 'All' ? filters.projectId : undefined,
      teamMemberId: filters.teamMemberId && filters.teamMemberId !== 'All' ? filters.teamMemberId : undefined,
      status: filters.status && filters.status !== 'All' ? filters.status : undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
    };

    const response = await apiClient.get('/workspace/reports', { params });
    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to load report data');
  },

  async getOverview(filters = {}) {
    const response = await apiClient.get('/workspace/reports/overview', { params: filters });
    return response.data?.data || null;
  },

  async getTeamWorkload(filters = {}) {
    const response = await apiClient.get('/workspace/reports/team-workload', { params: filters });
    return response.data?.data || [];
  },

  async getProjectProgress(filters = {}) {
    const response = await apiClient.get('/workspace/reports/project-progress', { params: filters });
    return response.data?.data || [];
  },

  async getTaskCompletion(filters = {}) {
    const response = await apiClient.get('/workspace/reports/task-completion', { params: filters });
    return response.data?.data || null;
  },

  async getContentStatus(filters = {}) {
    const response = await apiClient.get('/workspace/reports/content-status', { params: filters });
    return response.data?.data || [];
  },

  async getApprovalStatus(filters = {}) {
    const response = await apiClient.get('/workspace/reports/approval-status', { params: filters });
    return response.data?.data || null;
  },

  async getDeadlineStatus(filters = {}) {
    const response = await apiClient.get('/workspace/reports/deadline-status', { params: filters });
    return response.data?.data || null;
  },

  async getClientSummary(filters = {}) {
    const response = await apiClient.get('/workspace/reports/client-summary', { params: filters });
    return response.data?.data || [];
  },
};

export default reportService;
