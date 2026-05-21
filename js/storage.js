import { STORAGE_KEYS } from './config.js';

// Безопасная работа с localStorage
export const storage = {
  get: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('Storage read error:', e);
      return null;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('Storage write error:', e);
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Storage delete error:', e);
    }
  }
};

// Управление пользовательскими данными
export const userStorage = {
  getId: () => storage.get(STORAGE_KEYS.USER_ID),
  setId: (id) => storage.set(STORAGE_KEYS.USER_ID, id),
  
  getName: () => storage.get(STORAGE_KEYS.USERNAME),
  setName: (name) => storage.set(STORAGE_KEYS.USERNAME, name),
  
  getRoom: () => storage.get(STORAGE_KEYS.ROOM),
  setRoom: (room) => storage.set(STORAGE_KEYS.ROOM, room),
  
  clear: () => {
    storage.remove(STORAGE_KEYS.USER_ID);
    storage.remove(STORAGE_KEYS.USERNAME);
    storage.remove(STORAGE_KEYS.ROOM);
  }
};