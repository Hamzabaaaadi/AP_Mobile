import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// REMARQUE: mis à jour automatiquement par l'agent — utilisez l'IP affichée par `ipconfig` si besoin
const API_BASE_URL = 'http://100.76.24.205:5000/api'; // LAN IP mise à jour

// Instance Axios avec configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor pour ajouter le token JWT
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('driverToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor pour gérer les erreurs de réponse
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Erreur réseau (pas de réponse) -> message clair
    if (!error.response) {
      error.message = `NetworkError: impossible de joindre l'API (${API_BASE_URL}). Vérifiez que votre téléphone est connecté au même réseau Wi‑Fi que l'ordinateur, que le serveur est démarré et que le port 5000 est autorisé par le pare-feu.`;
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      // Token expiré, nettoyer le storage
      await AsyncStorage.multiRemove(['driverToken', 'driverData']);
    }
    return Promise.reject(error);
  }
);

export const driverApi = {
  // ========== AUTHENTIFICATION ==========
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async register(driverData) {
    const response = await api.post('/auth/register', driverData);
    return response.data;
  },

  async logout() {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async changePassword(currentPassword, newPassword) {
    const response = await api.put('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    });
    return response.data;
  },

  // ========== BUS ==========
  async getDriverBuses(driverId) {
    const response = await api.get(`/buses/driver/${driverId}`);
    return response.data;
  },

  async updateBusStatus(busId, isInService) {
    const response = await api.put(`/buses/${busId}/status`, {
      is_in_service: isInService
    });
    return response.data;
  },

  async getBusDetails(busId) {
    const response = await api.get(`/buses/${busId}`);
    return response.data;
  },

  // ========== POSITIONS ==========
  async sendPosition(positionData) {
    const response = await api.post('/positions', positionData);
    return response.data;
  },

  async sendBulkPositions(positions) {
    const response = await api.post('/positions/bulk', { positions });
    return response.data;
  },

  // ========== OCCUPATION ==========
  async updateOccupancy(busId, passengerCount) {
    const response = await api.post('/occupancy', {
      bus_id: busId,
      passenger_count: passengerCount
    });
    return response.data;
  },

  async incrementOccupancy(busId) {
    const response = await api.post('/occupancy/increment', { bus_id: busId });
    return response.data;
  },

  async decrementOccupancy(busId) {
    const response = await api.post('/occupancy/decrement', { bus_id: busId });
    return response.data;
  },

  async resetOccupancy(busId) {
    const response = await api.post('/occupancy/reset', { bus_id: busId });
    return response.data;
  },

  async getBusOccupancy(busId) {
    const response = await api.get(`/occupancy/bus/${busId}`);
    return response.data;
  },

  // ========== SYSTÈME ==========
  async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  }
};

// Service d'authentification
export const authService = {
  async saveToken(token) {
    await AsyncStorage.setItem('driverToken', token);
  },

  async getToken() {
    return await AsyncStorage.getItem('driverToken');
  },

  async saveDriverData(driverData) {
    await AsyncStorage.setItem('driverData', JSON.stringify(driverData));
  },

  async getDriverData() {
    const data = await AsyncStorage.getItem('driverData');
    return data ? JSON.parse(data) : null;
  },

  async isLoggedIn() {
    const token = await this.getToken();
    return !!token;
  },

  async logout() {
    await AsyncStorage.multiRemove(['driverToken', 'driverData']);
  }
};

// Service de géolocalisation
export const locationService = {
  async saveLastPosition(position) {
    await AsyncStorage.setItem('lastPosition', JSON.stringify({
      ...position,
      timestamp: Date.now()
    }));
  },

  async getLastPosition() {
    const data = await AsyncStorage.getItem('lastPosition');
    return data ? JSON.parse(data) : null;
  },

  async savePendingPositions(positions) {
    await AsyncStorage.setItem('pendingPositions', JSON.stringify(positions));
  },

  async getPendingPositions() {
    const data = await AsyncStorage.getItem('pendingPositions');
    return data ? JSON.parse(data) : [];
  },

  async clearPendingPositions() {
    await AsyncStorage.removeItem('pendingPositions');
  }
};

// Configuration
export const CONFIG = {
  API_BASE_URL,
  GPS: {
    UPDATE_INTERVAL: 10000, // 10 secondes
    MIN_DISTANCE: 10, // 10 mètres
    ACCURACY_THRESHOLD: 50, // 50 mètres
    BATCH_SIZE: 10, // Nombre de positions à envoyer en lot
  },
  BACKGROUND: {
    TASK_NAME: 'background-location',
    MIN_INTERVAL: 15000, // 15 secondes minimum
  },
  NETWORK: {
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000, // 2 secondes
  }
};

export default api;
