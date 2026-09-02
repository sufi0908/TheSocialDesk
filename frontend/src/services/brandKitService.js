import { apiClient } from './apiClient';

export const brandKitService = {
  /**
   * Fetch Brand Kit for a Client.
   */
  async getBrandKit(clientId) {
    if (!clientId) return null;
    try {
      const response = await apiClient.get(`/workspace/clients/${clientId}/brand-kit`);
      if (response.data?.success && response.data?.data) {
        const bk = response.data.data;
        return {
          id: bk.id,
          clientId: bk.clientId,
          brandName: bk.brandName || '',
          tagline: bk.tagline || '',
          industry: bk.industry || '',
          website: bk.website || '',
          description: bk.description || '',
          socialProfiles: bk.socialProfiles || null,
          logoUrl: bk.logoUrl || null,
          logoDarkUrl: bk.logoDarkUrl || null,
          logoLightUrl: bk.logoLightUrl || null,
          iconUrl: bk.iconUrl || null,
          primaryColor: bk.primaryColor || '#4F39F6',
          secondaryColor: bk.secondaryColor || '#000000',
          accentColor: bk.accentColor || '#FFFFFF',
          colors: bk.colors || ['#4F39F6', '#000000', '#FFFFFF'],
          fontFamily: bk.fontFamily || 'Inter, sans-serif',
          fonts: bk.fonts || { primary: 'Inter', secondary: 'Outfit' },
          guidelinesNotes: bk.guidelinesNotes || '',
          guidelinesFileUrl: bk.guidelinesFileUrl || null,
          guidelinesFileName: bk.guidelinesFileName || null,
          guidelinesFileSize: bk.guidelinesFileSize || null,
          assets: bk.assets || [],
        };
      }
    } catch (error) {
      console.warn('Backend getBrandKit failed:', error.response?.data?.message || error.message);
      throw error;
    }
  },

  /**
   * Update Brand Kit colors, fonts, info, guidelines.
   */
  async updateBrandKit(clientId, updatedKit) {
    try {
      const response = await apiClient.put(`/workspace/clients/${clientId}/brand-kit`, updatedKit);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return response.data;
    } catch (error) {
      console.error('Backend updateBrandKit failed:', error.response?.data?.message || error.message);
      throw new Error(error.response?.data?.message || 'Failed to update brand kit.');
    }
  },

  /**
   * Upload Brand Asset / Logo / Guidelines Document.
   */
  async uploadBrandAsset(clientId, file, metadata = {}) {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(metadata).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, value);
      }
    });

    const response = await apiClient.post(`/workspace/clients/${clientId}/brand-kit/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Delete Brand Asset.
   */
  async deleteBrandAsset(clientId, brandAssetId) {
    const response = await apiClient.delete(`/workspace/clients/${clientId}/brand-kit/assets/${brandAssetId}`);
    return response.data;
  },
};

