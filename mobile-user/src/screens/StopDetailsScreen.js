import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal
} from 'react-native';
import { Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService, userService } from '../services/api';
import BusCard from '../components/BusCard';

const StopDetailsScreen = ({ route, navigation }) => {
  const { stop } = route.params;
  
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [showNicknameModal, setShowNicknameModal] = useState(false);

  useEffect(() => {
    initializeData();
    
    // Actualisation automatique des prédictions
    const interval = setInterval(loadPredictions, 30000); // 30 secondes
    
    return () => clearInterval(interval);
  }, []);

  const initializeData = async () => {
    try {
      const userIdData = await userService.getUserId();
      setUserId(userIdData);
      
      await Promise.all([
        loadPredictions(),
        checkFavoriteStatus(userIdData)
      ]);
    } catch (error) {
      console.error('Erreur initialisation:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPredictions = async () => {
    try {
      const response = await apiService.getStopPredictions(stop.id);
      setPredictions(response.predictions || []);
    } catch (error) {
      console.error('Erreur chargement prédictions:', error);
      if (!refreshing) {
        Alert.alert('Erreur', 'Impossible de charger les prédictions');
      }
    }
  };

  const checkFavoriteStatus = async (userIdParam) => {
    try {
      const response = await apiService.getUserFavorites(userIdParam || userId);
      const favorite = response.favorites?.find(fav => fav.stop_id === stop.id);
      
      if (favorite) {
        setIsFavorite(true);
        setFavoriteId(favorite.id);
      }
    } catch (error) {
      console.error('Erreur vérification favoris:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadPredictions();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'actualiser les prédictions');
    } finally {
      setRefreshing(false);
    }
  };

  const toggleFavorite = async () => {
    if (!userId) return;

    try {
      if (isFavorite) {
        // Supprimer des favoris
        await apiService.removeFavorite(favoriteId);
        setIsFavorite(false);
        setFavoriteId(null);
      } else {
        // Ajouter aux favoris
        const response = await apiService.addFavorite(userId, stop.id);
        setIsFavorite(true);
        setFavoriteId(response.favorite.id);
      }
    } catch (error) {
      console.error('Erreur favoris:', error);
      Alert.alert('Erreur', 'Impossible de modifier les favoris');
    }
  };

  const handleBusPress = (bus) => {
    navigation.navigate('BusDetails', { bus });
  };

  const openInMaps = (lat, lon, label) => {
    if (!lat || !lon) {
      Alert.alert('Coordonnées manquantes', 'Impossible d\'ouvrir la position : coordonnées indisponibles.');
      return;
    }
    const query = `${lat},${lon}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        return Linking.openURL(url);
      } else {
        Alert.alert('Erreur', 'Impossible d\'ouvrir Google Maps.');
      }
    }).catch(err => {
      console.error('Linking error', err);
      Alert.alert('Erreur', 'Impossible d\'ouvrir Google Maps.');
    });
  };

  const formatLastUpdate = () => {
    const now = new Date();
    return `Dernière mise à jour: ${now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Chargement des horaires...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.stopName}>{stop.name}</Text>
          {stop.address && (
            <Text style={styles.stopAddress}>{stop.address}</Text>
          )}
        </View>

        <TouchableOpacity 
          onPress={toggleFavorite}
          style={styles.favoriteButton}
        >
          <Ionicons 
            name={isFavorite ? "heart" : "heart-outline"} 
            size={28} 
            color={isFavorite ? "#F44336" : "#666"} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2196F3']}
          />
        }
      >
        {/* Informations de l'arrêt */}
        <View style={styles.stopInfoSection}>
          <TouchableOpacity style={styles.infoRow} onPress={() => openInMaps(stop.latitude, stop.longitude, stop.name)}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={[styles.infoText, { textDecorationLine: 'underline' }]}>
              {stop.latitude?.toFixed(6)}, {stop.longitude?.toFixed(6)}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.infoRow}>
            <Ionicons name="bus-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              {stop.type === 'terminal' ? 'Terminal' : 'Arrêt régulier'}
            </Text>
          </View>

          {stop.routes && stop.routes.length > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="swap-horizontal" size={20} color="#666" />
              <Text style={styles.infoText}>
                Lignes: {stop.routes.map(route => route.number).join(', ')}
              </Text>
            </View>
          )}
        </View>

        {/* Prédictions d'arrivée */}
        <View style={styles.predictionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Prochains bus</Text>
            <Text style={styles.lastUpdate}>
              {formatLastUpdate()}
            </Text>
          </View>

          {predictions.length === 0 ? (
            <View style={styles.noPredictions}>
              <Ionicons name="time-outline" size={48} color="#ccc" />
              <Text style={styles.noPredictionsText}>
                Aucun bus prévu
              </Text>
              <Text style={styles.noPredictionsSubtext}>
                Tirez vers le bas pour actualiser
              </Text>
            </View>
          ) : (
            predictions.map((prediction) => (
              <BusCard
                key={`${prediction.bus_id}-${prediction.id}`}
                bus={prediction.bus}
                prediction={prediction}
                onPress={handleBusPress}
                style={styles.busCard}
              />
            ))
          )}
        </View>

        {/* Conseils */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Conseils</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipText}>
              • Les horaires sont des prédictions basées sur la position en temps réel
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipText}>
              • La couleur indique le niveau d'occupation du bus
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipText}>
              • Ajoutez cet arrêt à vos favoris pour un accès rapide
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Actions flottantes */}
      <View style={styles.floatingActions}>
        <TouchableOpacity 
          onPress={handleRefresh}
          style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
          disabled={refreshing}
        >
          <Ionicons 
            name="refresh" 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => navigation.navigate('Home')}
          style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
        >
          <Ionicons name="map" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
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
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  stopAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  favoriteButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  stopInfoSection: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  predictionsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  lastUpdate: {
    fontSize: 12,
    color: '#666',
  },
  busCard: {
    marginBottom: 8,
  },
  noPredictions: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  noPredictionsText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '500',
  },
  noPredictionsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  tipsSection: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  tipItem: {
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  floatingActions: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    gap: 8,
  },
  actionButton: {
    borderRadius: 28,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default StopDetailsScreen;
