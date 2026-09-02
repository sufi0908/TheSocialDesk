import axios from 'axios';
import { LOCAL_STORAGE_KEYS } from '../utils/constants';
import { storage } from './storage';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token & Active Workspace if present
apiClient.interceptors.request.use(
  (config) => {
    const token = storage.get(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const activeWs = storage.get(LOCAL_STORAGE_KEYS.ACTIVE_WORKSPACE);
    const wsId = typeof activeWs === 'object' && activeWs !== null ? activeWs.id : activeWs;
    if (wsId && /^\d+$/.test(String(wsId))) {
      config.headers['x-workspace-id'] = String(wsId);
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Cleanly handle 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      storage.remove(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
      storage.remove(LOCAL_STORAGE_KEYS.AUTH_USER);
    }
    return Promise.reject(error);
  }
);

export const simulateDelay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));
