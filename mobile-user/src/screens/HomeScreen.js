import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { apiService, CONFIG } from '../services/api';
import BusMarker from '../components/BusMarker';

const { width, height } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [region, setRegion] = useState(CONFIG.MAP.DEFAULT_REGION);
  const [userLocation, setUserLocation] = useState(null);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBus, setSelectedBus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const mapRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    initializeLocation();
    loadBuses();
    startAutoRefresh();

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'L\'accès à la localisation est nécessaire pour afficher votre position sur la carte.',
          [{ text: 'OK' }]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const userCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setUserLocation(userCoords);
      
      // Centre la carte sur la position de l'utilisateur
      const newRegion = {
        ...userCoords,
        latitudeDelta: CONFIG.MAP.ZOOM_LEVELS.DISTRICT,
        longitudeDelta: CONFIG.MAP.ZOOM_LEVELS.DISTRICT,
      };
      
      setRegion(newRegion);
      
    } catch (error) {
      console.error('Erreur localisation:', error);
      Alert.alert('Erreur', 'Impossible d\'obtenir votre position');
    }
  };

  const loadBuses = async () => {
    try {
      setRefreshing(true);
      
      // Charge les positions courantes (depuis la table `positions`) et construit les objets bus
      const resp = await apiService.getCurrentPositions();
      // resp.positions[] contient des objets { id, bus, latitude, longitude, ... }
      const positions = resp.positions || [];

      const busesFromPositions = positions.map((pos) => {
        const bus = pos.bus || {};
        // Conserve la structure attendue par le reste de l'app
        return {
          id: bus.id,
          number: bus.number,
          license_plate: bus.license_plate,
          capacity: bus.capacity,
          driver_id: bus.driver_id,
          current_route_id: bus.current_route_id,
          status: bus.status,
          is_in_service: bus.is_in_service,
          route: bus.route || null,
          driver: bus.driver || null,
          // position actuelle venue de la table positions
          current_position: {
            latitude: pos.latitude,
            longitude: pos.longitude,
            speed: pos.speed,
            heading: pos.heading,
            accuracy: pos.accuracy,
            timestamp: pos.timestamp
          },
          // occupation actuelle si présente
          current_occupancy: bus.current_occupancy || null
        };
      });

      setBuses(busesFromPositions);
      
    } catch (error) {
      console.error('Erreur chargement bus:', error);
      Alert.alert('Erreur', 'Impossible de charger les bus');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const startAutoRefresh = () => {
    refreshIntervalRef.current = setInterval(() => {
      loadBuses();
    }, CONFIG.REFRESH_INTERVALS.POSITIONS);
  };

  const handleBusPress = (bus) => {
    setSelectedBus(bus);
    
    // Centre la carte sur le bus sélectionné
    if (bus.current_position) {
      const busRegion = {
        latitude: bus.current_position.latitude,
        longitude: bus.current_position.longitude,
        latitudeDelta: CONFIG.MAP.ZOOM_LEVELS.STREET,
        longitudeDelta: CONFIG.MAP.ZOOM_LEVELS.STREET,
      };
      
      mapRef.current?.animateToRegion(busRegion, 1000);
    }
    
    // Navigation vers les détails du bus
    navigation.navigate('BusDetails', { bus });
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      const userRegion = {
        ...userLocation,
        latitudeDelta: CONFIG.MAP.ZOOM_LEVELS.DISTRICT,
        longitudeDelta: CONFIG.MAP.ZOOM_LEVELS.DISTRICT,
      };
      
      mapRef.current.animateToRegion(userRegion, 1000);
    } else {
      initializeLocation();
    }
  };

  const goToStops = () => {
    navigation.navigate('Stops');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Chargement de la carte...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {/* Marqueurs des bus */}
        {buses.map((bus) => (
          bus.current_position && (
            <Marker
              key={bus.id}
              coordinate={{
                latitude: bus.current_position.latitude,
                longitude: bus.current_position.longitude,
              }}
              tracksViewChanges={false}
            >
              <BusMarker 
                bus={bus} 
                onPress={handleBusPress}
                size={selectedBus?.id === bus.id ? 50 : 40}
              />
            </Marker>
          )
        ))}
      </MapView>

      {/* Boutons de contrôle */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={centerOnUser}
        >
          <Ionicons name="locate" size={24} color="#2196F3" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={loadBuses}
          disabled={refreshing}
        >
          <Ionicons 
            name="refresh" 
            size={24} 
            color={refreshing ? "#666" : "#2196F3"} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.controlButton}
          onPress={goToStops}
        >
          <Ionicons name="bus" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>

      {/* Informations en bas */}
      <View style={styles.bottomInfo}>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {buses.length} bus en service
          </Text>
          {refreshing && (
            <ActivityIndicator size="small" color="#2196F3" />
          )}
        </View>
        
        {selectedBus && (
          <View style={styles.selectedBusInfo}>
            <Text style={styles.selectedBusText}>
              Bus {selectedBus.number} - {selectedBus.route?.name || 'Ligne inconnue'}
            </Text>
            <TouchableOpacity 
              onPress={() => setSelectedBus(null)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Légende */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Occupation:</Text>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>Faible</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
          <Text style={styles.legendText}>Moyenne</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
          <Text style={styles.legendText}>Élevée</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  controls: {
    position: 'absolute',
    top: 60,
    right: 16,
    gap: 8,
  },
  controlButton: {
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    gap: 8,
  },
  statsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  selectedBusInfo: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedBusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  legend: {
    position: 'absolute',
    top: 60,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 8,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#333',
  },
});

export default HomeScreen;
