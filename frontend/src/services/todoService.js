import { apiClient } from './apiClient';

export const todoService = {
  /**
   * Fetch personal To-Dos with filters.
   */
  async getTodos(filters = {}) {
    try {
      const response = await apiClient.get('/todos', { params: filters });
      if (response.data?.success && Array.isArray(response.data?.data)) {
        return response.data.data;
      }
    } catch (error) {
      console.warn('Backend getTodos failed:', error.message);
    }
    return [];
  },

  /**
   * Fetch personal To-Do real counters.
   */
  async getStats() {
    try {
      const response = await apiClient.get('/todos/stats');
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (error) {
      console.warn('Backend getStats failed:', error.message);
    }
    return { today: 0, overdue: 0, completed: 0, pending: 0 };
  },

  /**
   * Fetch single To-Do.
   */
  async getTodoById(id) {
    const response = await apiClient.get(`/todos/${id}`);
    return response.data?.data;
  },

  /**
   * Create a new personal To-Do.
   */
  async createTodo(data) {
    const response = await apiClient.post('/todos', data);
    return response.data?.data;
  },

  /**
   * Update existing To-Do.
   */
  async updateTodo(id, data) {
    const response = await apiClient.put(`/todos/${id}`, data);
    return response.data?.data;
  },

  /**
   * Toggle completion checkbox.
   */
  async toggleComplete(id, isCompleted) {
    const response = await apiClient.patch(`/todos/${id}/complete`, { isCompleted });
    return response.data?.data;
  },

  /**
   * Update status.
   */
  async updateStatus(id, status) {
    const response = await apiClient.patch(`/todos/${id}/status`, { status });
    return response.data?.data;
  },

  /**
   * Delete To-Do.
   */
  async deleteTodo(id) {
    const response = await apiClient.delete(`/todos/${id}`);
    return response.data;
  },
};
