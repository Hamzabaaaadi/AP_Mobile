import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { driverApi, locationService, CONFIG } from './api';

const BACKGROUND_LOCATION_TASK = CONFIG.BACKGROUND.TASK_NAME;

// Définition de la tâche en arrière-plan
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Erreur tâche localisation:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    await handleLocationUpdate(locations[0]);
  }
});

class LocationTrackingService {
  constructor() {
    this.isTracking = false;
    this.currentBusId = null;
    this.pendingPositions = [];
    this.locationSubscription = null;
    this.lastKnownPosition = null;
  }

  // Initialise le service de géolocalisation
  async initialize() {
    try {
      // Demande les permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission de localisation refusée');
      }

      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus.status !== 'granted') {
        console.warn('Permission de localisation en arrière-plan refusée');
      }

      // Charge les positions en attente
      this.pendingPositions = await locationService.getPendingPositions();
      
      return true;
    } catch (error) {
      console.error('Erreur initialisation géolocalisation:', error);
      return false;
    }
  }

  // Démarre le suivi de position pour un bus
  async startTracking(busId) {
    if (this.isTracking) {
      await this.stopTracking();
    }

    try {
      this.currentBusId = busId;
      this.isTracking = true;

      console.log(`Démarrage du suivi GPS pour le bus ${busId}`);

      // Suivi en premier plan
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: CONFIG.GPS.UPDATE_INTERVAL,
          distanceInterval: CONFIG.GPS.MIN_DISTANCE,
        },
        this.handleLocationUpdate.bind(this)
      );

      // Suivi en arrière-plan
      await this.startBackgroundTracking();

      return true;
    } catch (error) {
      console.error('Erreur démarrage suivi:', error);
      this.isTracking = false;
      return false;
    }
  }

  // Arrête le suivi de position
  async stopTracking() {
    try {
      this.isTracking = false;
      this.currentBusId = null;

      // Arrête le suivi en premier plan
      if (this.locationSubscription) {
        this.locationSubscription.remove();
        this.locationSubscription = null;
      }

      // Arrête le suivi en arrière-plan
      await this.stopBackgroundTracking();

      // Envoie les positions en attente
      await this.sendPendingPositions();

      console.log('Suivi GPS arrêté');
      return true;
    } catch (error) {
      console.error('Erreur arrêt suivi:', error);
      return false;
    }
  }

  // Démarre le suivi en arrière-plan
  async startBackgroundTracking() {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }

      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: CONFIG.BACKGROUND.MIN_INTERVAL,
        distanceInterval: CONFIG.GPS.MIN_DISTANCE,
        foregroundService: {
          notificationTitle: 'Bus Tracker',
          notificationBody: 'Suivi GPS actif',
          notificationColor: '#2196F3',
        },
      });

      console.log('Suivi en arrière-plan démarré');
    } catch (error) {
      console.error('Erreur suivi arrière-plan:', error);
    }
  }

  // Arrête le suivi en arrière-plan
  async stopBackgroundTracking() {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    } catch (error) {
      console.error('Erreur arrêt arrière-plan:', error);
    }
  }

  // Traite une mise à jour de position
  async handleLocationUpdate(location) {
    if (!this.currentBusId || !location) return;

    try {
      const position = {
        bus_id: this.currentBusId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        speed: (location.coords.speed || 0) * 3.6, // m/s vers km/h
        heading: location.coords.heading || 0,
        accuracy: location.coords.accuracy || 0,
        timestamp: new Date(location.timestamp).toISOString()
      };

      // Vérifie la qualité de la position
      if (!this.isPositionValid(position)) {
        console.warn('Position GPS invalide, ignorée');
        return;
      }

      this.lastKnownPosition = position;
      await locationService.saveLastPosition(position);

      // Tente d'envoyer immédiatement
      try {
        await driverApi.sendPosition(position);
        console.log('Position envoyée avec succès');
      } catch (error) {
        // En cas d'erreur réseau, stocke pour plus tard
        console.warn('Erreur envoi position, mise en attente:', error.message);
        this.pendingPositions.push(position);
        await this.savePendingPositions();
      }

    } catch (error) {
      console.error('Erreur traitement position:', error);
    }
  }

  // Vérifie si une position est valide
  isPositionValid(position) {
    // Vérifie les coordonnées
    if (!position.latitude || !position.longitude) return false;
    if (position.latitude < -90 || position.latitude > 90) return false;
    if (position.longitude < -180 || position.longitude > 180) return false;

    // Vérifie la précision
    if (position.accuracy > CONFIG.GPS.ACCURACY_THRESHOLD) return false;

    // Vérifie la distance par rapport à la dernière position
    if (this.lastKnownPosition) {
      const distance = this.calculateDistance(
        this.lastKnownPosition.latitude,
        this.lastKnownPosition.longitude,
        position.latitude,
        position.longitude
      );

      // Si la distance est trop grande, c'est probablement une erreur
      if (distance > 1000) return false; // Plus de 1 km
    }

    return true;
  }

  // Calcule la distance entre deux points
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Distance en mètres
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Envoie les positions en attente
  async sendPendingPositions() {
    if (this.pendingPositions.length === 0) return;

    try {
      console.log(`Envoi de ${this.pendingPositions.length} positions en attente`);
      
      // Envoie par lots
      const batchSize = CONFIG.GPS.BATCH_SIZE;
      for (let i = 0; i < this.pendingPositions.length; i += batchSize) {
        const batch = this.pendingPositions.slice(i, i + batchSize);
        
        try {
          await driverApi.sendBulkPositions(batch);
          console.log(`Lot de ${batch.length} positions envoyé`);
        } catch (error) {
          console.error('Erreur envoi lot:', error);
          // Garde les positions qui n'ont pas pu être envoyées
          return;
        }
      }

      // Nettoie les positions envoyées avec succès
      this.pendingPositions = [];
      await locationService.clearPendingPositions();
      
      console.log('Toutes les positions en attente ont été envoyées');
      
    } catch (error) {
      console.error('Erreur envoi positions en attente:', error);
    }
  }

  // Sauvegarde les positions en attente
  async savePendingPositions() {
    try {
      // Limite le nombre de positions stockées
      const maxPendingPositions = 100;
      if (this.pendingPositions.length > maxPendingPositions) {
        this.pendingPositions = this.pendingPositions.slice(-maxPendingPositions);
      }

      await locationService.savePendingPositions(this.pendingPositions);
    } catch (error) {
      console.error('Erreur sauvegarde positions:', error);
    }
  }

  // Obtient la position actuelle
  async getCurrentPosition() {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeoutMs: 10000,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };
    } catch (error) {
      console.error('Erreur obtention position:', error);
      return this.lastKnownPosition;
    }
  }

  // Getters
  get isActive() {
    return this.isTracking;
  }

  get busId() {
    return this.currentBusId;
  }

  get pendingCount() {
    return this.pendingPositions.length;
  }
}

// Fonction globale pour la tâche en arrière-plan
const handleLocationUpdate = async (location) => {
  if (locationTrackingService.isActive) {
    await locationTrackingService.handleLocationUpdate(location);
  }
};

// Instance singleton
const locationTrackingService = new LocationTrackingService();

export default locationTrackingService;
