import { apiClient } from './apiClient';

export const dashboardService = {
  /**
   * Fetch complete workspace dashboard metrics, team workload, personal todos, and deadlines.
   */
  async getDashboard() {
    try {
      const response = await apiClient.get('/workspace/dashboard');
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (err) {
      console.warn('GET /workspace/dashboard failed, attempting fallback to /dashboard:', err.message);
      try {
        const fallbackRes = await apiClient.get('/dashboard');
        if (fallbackRes.data?.success && fallbackRes.data?.data) {
          return fallbackRes.data.data;
        }
      } catch (fallbackErr) {
        console.error('All dashboard endpoints failed:', fallbackErr);
        throw fallbackErr;
      }
    }
    throw new Error('Invalid dashboard response structure.');
  },
};
