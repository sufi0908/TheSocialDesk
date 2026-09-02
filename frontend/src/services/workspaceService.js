import { apiClient } from './apiClient';
import { storage } from './storage';
import { LOCAL_STORAGE_KEYS } from '../utils/constants';

export const workspaceService = {
  async getWorkspaces() {
    const token = storage.get(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      try {
        const response = await apiClient.get('/workspace');
        if (response.data?.success && Array.isArray(response.data?.data)) {
          return response.data.data;
        }
      } catch (error) {
        console.warn('Backend getWorkspaces failed:', error.message);
      }
    }
    const user = storage.get(LOCAL_STORAGE_KEYS.AUTH_USER);
    if (user?.workspace) {
      return [user.workspace];
    }
    const db = storage.getMockDatabase();
    return db.workspaces || [];
  },

  async getWorkspaceById(id) {
    try {
      const response = await apiClient.get('/workspace');
      if (response.data?.success && Array.isArray(response.data?.data)) {
        const data = response.data.data;
        return data.find((w) => String(w.id) === String(id)) || data[0] || null;
      }
    } catch (error) {
      console.warn('Backend getWorkspaceById failed:', error.message);
    }
    const user = storage.get(LOCAL_STORAGE_KEYS.AUTH_USER);
    if (user?.workspace && String(user.workspace.id) === String(id)) {
      return user.workspace;
    }
    const db = storage.getMockDatabase();
    return db.workspaces ? db.workspaces.find((w) => String(w.id) === String(id)) : null;
  },

  async getClientsByWorkspace(workspaceId) {
    try {
      const params = workspaceId && /^\d+$/.test(String(workspaceId)) ? { workspaceId: Number(workspaceId) } : {};
      const response = await apiClient.get('/workspace/clients', { params });
      if (response.data?.success && Array.isArray(response.data?.data)) {
        return response.data.data;
      }
    } catch (error) {
      console.warn('Backend getClientsByWorkspace failed:', error.message);
    }
    const db = storage.getMockDatabase();
    return db.clients || [];
  },
};
