import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { driverApi } from '../services/api';
import locationTrackingService from '../services/locationService';

const DashboardScreen = ({ navigation, driver }) => {
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [isInService, setIsInService] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState({
    isTracking: false,
    pendingPositions: 0,
    lastUpdate: null,
  });

  useFocusEffect(
    useCallback(() => {
      loadDriverBuses();
      updateTrackingStatus();
      
      // Mise à jour périodique du statut de suivi
      const interval = setInterval(updateTrackingStatus, 5000);
      return () => clearInterval(interval);
    }, [])
  );

  const loadDriverBuses = async () => {
    try {
      setRefreshing(true);
      const response = await driverApi.getDriverBuses(driver.id);
      setBuses(response.buses || []);
      
      // Sélectionne automatiquement le premier bus s'il n'y en a qu'un
      if (response.buses?.length === 1) {
        const bus = response.buses[0];
        setSelectedBus(bus);
        setIsInService(bus.is_in_service);
      }
    } catch (error) {
      console.error('Erreur chargement bus:', error);
      Alert.alert('Erreur', 'Impossible de charger vos bus assignés');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateTrackingStatus = () => {
    setTrackingStatus({
      isTracking: locationTrackingService.isActive,
      pendingPositions: locationTrackingService.pendingCount,
      lastUpdate: new Date().toLocaleTimeString(),
    });
  };

  const handleBusSelection = async (bus) => {
    if (trackingStatus.isTracking && selectedBus?.id !== bus.id) {
      Alert.alert(
        'Suivi en cours',
        'Vous devez arrêter le suivi GPS du bus actuel avant d\'en sélectionner un autre.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSelectedBus(bus);
    setIsInService(bus.is_in_service);
  };

  const toggleServiceStatus = async (newStatus) => {
    if (!selectedBus) {
      Alert.alert('Erreur', 'Veuillez sélectionner un bus');
      return;
    }

    try {
      await driverApi.updateBusStatus(selectedBus.id, newStatus);
      setIsInService(newStatus);
      
      // Met à jour le bus dans la liste
      setBuses(prev => prev.map(bus => 
        bus.id === selectedBus.id 
          ? { ...bus, is_in_service: newStatus }
          : bus
      ));

      if (newStatus) {
        // Démarre le suivi GPS
        const success = await locationTrackingService.startTracking(selectedBus.id);
        if (!success) {
          Alert.alert('Attention', 'Impossible de démarrer le suivi GPS');
        }
      } else {
        // Arrête le suivi GPS
        await locationTrackingService.stopTracking();
      }

      updateTrackingStatus();
      
    } catch (error) {
      console.error('Erreur changement statut:', error);
      Alert.alert('Erreur', 'Impossible de changer le statut du bus');
      setIsInService(!newStatus); // Revert le switch
    }
  };

  const goToOccupancy = () => {
    if (!selectedBus) {
      Alert.alert('Erreur', 'Veuillez sélectionner un bus');
      return;
    }
    navigation.navigate('Occupancy', { bus: selectedBus });
  };

  const goToRoute = () => {
    if (!selectedBus) {
      Alert.alert('Erreur', 'Veuillez sélectionner un bus');
      return;
    }
    navigation.navigate('Route', { bus: selectedBus });
  };

  const forceSync = async () => {
    try {
      await locationTrackingService.sendPendingPositions();
      updateTrackingStatus();
      Alert.alert('Succès', 'Synchronisation terminée');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de synchroniser les données');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Chargement du tableau de bord...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadDriverBuses} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Bonjour {driver.name}</Text>
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </Text>
      </View>

      {/* Sélection du bus */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mes bus</Text>
        {buses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bus-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Aucun bus assigné</Text>
            <Text style={styles.emptySubtext}>
              Contactez votre superviseur pour l'assignation d'un bus
            </Text>
          </View>
        ) : (
          buses.map((bus) => (
            <TouchableOpacity
              key={bus.id}
              style={[
                styles.busCard,
                selectedBus?.id === bus.id && styles.selectedBusCard
              ]}
              onPress={() => handleBusSelection(bus)}
            >
              <View style={styles.busCardHeader}>
                <Text style={styles.busNumber}>Bus {bus.number}</Text>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: bus.is_in_service ? '#4CAF50' : '#666' }
                ]} />
              </View>
              
              <Text style={styles.busDetails}>
                {bus.license_plate} • Capacité: {bus.capacity} places
              </Text>
              
              {bus.route && (
                <Text style={styles.routeInfo}>
                  Ligne {bus.route.number}: {bus.route.name}
                </Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>

      {selectedBus && (
        <>
          {/* Contrôle de service */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statut de service</Text>
            <View style={styles.serviceControl}>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceLabel}>
                  {isInService ? 'En service' : 'Hors service'}
                </Text>
                <Text style={styles.serviceSubtext}>
                  {isInService 
                    ? 'Les passagers peuvent voir ce bus' 
                    : 'Bus invisible pour les passagers'
                  }
                </Text>
              </View>
              <Switch
                value={isInService}
                onValueChange={toggleServiceStatus}
                trackColor={{ false: '#ccc', true: '#81C784' }}
                thumbColor={isInService ? '#4CAF50' : '#666'}
              />
            </View>
          </View>

          {/* Statut GPS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suivi GPS</Text>
            <View style={styles.gpsStatus}>
              <View style={styles.gpsIndicator}>
                <Ionicons 
                  name={trackingStatus.isTracking ? "radio" : "radio-outline"} 
                  size={24} 
                  color={trackingStatus.isTracking ? '#4CAF50' : '#666'} 
                />
                <Text style={[
                  styles.gpsText,
                  { color: trackingStatus.isTracking ? '#4CAF50' : '#666' }
                ]}>
                  {trackingStatus.isTracking ? 'Actif' : 'Inactif'}
                </Text>
              </View>
              
              {trackingStatus.pendingPositions > 0 && (
                <View style={styles.pendingIndicator}>
                  <Ionicons name="cloud-upload-outline" size={20} color="#FF9800" />
                  <Text style={styles.pendingText}>
                    {trackingStatus.pendingPositions} position(s) en attente
                  </Text>
                  <TouchableOpacity onPress={forceSync} style={styles.syncButton}>
                    <Text style={styles.syncButtonText}>Synchroniser</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {trackingStatus.lastUpdate && (
                <Text style={styles.lastUpdateText}>
                  Dernière vérification: {trackingStatus.lastUpdate}
                </Text>
              )}
            </View>
          </View>

          {/* Actions rapides */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions rapides</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity 
                style={[styles.actionCard, styles.occupancyCard]}
                onPress={goToOccupancy}
              >
                <Ionicons name="people" size={32} color="white" />
                <Text style={styles.actionTitle}>Occupation</Text>
                <Text style={styles.actionSubtitle}>Gérer les passagers</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionCard, styles.routeCard]}
                onPress={goToRoute}
              >
                <Ionicons name="map" size={32} color="white" />
                <Text style={styles.actionTitle}>Trajet</Text>
                <Text style={styles.actionSubtitle}>Voir la ligne</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* Informations utiles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💡 Rappels</Text>
        <View style={styles.tipCard}>
          <Text style={styles.tipText}>
            • Activez le service avant de commencer votre trajet
          </Text>
          <Text style={styles.tipText}>
            • Le GPS doit rester actif pour le suivi en temps réel
          </Text>
          <Text style={styles.tipText}>
            • Mettez à jour l'occupation régulièrement
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 24,
    paddingTop: 60,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  dateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  busCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  selectedBusCard: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  busCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  busNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  busDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  routeInfo: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  serviceControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  serviceSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  gpsStatus: {
    gap: 12,
  },
  gpsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gpsText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
  },
  pendingText: {
    flex: 1,
    fontSize: 14,
    color: '#F57C00',
  },
  syncButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  syncButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#999',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  occupancyCard: {
    backgroundColor: '#4CAF50',
  },
  routeCard: {
    backgroundColor: '#FF9800',
  },
  actionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  actionSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    textAlign: 'center',
  },
  tipCard: {
    backgroundColor: '#F3E5F5',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },
  tipText: {
    fontSize: 14,
    color: '#4A148C',
    lineHeight: 20,
    marginBottom: 4,
  },
});

export default DashboardScreen;
