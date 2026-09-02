import { apiClient } from './apiClient';
import { storage } from './storage';
import { LOCAL_STORAGE_KEYS } from '../utils/constants';

class ChatService {
  async getGroups(search = '') {
    const res = await apiClient.get('/chat/groups', { params: { search } });
    return res.data.data || [];
  }

  async createGroup(data) {
    const res = await apiClient.post('/chat/groups', data);
    return res.data.data;
  }

  async getGroupDetails(groupId) {
    const res = await apiClient.get(`/chat/groups/${groupId}`);
    return res.data.data;
  }

  async getGroupMembers(groupId) {
    const res = await apiClient.get(`/chat/groups/${groupId}/members`);
    return res.data.data || [];
  }

  async getWorkspaceUsers(groupId = null, search = '') {
    const res = await apiClient.get('/chat/workspace-users', {
      params: { groupId, search },
    });
    return res.data.data || [];
  }

  async updateGroup(groupId, data) {
    const res = await apiClient.put(`/chat/groups/${groupId}`, data);
    return res.data.data;
  }

  async archiveGroup(groupId) {
    const res = await apiClient.delete(`/chat/groups/${groupId}`);
    return res.data;
  }

  async addMembers(groupId, memberIds) {
    const res = await apiClient.post(`/chat/groups/${groupId}/members`, {
      member_ids: memberIds,
    });
    return res.data.data;
  }

  async removeMember(groupId, userId) {
    const res = await apiClient.delete(`/chat/groups/${groupId}/members/${userId}`);
    return res.data;
  }

  async updateMemberRole(groupId, userId, role) {
    const res = await apiClient.patch(`/chat/groups/${groupId}/members/${userId}/role`, {
      role,
    });
    return res.data.data;
  }

  async leaveGroup(groupId) {
    const res = await apiClient.post(`/chat/groups/${groupId}/leave`);
    return res.data;
  }

  async updatePreferences(groupId, prefs) {
    const res = await apiClient.patch(`/chat/groups/${groupId}/preferences`, prefs);
    return res.data.data;
  }

  async getGroupMedia(groupId) {
    const res = await apiClient.get(`/chat/groups/${groupId}/media`);
    return res.data.data || { all: [], images: [], videos: [], documents: [], audio: [] };
  }

  async getMessages(groupId, options = {}) {
    const res = await apiClient.get(`/chat/groups/${groupId}/messages`, { params: options });
    return {
      messages: res.data.data || [],
      hasMore: Boolean(res.data.hasMore),
    };
  }

  async sendMessage(groupId, messageData) {
    const res = await apiClient.post(`/chat/groups/${groupId}/messages`, messageData);
    return res.data.data;
  }

  async editMessage(messageId, message) {
    const res = await apiClient.put(`/chat/messages/${messageId}`, { message });
    return res.data.data;
  }

  async deleteMessage(messageId) {
    const res = await apiClient.delete(`/chat/messages/${messageId}`);
    return res.data.data;
  }

  async toggleReaction(messageId, reaction) {
    const res = await apiClient.post(`/chat/messages/${messageId}/reactions`, { reaction });
    return res.data.data;
  }

  async markRead(groupId, lastReadMessageId) {
    const res = await apiClient.patch(`/chat/groups/${groupId}/read`, {
      last_read_message_id: lastReadMessageId,
    });
    return res.data.data;
  }

  async getUnreadCount() {
    const res = await apiClient.get('/chat/unread-count');
    return res.data.unread_count || 0;
  }

  async uploadFile(file, duration = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (duration) formData.append('duration', duration);

    const res = await apiClient.post('/chat/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  }

  getFileUrl(storagePath) {
    if (!storagePath) return '';
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) return storagePath;
    if (storagePath.startsWith('/api/')) {
      const origin = import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
        : '';
      return `${origin}${storagePath}`;
    }
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const token =
      storage.get(LOCAL_STORAGE_KEYS.AUTH_TOKEN) ||
      localStorage.getItem('socialdesk_auth_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('auth_token');
    const authQuery = token ? `&token=${encodeURIComponent(token)}` : '';
    return `${baseUrl}/chat/files/view?path=${encodeURIComponent(storagePath)}${authQuery}`;
  }
}

export const chatService = new ChatService();
