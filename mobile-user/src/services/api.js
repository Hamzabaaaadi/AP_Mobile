import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration de base
// Utiliser l'adresse LAN de votre PC pour permettre l'accès depuis le téléphone (Wi‑Fi)
// REMARQUE: mis à jour automatiquement par l'agent — utilisez l'IP affichée par `ipconfig` si besoin
const API_BASE_URL = 'http://100.76.24.205:5000/api'; // LAN IP mise à jour

// Instance Axios avec configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor pour ajouter le token automatiquement
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor pour gérer les erreurs de réponse
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Erreur réseau (pas de réponse) -> message utilisateur clair
    if (!error.response) {
      error.message = `NetworkError: impossible de joindre l'API (${API_BASE_URL}). Vérifiez que votre téléphone est connecté au même réseau Wi‑Fi que l'ordinateur, que le serveur est démarré et que le port 5000 est autorisé par le pare-feu.`;
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      // Token expiré, nettoyer le storage
      await AsyncStorage.removeItem('userToken');
    }

    return Promise.reject(error);
  }
);

// Services API
export const apiService = {
  // ========== BUSES ==========
  async getBuses(params = {}) {
    const response = await api.get('/buses', { params });
    return response.data;
  },

  async getBus(busId) {
    const response = await api.get(`/buses/${busId}`);
    return response.data;
  },

  async getActiveBuses() {
    const response = await api.get('/buses/active');
    return response.data;
  },

  async getBusPositions(busId, limit = 10) {
    const response = await api.get(`/buses/${busId}/positions`, {
      params: { limit }
    });
    return response.data;
  },

  // ========== STOPS ==========
  async getStops(params = {}) {
    const response = await api.get('/stops', { params });
    return response.data;
  },

  async getStop(stopId) {
    const response = await api.get(`/stops/${stopId}`);
    return response.data;
  },

  async getNearbyStops(latitude, longitude, radius = 1.0) {
    const response = await api.get('/stops/nearby', {
      params: { latitude, longitude, radius }
    });
    return response.data;
  },

  async getStopPredictions(stopId) {
    const response = await api.get(`/stops/${stopId}/predictions`);
    return response.data;
  },

  // ========== FAVORITES ==========
  async getUserFavorites(userId) {
    const response = await api.get(`/stops/favorites/${userId}`);
    return response.data;
  },

  async addFavorite(userId, stopId, nickname = null) {
    const response = await api.post('/stops/favorites', {
      user_id: userId,
      stop_id: stopId,
      nickname
    });
    return response.data;
  },

  async removeFavorite(favoriteId) {
    const response = await api.delete(`/stops/favorites/${favoriteId}`);
    return response.data;
  },

  // ========== POSITIONS ==========
  async getCurrentPositions() {
    const response = await api.get('/positions/current');
    return response.data;
  },

  async getBusTrack(busId, hours = 2) {
    const response = await api.get(`/positions/bus/${busId}/track`, {
      params: { hours }
    });
    return response.data;
  },

  // ========== OCCUPANCY ==========
  async getBusOccupancy(busId) {
    const response = await api.get(`/occupancy/bus/${busId}/current`);
    return response.data;
  },

  async getOccupancyStats() {
    const response = await api.get('/occupancy/stats');
    return response.data;
  },

  // ========== SYSTEM ==========
  async getSystemStats() {
    const response = await api.get('/stats');
    return response.data;
  },

  async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  }
};

// Gestion du User ID unique
export const userService = {
  async getUserId() {
    let userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      // Génère un ID unique basé sur timestamp + random
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('userId', userId);
    }
    return userId;
  },

  async clearUserData() {
    await AsyncStorage.multiRemove(['userId', 'userToken', 'userFavorites']);
  }
};

// Utilitaires de cache
export const cacheService = {
  async setCache(key, data, ttlMinutes = 5) {
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    };
    await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
  },

  async getCache(key) {
    try {
      const cached = await AsyncStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const isExpired = Date.now() - cacheData.timestamp > cacheData.ttl;

      if (isExpired) {
        await AsyncStorage.removeItem(`cache_${key}`);
        return null;
      }

      return cacheData.data;
    } catch {
      return null;
    }
  },

  async clearCache() {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith('cache_'));
    await AsyncStorage.multiRemove(cacheKeys);
  }
};

// Configuration et constantes
export const CONFIG = {
  API_BASE_URL,
  REFRESH_INTERVALS: {
    POSITIONS: 10000, // 10 secondes
    PREDICTIONS: 30000, // 30 secondes
    OCCUPANCY: 15000, // 15 secondes
  },
  MAP: {
    DEFAULT_REGION: {
      latitude: 43.6047,
      longitude: 1.4442,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    },
    ZOOM_LEVELS: {
      CITY: 0.1,
      DISTRICT: 0.05,
      STREET: 0.01,
    }
  }
};

export default api;
