import { apiClient } from './apiClient';
import { storage } from './storage';
import { LOCAL_STORAGE_KEYS } from '../utils/constants';

export const authService = {
  /**
   * Fetch current authenticated user.
   */
  async getCurrentUser() {
    const token = storage.get(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
    const storedUser = storage.get(LOCAL_STORAGE_KEYS.AUTH_USER);

    if (token) {
      try {
        const response = await apiClient.get('/auth/me');
        if (response.data?.success && response.data?.data) {
          const user = response.data.data;
          storage.set(LOCAL_STORAGE_KEYS.AUTH_USER, user);
          return user;
        }
      } catch (error) {
        console.warn('Backend getCurrentUser failed or token expired:', error.message);
        // Clear expired session
        storage.remove(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
        storage.remove(LOCAL_STORAGE_KEYS.AUTH_USER);
        return null;
      }
    }

    if (storedUser) return storedUser;
    return null;
  },

  /**
   * Authenticate user against backend.
   */
  async login(email, password) {
    try {
      const response = await apiClient.post('/auth/login', {
        email: email ? email.trim() : '',
        password: password || '',
      });

      if (response.data?.success && response.data?.data) {
        const { token, user } = response.data.data;
        storage.set(LOCAL_STORAGE_KEYS.AUTH_TOKEN, token);
        storage.set(LOCAL_STORAGE_KEYS.AUTH_USER, user);
        return user;
      }
    } catch (error) {
      console.warn('Backend login attempt failed:', error.response?.data?.message || error.message);
      
      // If backend returns a specific 401 / 400 error, throw it so UI displays exact error message
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  /**
   * Request password reset token.
   */
  async requestPasswordReset(email) {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to request password reset.',
      };
    }
  },

  /**
   * Reset password with token.
   */
  async resetPassword(token, newPassword) {
    try {
      const response = await apiClient.post('/auth/reset-password', { token, newPassword });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to reset password.',
      };
    }
  },

  /**
   * Change current user password.
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await apiClient.post('/auth/change-password', { currentPassword, newPassword });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to change password.');
    }
  },

  /**
   * Log out user.
   */
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      storage.remove(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
      storage.remove(LOCAL_STORAGE_KEYS.AUTH_USER);
    }
  },
};
