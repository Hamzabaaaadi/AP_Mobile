import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  TextInput,
  Modal,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService, userService } from '../services/api';

const StopsScreen = ({ navigation }) => {
  const [stops, setStops] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      const userIdData = await userService.getUserId();
      setUserId(userIdData);
      
      await Promise.all([
        loadStops(),
        loadFavorites(userIdData)
      ]);
    } catch (error) {
      console.error('Erreur initialisation:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const loadStops = async () => {
    try {
      const response = await apiService.getStops({
        search: searchQuery,
        per_page: 50
      });
      setStops(response.stops || []);
    } catch (error) {
      console.error('Erreur chargement arrêts:', error);
      throw error;
    }
  };

  const loadFavorites = async (userIdParam) => {
    try {
      const response = await apiService.getUserFavorites(userIdParam || userId);
      setFavorites(response.favorites || []);
    } catch (error) {
      console.error('Erreur chargement favoris:', error);
      // Ne pas lever l'erreur pour les favoris
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadStops(),
        loadFavorites()
      ]);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de actualiser les données');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      await loadStops();
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (stop) => {
    if (!userId) return;

    try {
      const isFavorite = favorites.some(fav => fav.stop_id === stop.id);
      
      if (isFavorite) {
        // Supprimer des favoris
        const favorite = favorites.find(fav => fav.stop_id === stop.id);
        await apiService.removeFavorite(favorite.id);
        setFavorites(prev => prev.filter(fav => fav.id !== favorite.id));
      } else {
        // Ajouter aux favoris
        const response = await apiService.addFavorite(userId, stop.id);
        setFavorites(prev => [...prev, response.favorite]);
      }
    } catch (error) {
      console.error('Erreur favoris:', error);
      Alert.alert('Erreur', 'Impossible de modifier les favoris');
    }
  };

  const handleStopPress = (stop) => {
    navigation.navigate('StopDetails', { stop });
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

  const isFavorite = (stopId) => {
    return favorites.some(fav => fav.stop_id === stopId);
  };

  const renderStop = ({ item: stop }) => (
    <TouchableOpacity 
      style={styles.stopItem}
      onPress={() => handleStopPress(stop)}
    >
      <View style={styles.stopHeader}>
        <View style={styles.stopInfo}>
          <Text style={styles.stopName}>{stop.name}</Text>
          {stop.address && (
            <Text style={styles.stopAddress}>{stop.address}</Text>
          )}
        </View>

        <TouchableOpacity 
          onPress={() => toggleFavorite(stop)}
          style={styles.favoriteButton}
        >
          <Ionicons 
            name={isFavorite(stop.id) ? "heart" : "heart-outline"} 
            size={24} 
            color={isFavorite(stop.id) ? "#F44336" : "#666"} 
          />
        </TouchableOpacity>
      </View>

      {stop.routes && stop.routes.length > 0 && (
        <View style={styles.routesContainer}>
          <Ionicons name="bus-outline" size={16} color="#666" />
          <Text style={styles.routesText}>
            Lignes: {stop.routes.map(route => route.number).join(', ')}
          </Text>
        </View>
      )}

        <View style={styles.stopFooter}>
        <View style={styles.typeContainer}>
          <View style={[
            styles.typeBadge, 
            { backgroundColor: stop.type === 'terminal' ? '#2196F3' : '#4CAF50' }
          ]}>
            <Text style={styles.typeText}>
              {stop.type === 'terminal' ? 'Terminal' : 'Arrêt'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => openInMaps(stop.latitude, stop.longitude, stop.name)}
            style={[styles.mapButton, { marginRight: 8 }]}
          >
            <Ionicons name="location" size={18} color="#2196F3" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handleStopPress(stop)}
            style={styles.detailsButton}
          >
            <Text style={styles.detailsButtonText}>Horaires</Text>
            <Ionicons name="chevron-forward" size={16} color="#2196F3" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFavorite = ({ item: favorite }) => (
    <TouchableOpacity 
      style={styles.favoriteItem}
      onPress={() => handleStopPress(favorite.stop)}
    >
      <View style={styles.favoriteHeader}>
        <Ionicons name="heart" size={20} color="#F44336" />
        <Text style={styles.favoriteName}>
          {favorite.nickname || favorite.stop.name}
        </Text>
      </View>
      
      {favorite.nickname && favorite.nickname !== favorite.stop.name && (
        <Text style={styles.favoriteRealName}>{favorite.stop.name}</Text>
      )}
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Chargement des arrêts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header avec recherche */}
      <View style={styles.header}>
        <Text style={styles.title}>Arrêts de bus</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => setShowSearch(!showSearch)}
            style={styles.searchButton}
          >
            <Ionicons name="search" size={24} color="#2196F3" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Trajectory')}
            style={[styles.searchButton, { marginLeft: 12 }]}
          >
            <Ionicons name="navigate" size={24} color="#2196F3" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barre de recherche */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un arrêt..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity onPress={handleSearch} style={styles.searchSubmit}>
            <Ionicons name="search" size={20} color="#2196F3" />
          </TouchableOpacity>
        </View>
      )}

      {/* Favoris (si disponibles) */}
      {favorites.length > 0 && (
        <View style={styles.favoritesSection}>
          <Text style={styles.sectionTitle}>Mes favoris</Text>
          <FlatList
            horizontal
            data={favorites}
            renderItem={renderFavorite}
            keyExtractor={(item) => item.id.toString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.favoritesList}
          />
        </View>
      )}

      {/* Liste des arrêts */}
      <FlatList
        data={stops}
        renderItem={renderStop}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2196F3']}
          />
        }
        contentContainerStyle={styles.stopsList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bus-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Aucun arrêt trouvé</Text>
            {searchQuery ? (
              <Text style={styles.emptySubtext}>
                Essayez une autre recherche
              </Text>
            ) : (
              <Text style={styles.emptySubtext}>
                Tirez vers le bas pour actualiser
              </Text>
            )}
          </View>
        }
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  searchButton: {
    padding: 8,
  },
  searchContainer: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  searchSubmit: {
    marginLeft: 8,
    padding: 8,
  },
  favoritesSection: {
    backgroundColor: 'white',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  favoritesList: {
    paddingHorizontal: 16,
  },
  favoriteItem: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    minWidth: 140,
    borderLeftWidth: 3,
    borderLeftColor: '#F44336',
  },
  favoriteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  favoriteName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
    flex: 1,
  },
  favoriteRealName: {
    fontSize: 12,
    color: '#666',
  },
  stopsList: {
    padding: 16,
  },
  stopItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  stopAddress: {
    fontSize: 14,
    color: '#666',
  },
  favoriteButton: {
    padding: 4,
  },
  routesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  routesText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  stopFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeContainer: {
    flexDirection: 'row',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  mapButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  detailsButtonText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
    marginRight: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default StopsScreen;
