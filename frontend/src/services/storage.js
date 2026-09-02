import { LOCAL_STORAGE_KEYS } from '../utils/constants';
import {
  INITIAL_MOCK_USERS,
  INITIAL_MOCK_WORKSPACES,
  INITIAL_MOCK_CLIENTS,
  INITIAL_MOCK_POSTS,
} from './mockData';

export const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key} from storage:`, e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing ${key} to storage:`, e);
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Error removing ${key} from storage:`, e);
    }
  },

  initMockDatabase() {
    const existingDb = this.get(LOCAL_STORAGE_KEYS.MOCK_DB);
    if (!existingDb) {
      const initialDb = {
        users: INITIAL_MOCK_USERS,
        workspaces: INITIAL_MOCK_WORKSPACES,
        clients: INITIAL_MOCK_CLIENTS,
        posts: INITIAL_MOCK_POSTS,
      };
      this.set(LOCAL_STORAGE_KEYS.MOCK_DB, initialDb);
      return initialDb;
    }
    return existingDb;
  },

  getMockDatabase() {
    return this.get(LOCAL_STORAGE_KEYS.MOCK_DB) || this.initMockDatabase();
  },

  updateMockDatabase(updaterFn) {
    const currentDb = this.getMockDatabase();
    const updatedDb = updaterFn(currentDb);
    this.set(LOCAL_STORAGE_KEYS.MOCK_DB, updatedDb);
    return updatedDb;
  },
};
