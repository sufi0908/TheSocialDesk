import { apiClient } from './apiClient';

export const INITIAL_TEAM_MEMBERS = [];

const toDisplayStatus = (status) => {
  if (status === 'ACTIVE') return 'Active';
  if (status === 'SUSPENDED') return 'Suspended';
  return 'Inactive';
};

const toApiStatus = (status) => String(status || 'ACTIVE').trim().toUpperCase();

const appendIfPresent = (formData, key, value) => {
  if (value !== undefined && value !== null) {
    formData.append(key, value);
  }
};

const serializeMemberForm = (memberData) => {
  const formData = new FormData();

  appendIfPresent(formData, 'name', memberData.name);
  appendIfPresent(formData, 'email', memberData.email);
  appendIfPresent(formData, 'password', memberData.password);
  appendIfPresent(formData, 'confirmPassword', memberData.confirmPassword);
  appendIfPresent(formData, 'role', memberData.role);
  appendIfPresent(formData, 'phone', memberData.phone);
  appendIfPresent(formData, 'jobTitle', memberData.jobTitle);
  appendIfPresent(formData, 'department', memberData.department);
  appendIfPresent(formData, 'status', toApiStatus(memberData.status));
  appendIfPresent(formData, 'bio', memberData.bio);

  if (memberData.profileImage instanceof File) {
    formData.append('profileImage', memberData.profileImage);
  }

  return formData;
};

const mapMember = (user) => ({
  id: user.id,
  workspaceId: user.workspaceId || user.workspace_id,
  name: user.name || user.full_name,
  email: user.email,
  role: user.role,
  roleDisplayName: user.roleDisplayName || user.role_display_name,
  avatar: user.avatar || user.avatar_url || '',
  status: toDisplayStatus(user.status),
  statusValue: user.status,
  phone: user.phone || '',
  jobTitle: user.jobTitle || user.job_title || '',
  department: user.department || '',
  bio: user.bio || '',
  assignedClients: user.assignedClients || [],
  assignedClientsCount: Number(user.assignedClientsCount || user.assigned_clients_count || 0),
  activeTasksCount: Number(user.activeTasksCount || user.active_tasks_count || 0),
  assignedTasksCount: Number(user.assignedTasksCount || user.assigned_tasks_count || 0),
  assignedContentCount: Number(user.assignedContentCount || user.assigned_content_count || 0),
  activityCount: Number(user.activityCount || user.activity_count || 0),
  createdAt: user.createdAt || user.created_at,
});

const apiError = (error, fallback) => new Error(error.response?.data?.message || fallback);

export const teamService = {
  async getAllTeamMembers(filters = {}) {
    try {
      let params = {};
      if (typeof filters === 'string') {
        const clean = filters.trim();
        if (clean && clean.toLowerCase() !== 'all' && clean.toLowerCase() !== 'all roles') {
          params.role = clean;
        }
      } else if (filters && typeof filters === 'object') {
        params = { ...filters };
        if (params.role && (params.role.toLowerCase() === 'all' || params.role.toLowerCase() === 'all roles')) {
          delete params.role;
        }
        if (params.status && (params.status.toLowerCase() === 'all' || params.status.toLowerCase() === 'all status' || params.status.toLowerCase() === 'all statuses')) {
          delete params.status;
        }
      }
      const response = await apiClient.get('/workspace/users', { params });
      if (response.data?.success && Array.isArray(response.data?.data)) {
        return response.data.data.map(mapMember);
      }
      return [];
    } catch (error) {
      throw apiError(error, 'Failed to load team members.');
    }
  },

  async getTeamMembers(filters = {}) {
    return this.getAllTeamMembers(filters);
  },

  async createTeamMember(memberData) {
    try {
      const response = await apiClient.post('/workspace/users', serializeMemberForm(memberData));
      if (response.data?.success && response.data?.data?.user) {
        return mapMember(response.data.data.user);
      }
      throw new Error('Failed to create team member.');
    } catch (error) {
      throw apiError(error, error.message || 'Failed to create team member.');
    }
  },

  async updateTeamMember(id, updatedFields) {
    try {
      const response = await apiClient.put(`/workspace/users/${id}`, serializeMemberForm(updatedFields));
      if (response.data?.success) {
        return mapMember(response.data.data);
      }
      throw new Error('Failed to update team member.');
    } catch (error) {
      throw apiError(error, error.message || 'Failed to update team member.');
    }
  },

  async updateMemberStatus(id, status) {
    try {
      const response = await apiClient.patch(`/workspace/users/${id}/status`, { status: toApiStatus(status) });
      if (response.data?.success) {
        return { success: true, status: toDisplayStatus(response.data.data.status), statusValue: response.data.data.status };
      }
      throw new Error('Failed to update team member status.');
    } catch (error) {
      throw apiError(error, error.message || 'Failed to update team member status.');
    }
  },

  async toggleMemberStatus(id, currentStatus) {
    const nextStatus = currentStatus === 'Active' || currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return this.updateMemberStatus(id, nextStatus);
  },

  async resetMemberPassword(id, newPassword, confirmPassword) {
    try {
      const response = await apiClient.patch(`/workspace/users/${id}/reset-password`, { newPassword, confirmPassword });
      if (response.data?.success) {
        return response.data.data;
      }
      throw new Error('Failed to reset team member password.');
    } catch (error) {
      throw apiError(error, error.message || 'Failed to reset team member password.');
    }
  },

  async assignClients(memberId, assignedClients) {
    return this.updateTeamMember(memberId, { assignedClients });
  },

  async getMemberProfile(memberId) {
    try {
      const response = await apiClient.get(`/workspace/users/${memberId}`);
      if (response.data?.success && response.data?.data) {
        return mapMember(response.data.data);
      }
      return null;
    } catch (error) {
      throw apiError(error, 'Failed to load team member profile.');
    }
  },
};
