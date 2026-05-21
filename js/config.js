// Firebase конфигурация
export const firebaseConfig = {
  apiKey: "AIzaSyCr07AnsEg6D_6ruk4rHg9ILn4lk939MOM",
  authDomain: "tggit-e9666.firebaseapp.com",
  databaseURL: "https://tggit-e9666-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tggit-e9666",
  storageBucket: "tggit-e9666.firebasestorage.app",
  messagingSenderId: "688998831825",
  appId: "1:688998831825:web:2b6048798947be73b557f0"
};

// Константы приложения
export const CONSTANTS = {
  MAX_FILE_SIZE: 2 * 1024 * 1024, // 2MB
  IMAGE_MAX_WIDTH: 800,
  IMAGE_QUALITY: 0.7,
  MESSAGE_LIMIT: 100,
  USERNAME_MAX_LENGTH: 30,
  ROOM_ID_LENGTH: 20,
  USER_ID_LENGTH: 8
};

// Ключи localStorage
export const STORAGE_KEYS = {
  USER_ID: 'chat_user_id',
  USERNAME: 'chat_username',
  ROOM: 'chat_room'
};