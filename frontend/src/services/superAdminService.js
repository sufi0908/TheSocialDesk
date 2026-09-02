import { apiClient } from './apiClient';

export const superAdminService = {
  async getMetrics() {
    try {
      const response = await apiClient.get('/superadmin/analytics');
      if (response.data?.success && response.data?.data) {
        const d = response.data.data;
        return {
          totalWorkspaces: d.total_workspaces || 0,
          activeWorkspaces: d.active_workspaces || 0,
          suspendedWorkspaces: d.inactive_workspaces || 0,
          totalManagers: d.total_managers || 0,
        };
      }
    } catch (error) {
      console.warn('Backend getMetrics failed:', error.message);
    }
    return {
      totalWorkspaces: 0,
      activeWorkspaces: 0,
      suspendedWorkspaces: 0,
      totalManagers: 0,
    };
  },

  async getWorkspaces(filters = {}) {
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.status && filters.status !== 'All') {
        params.status = filters.status === 'Active' ? 'ACTIVE' : (filters.status === 'Suspended' ? 'SUSPENDED' : filters.status);
      }

      const response = await apiClient.get('/superadmin/workspaces', { params });
      if (response.data?.success && Array.isArray(response.data?.data)) {
        return response.data.data.map((w) => ({
          id: w.id,
          name: w.name,
          companyName: w.companyName || w.name,
          logo: '⚡',
          logoUrl: w.logoUrl || null,
          email: w.email || '',
          phone: w.phone || '',
          address: w.address || '',
          managerId: w.managerId,
          managerName: w.managerName || 'Unassigned',
          managerEmail: w.managerEmail || '',
          managerPhone: w.managerPhone || '',
          status: w.status === 'ACTIVE' ? 'Active' : 'Suspended',
          rawStatus: w.status,
          createdAt: w.createdAt,
          updatedAt: w.updatedAt,
          teamCount: w.teamCount || 0,
          clientCount: w.clientCount || 0,
          projectCount: w.projectCount || 0,
          contentCount: w.contentCount || 0,
          taskCount: w.taskCount || 0,
          settings: w.settings || {},
        }));
      }
    } catch (error) {
      console.warn('Backend getWorkspaces failed:', error.message);
    }
    return [];
  },

  async getWorkspace(id) {
    const response = await apiClient.get(`/superadmin/workspaces/${id}`);
    if (response.data?.success && response.data?.data) {
      const w = response.data.data;
      return {
        id: w.id,
        name: w.name,
        companyName: w.companyName || w.name,
        logo: '⚡',
        logoUrl: w.logoUrl || null,
        email: w.email || '',
        phone: w.phone || '',
        address: w.address || '',
        managerId: w.managerId,
        managerName: w.managerName || 'Unassigned',
        managerEmail: w.managerEmail || '',
        managerPhone: w.managerPhone || '',
        managerAvatar: w.managerAvatar || null,
        status: w.status === 'ACTIVE' ? 'Active' : 'Suspended',
        rawStatus: w.status,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        teamCount: w.teamCount || 0,
        clientCount: w.clientCount || 0,
        projectCount: w.projectCount || 0,
        contentCount: w.contentCount || 0,
        taskCount: w.taskCount || 0,
        settings: w.settings || {},
      };
    }
    throw new Error('Failed to fetch workspace overview.');
  },

  async getWorkspaceTeam(id) {
    const response = await apiClient.get(`/superadmin/workspaces/${id}/team`);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error('Failed to fetch workspace team members.');
  },

  async createWorkspace(workspaceData) {
    const response = await apiClient.post('/superadmin/workspaces', {
      companyName: workspaceData.companyName || workspaceData.name,
      name: workspaceData.companyName || workspaceData.name,
      logoUrl: workspaceData.logoUrl || null,
      email: workspaceData.email,
      phone: workspaceData.phone,
      address: workspaceData.address,
      managerName: workspaceData.managerName,
      managerEmail: workspaceData.managerEmail,
      managerPassword: workspaceData.managerPassword,
      status: 'ACTIVE',
    });

    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to create workspace.');
  },

  async updateWorkspace(id, workspaceData) {
    const response = await apiClient.put(`/superadmin/workspaces/${id}`, {
      name: workspaceData.companyName || workspaceData.name,
      companyName: workspaceData.companyName || workspaceData.name,
      logoUrl: workspaceData.logoUrl !== undefined ? workspaceData.logoUrl : undefined,
      email: workspaceData.email,
      phone: workspaceData.phone,
      address: workspaceData.address,
      settings: {
        companyName: workspaceData.companyName || workspaceData.name,
        email: workspaceData.email || '',
        phone: workspaceData.phone || '',
        address: workspaceData.address || '',
      },
    });

    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to update workspace.');
  },

  async updateWorkspaceStatus(id, newStatus) {
    const backendStatus = (newStatus === 'Active' || newStatus === 'ACTIVE') ? 'ACTIVE' : 'SUSPENDED';
    const response = await apiClient.patch(`/superadmin/workspaces/${id}/status`, {
      status: backendStatus,
    });
    if (response.data?.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to update workspace status.');
  },

  async deleteWorkspace(id) {
    const response = await apiClient.delete(`/superadmin/workspaces/${id}`);
    if (response.data?.success) {
      return response.data;
    }
    throw new Error(response.data?.message || 'Failed to delete workspace.');
  },

  async getManagers() {
    try {
      const response = await apiClient.get('/superadmin/managers');
      if (response.data?.success && response.data?.data) {
        return response.data.data.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          phone: m.phone || '',
          companyName: m.companyName || 'Unassigned',
          status: m.status === 'ACTIVE' ? 'Active' : 'Suspended',
          joinedAt: m.joinedAt,
        }));
      }
    } catch (error) {
      console.warn('Backend getManagers failed:', error.message);
    }
    return [];
  },

  async getRecentActivity() {
    try {
      const response = await apiClient.get('/activity', { params: { limit: 10 } });
      if (response.data?.success && response.data?.data) {
        return response.data.data.map((a) => ({
          id: `act_${a.id}`,
          event: a.action,
          description: a.description,
          user: a.userName,
          timestamp: a.timestamp,
          type: 'info',
        }));
      }
    } catch (error) {
      console.warn('Backend getRecentActivity failed:', error.message);
    }
    return [];
  },

  async resetManagerPassword(managerId, newPassword) {
    const response = await apiClient.post(`/superadmin/managers/${managerId}/reset-password`, {
      newPassword,
    });
    if (response.data?.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to reset manager password.');
  },

  async getSystemActivity() {
    return this.getRecentActivity();
  },
};

