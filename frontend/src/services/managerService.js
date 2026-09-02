import { apiClient } from './apiClient';
import { dashboardService } from './dashboardService';

export const managerService = {
  /**
   * Returns operational dashboard stats.
   */
  async getOperationalMetrics() {
    try {
      const data = await dashboardService.getDashboard();
      return data.stats;
    } catch (e) {
      console.error('Failed to get operational metrics:', e);
      throw e;
    }
  },

  async getDashboardMetrics() {
    return this.getOperationalMetrics();
  },

  /**
   * Returns real team workload from MySQL.
   */
  async getTeamWorkload() {
    try {
      const data = await dashboardService.getDashboard();
      return data.teamWorkload || [];
    } catch (e) {
      console.error('Failed to get team workload:', e);
      throw e;
    }
  },

  async getWorkflowActivities() {
    return this.getRecentActivity();
  },

  /**
   * Returns real activity stream from MySQL.
   */
  async getRecentActivity() {
    try {
      const data = await dashboardService.getDashboard();
      if (Array.isArray(data.recentActivity)) {
        return data.recentActivity;
      }
      const response = await apiClient.get('/activity', { params: { limit: 10 } });
      if (response.data?.success && Array.isArray(response.data?.data)) {
        return response.data.data.map((a) => ({
          id: a.id,
          user: a.userName || a.user_name || 'Team Member',
          action: a.action || 'updated an item',
          target: a.description || 'workspace item',
          timestamp: a.timestamp || a.created_at,
          details: a.description || '',
          avatar: a.userAvatar || a.avatar || '',
        }));
      }
    } catch (e) {
      console.warn('Failed to fetch recent activity:', e.message);
    }
    return [];
  },

  /**
   * Returns real upcoming deliverable deadlines from MySQL.
   */
  async getUpcomingDeadlines() {
    try {
      const data = await dashboardService.getDashboard();
      return data.upcomingDeadlines || [];
    } catch (e) {
      console.error('Failed to get upcoming deadlines:', e);
      throw e;
    }
  },
};
