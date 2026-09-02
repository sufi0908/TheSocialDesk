import { apiClient } from './apiClient';
import { storage } from './storage';
import { LOCAL_STORAGE_KEYS } from '../utils/constants';
import { formatFileSize } from '../utils/formatters';

export const ASSET_TYPES = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  DOCUMENT: 'DOCUMENT',
  OTHER: 'OTHER',
};

const API_BASE = import.meta.env.VITE_API_URL || '/api';
export const SERVER_BASE = API_BASE ? API_BASE.replace(/\/api\/?$/, '') : '';

const getAuthQuery = () => {
  const token =
    storage.get(LOCAL_STORAGE_KEYS.AUTH_TOKEN) ||
    localStorage.getItem('socialdesk_auth_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('auth_token');
  return token ? `?token=${encodeURIComponent(token)}` : '';
};

const parseSafeTags = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return raw.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }
  return [];
};

export const getAssetFileUrl = (id) => `${API_BASE}/assets/${id}/file${getAuthQuery()}`;
export const getAssetViewUrl = (id) => `${API_BASE}/assets/${id}/view${getAuthQuery()}`;
export const getAssetDownloadUrl = (id) => `${API_BASE}/assets/${id}/download${getAuthQuery()}`;

export const getStaticUploadUrl = (storagePath, id) => {
  if (storagePath) {
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) return storagePath;
    const cleanPath = storagePath.replace(/\\/g, '/').replace(/^\/?(uploads\/)?/, '');
    return `${SERVER_BASE}/uploads/${cleanPath}`;
  }
  return id ? getAssetViewUrl(id) : '';
};

export const assetService = {
  /**
   * Fetch real MySQL Statistics & Storage metrics.
   */
  async getAssetStats() {
    const response = await apiClient.get('/assets/stats');
    return response.data?.data;
  },

  /**
   * List Assets with pagination, sorting, search, and filters.
   */
  async getAssets(filters = {}) {
    const response = await apiClient.get('/assets', { params: filters });
    const resData = response.data;

    const mapped = (resData?.data || []).map((a) => {
      const directUrl = getStaticUploadUrl(a.storage_path, a.id);
      const fallbackUrl = getAssetViewUrl(a.id);
      return {
        id: a.id,
        name: a.display_name || a.file_name,
        fileName: a.file_name,
        displayName: a.display_name || a.file_name,
        originalFilename: a.original_filename || a.file_name,
        storagePath: a.storage_path,
        assetType: a.file_type || 'IMAGE',
        fileType: a.file_type || 'IMAGE',
        mimeType: a.mime_type || '',
        fileHash: a.file_hash || '',
        width: a.width,
        height: a.height,
        duration: a.duration,
        url: directUrl || fallbackUrl,
        fileUrl: directUrl || fallbackUrl,
        fallbackViewUrl: fallbackUrl,
        downloadUrl: getAssetDownloadUrl(a.id),
        size: formatFileSize(a.file_size),
        sizeBytes: Number(a.file_size) || 0,
        uploaderName: a.uploader_name || 'Team Member',
        client: a.client_company_name || a.client_name || 'General Client',
        clientId: a.client_id,
        project: a.project_name || 'General Project',
        projectId: a.project_id,
        contentId: a.content_id,
        folderId: a.folder_id,
        folderName: a.folder_name,
        uploadedDate: a.created_at,
        category: a.category,
        tags: parseSafeTags(a.tags),
      };
    });

    return {
      assets: mapped,
      total: resData?.total || mapped.length,
      page: resData?.page || 1,
      limit: resData?.limit || 20,
      totalPages: resData?.totalPages || 1,
    };
  },

  /**
   * List all Assets as a pure flat array.
   */
  async getAllAssets(filters = {}) {
    const res = await this.getAssets(filters);
    return res.assets || [];
  },

  /**
   * Get single asset details + Usage breakdown.
   */
  async getAsset(id) {
    const response = await apiClient.get(`/assets/${id}`);
    const a = response.data?.data;
    if (a) {
      const directUrl = getStaticUploadUrl(a.storage_path, a.id);
      const fallbackUrl = getAssetViewUrl(a.id);
      return {
        id: a.id,
        name: a.display_name || a.file_name,
        fileName: a.file_name,
        displayName: a.display_name || a.file_name,
        originalFilename: a.original_filename || a.file_name,
        storagePath: a.storage_path,
        assetType: a.file_type || 'IMAGE',
        fileType: a.file_type || 'IMAGE',
        mimeType: a.mime_type || '',
        fileHash: a.file_hash || '',
        width: a.width,
        height: a.height,
        duration: a.duration,
        url: directUrl || fallbackUrl,
        fallbackViewUrl: fallbackUrl,
        downloadUrl: getAssetDownloadUrl(a.id),
        sizeBytes: Number(a.file_size) || 0,
        size: formatFileSize(a.file_size),


        client: a.client_company_name || a.client_name || 'General Client',
        clientId: a.client_id,
        project: a.project_name || 'General Project',
        projectId: a.project_id,
        folderId: a.folder_id,
        folderName: a.folder_name,
        uploaderName: a.uploader_name || 'Team Member',
        uploadedDate: a.created_at,
        updatedDate: a.updated_at,
        category: a.category,
        tags: parseSafeTags(a.tags),
        usage: a.usage || { totalCount: 0, contentPosts: [], projects: [], tasks: [] },
      };
    }
    return null;
  },

  /**
   * Fetch Asset Usage across content, projects, and tasks.
   */
  async getAssetUsage(id) {
    const response = await apiClient.get(`/assets/${id}/usage`);
    return response.data?.data;
  },

  /**
   * Upload single asset with progress & duplicate check support.
   */
  async uploadAsset(file, metadata = {}, onProgress) {
    const targetFile = Array.isArray(file) ? file[0] : file;
    if (!targetFile) {
      throw new Error('A valid file is required for upload.');
    }

    const formData = new FormData();
    formData.append('file', targetFile);
    Object.entries(metadata).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'All' && value !== 'all') {
        formData.append(key, value);
      }
    });

    const response = await apiClient.post('/assets/upload', formData, {
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded * 100) / event.total));
        }
      },
    });
    return response.data?.data || response.data;
  },

  /**
   * Upload multiple assets.
   */
  async uploadMultipleAssets(files, metadata = {}, onProgress) {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    Object.entries(metadata).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, value);
      }
    });

    const response = await apiClient.post('/assets/bulk', formData, {
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded * 100) / event.total));
        }
      },
    });
    return response.data?.data;
  },

  async renameAsset(assetId, newFileName) {
    const response = await apiClient.put(`/assets/${assetId}`, { fileName: newFileName, displayName: newFileName });
    return response.data?.data;
  },

  async updateAsset(assetId, data) {
    const response = await apiClient.put(`/assets/${assetId}`, data);
    return response.data?.data;
  },

  async deleteAsset(assetId, force = false) {
    const response = await apiClient.delete(`/assets/${assetId}`, { params: { force } });
    return response.data;
  },

  async bulkDeleteAssets(assetIds = [], force = false) {
    const response = await apiClient.post('/assets/bulk-delete', { assetIds, force });
    return response.data;
  },

  async bulkMoveAssets(assetIds = [], folderId = null) {
    const response = await apiClient.patch('/assets/bulk-move', { assetIds, folderId });
    return response.data;
  },

  async attachAssetToContent(assetId, contentId) {
    const response = await apiClient.post(`/assets/${assetId}/attach`, { contentId });
    return response.data;
  },

  // --- FOLDER METHODS ---

  async listFolders(clientId = null) {
    const response = await apiClient.get('/assets/folders', { params: { clientId } });
    return response.data?.data || [];
  },

  async createFolder(name, description = null, clientId = null) {
    const payload = typeof name === 'object' && name !== null ? name : { name, description, clientId };
    const response = await apiClient.post('/assets/folders', payload);
    return response.data?.data;
  },

  async renameFolder(id, name, description = undefined) {
    const payload = typeof name === 'object' && name !== null ? name : { name, description };
    const response = await apiClient.patch(`/assets/folders/${id}`, payload);
    return response.data;
  },

  async updateFolder(id, data) {
    const response = await apiClient.patch(`/assets/folders/${id}`, data);
    return response.data;
  },

  async deleteFolder(id) {
    const response = await apiClient.delete(`/assets/folders/${id}`);
    return response.data;
  },
};
