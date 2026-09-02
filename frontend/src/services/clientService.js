import { apiClient } from './apiClient';

export const clientService = {
  /**
   * List all clients with filters and real metric counts.
   */
  async getClients(filters = {}) {
    return this.getAllClients(filters);
  },

  async getAllClients(filters = {}) {
    try {
      const response = await apiClient.get('/workspace/clients', { params: filters });
      if (response.data?.success && response.data?.data) {
        return response.data.data.map((c) => ({
          id: c.id,
          name: c.name,
          companyName: c.companyName || c.name,
          contactPerson: c.contactPerson || c.contact_name || c.name,
          email: c.email,
          phone: c.phone || '',
          industry: c.industry || '',
          website: c.website || '',
          address: c.address || '',
          socialProfiles: c.socialProfiles || null,
          logoUrl: c.logoUrl || null,
          notes: c.notes || '',
          status: c.status === 'ACTIVE' || c.status === 'Active' ? 'Active' : (c.status === 'ARCHIVED' ? 'Archived' : 'Inactive'),
          rawStatus: c.status,
          createdAt: c.created_at || c.createdAt || new Date().toISOString(),
          updatedAt: c.updated_at || c.updatedAt,
          assignedTeam: c.assignedTeam || [],
          teamCount: c.team_count || (c.assignedTeam ? c.assignedTeam.length : 0),
          activeProjectsCount: Number(c.activeProjectsCount || c.active_projects_count || 0),
          totalContentCount: Number(c.totalContentCount || c.total_content_count || 0),
          pendingApprovalsCount: Number(c.pendingApprovalsCount || c.pending_approvals_count || 0),
          approvedContentCount: Number(c.approvedContentCount || c.approved_content_count || 0),
          scheduledContentCount: Number(c.scheduledContentCount || c.scheduled_content_count || 0),
          totalTasksCount: Number(c.totalTasksCount || c.total_tasks_count || 0),
        }));
      }
    } catch (error) {
      console.warn('Backend list clients error:', error.response?.data?.message || error.message);
      throw error;
    }
    return [];
  },

  /**
   * Get single client details with assigned team.
   */
  async getClientById(id) {
    try {
      const response = await apiClient.get(`/workspace/clients/${id}`);
      if (response.data?.success && response.data?.data) {
        const c = response.data.data;
        return {
          id: c.id,
          name: c.name,
          companyName: c.companyName || c.name,
          contactPerson: c.contactPerson || c.contact_name || c.name,
          email: c.email,
          phone: c.phone || '',
          industry: c.industry || '',
          website: c.website || '',
          address: c.address || '',
          socialProfiles: c.socialProfiles || null,
          logoUrl: c.logoUrl || null,
          notes: c.notes || '',
          status: c.status === 'ACTIVE' || c.status === 'Active' ? 'Active' : (c.status === 'ARCHIVED' ? 'Archived' : 'Inactive'),
          rawStatus: c.status,
          createdAt: c.created_at || c.createdAt,
          updatedAt: c.updated_at || c.updatedAt,
          assignedTeam: c.assignedTeam || [],
          teamCount: c.team_count || (c.assignedTeam ? c.assignedTeam.length : 0),
          activeProjectsCount: Number(c.activeProjectsCount || 0),
          totalContentCount: Number(c.totalContentCount || 0),
          pendingApprovalsCount: Number(c.pendingApprovalsCount || 0),
          approvedContentCount: Number(c.approvedContentCount || 0),
          scheduledContentCount: Number(c.scheduledContentCount || 0),
          totalTasksCount: Number(c.totalTasksCount || 0),
        };
      }
    } catch (error) {
      console.warn('Backend getClientById error:', error.response?.data?.message || error.message);
      throw error;
    }
  },

  /**
   * Create client (supports file upload or JSON).
   */
  async createClient(clientData, logoFile = null) {
    try {
      let payload;
      let headers = {};

      if (logoFile) {
        payload = new FormData();
        payload.append('logo', logoFile);
        Object.entries(clientData).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') {
            if (typeof v === 'object') {
              payload.append(k, JSON.stringify(v));
            } else {
              payload.append(k, String(v));
            }
          }
        });
        headers['Content-Type'] = 'multipart/form-data';
      } else {
        payload = clientData;
      }

      const response = await apiClient.post('/workspace/clients', payload, { headers });
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return response.data;
    } catch (error) {
      console.error('Backend createClient error:', error.response?.data?.message || error.message);
      throw new Error(error.response?.data?.message || 'Failed to create client.');
    }
  },

  /**
   * Update client details (supports optional logo file).
   */
  async updateClient(id, updatedFields, logoFile = null) {
    try {
      let payload;
      let headers = {};

      if (logoFile) {
        payload = new FormData();
        payload.append('logo', logoFile);
        Object.entries(updatedFields).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            if (typeof v === 'object') {
              payload.append(k, JSON.stringify(v));
            } else {
              payload.append(k, String(v));
            }
          }
        });
        headers['Content-Type'] = 'multipart/form-data';
      } else {
        payload = updatedFields;
      }

      const response = await apiClient.put(`/workspace/clients/${id}`, payload, { headers });
      if (response.data?.success) {
        return response.data.data;
      }
      return response.data;
    } catch (error) {
      console.error('Backend updateClient error:', error.response?.data?.message || error.message);
      throw new Error(error.response?.data?.message || 'Failed to update client.');
    }
  },

  /**
   * Upload / replace client logo directly.
   */
  async uploadClientLogo(clientId, file) {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await apiClient.post(`/workspace/clients/${clientId}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Remove client logo.
   */
  async removeClientLogo(clientId) {
    const response = await apiClient.delete(`/workspace/clients/${clientId}/logo`);
    return response.data;
  },

  /**
   * Toggle or update client status.
   */
  async updateStatus(id, status) {
    const response = await apiClient.patch(`/workspace/clients/${id}/status`, { status });
    return response.data;
  },

  /**
   * Archive / soft delete client.
   */
  async deleteClient(id) {
    const response = await apiClient.delete(`/workspace/clients/${id}`);
    return response.data;
  },

  /**
   * Client 360 Overview.
   */
  async getClientOverview(clientId) {
    const response = await apiClient.get(`/workspace/clients/${clientId}/overview`);
    return response.data?.data || null;
  },

  /**
   * Client Content.
   */
  async getClientContent(clientId, filters = {}) {
    const response = await apiClient.get(`/workspace/clients/${clientId}/content`, { params: filters });
    return response.data?.data || [];
  },

  /**
   * Client Projects.
   */
  async getClientProjects(clientId) {
    const response = await apiClient.get(`/workspace/clients/${clientId}/projects`);
    return response.data?.data || [];
  },

  /**
   * Client Tasks.
   */
  async getClientTasks(clientId, filters = {}) {
    const response = await apiClient.get(`/workspace/clients/${clientId}/tasks`, { params: filters });
    return response.data?.data || [];
  },

  /**
   * Client Assets.
   */
  async getClientAssets(clientId, filters = {}) {
    const response = await apiClient.get(`/workspace/clients/${clientId}/assets`, { params: filters });
    return response.data?.data || [];
  },

  /**
   * Assign Team Members.
   */
  async assignTeam(clientId, team) {
    const response = await apiClient.post(`/clients/${clientId}/team`, { team });
    return response.data;
  },

  async removeTeamMember(clientId, userId) {
    const response = await apiClient.delete(`/clients/${clientId}/team/${userId}`);
    return response.data;
  },
};
