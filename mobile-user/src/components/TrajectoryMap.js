import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { apiService } from '../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function TrajectoryMap() {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draw, setDraw] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await apiService.getStops({ per_page: 200 });
        const list = res.stops || [];
        if (mounted) setStops(list);
      } catch (e) {
        console.warn('TrajectoryMap: failed to load stops', e);
        if (mounted) setStops([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return (
    <View style={styles.loading}><ActivityIndicator size="large" color="#2196F3" /></View>
  );

  if (!stops || stops.length === 0) return (
    <View style={styles.loading}><Text>Aucun arrêt disponible</Text></View>
  );

  const markers = stops.map(s => ({
    id: s.id,
    latitude: Number(s.latitude),
    longitude: Number(s.longitude),
    name: s.name || ''
  })).filter(m => !Number.isNaN(m.latitude) && !Number.isNaN(m.longitude));

  const first = markers[0];
  const last = markers[markers.length - 1];

  const initialRegion = first ? {
    latitude: first.latitude,
    longitude: first.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05
  } : {
    latitude: 0,
    longitude: 0,
    latitudeDelta: 1,
    longitudeDelta: 1
  };

  const polylineCoords = draw && first && last ? [
    { latitude: first.latitude, longitude: first.longitude },
    { latitude: last.latitude, longitude: last.longitude }
  ] : [];

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={initialRegion}>
        {markers.map(m => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            title={m.name}
          />
        ))}
        {polylineCoords.length > 0 && (
          <Polyline coordinates={polylineCoords} strokeColor="#FF0000" strokeWidth={3} />
        )}
      </MapView>

      <TouchableOpacity style={styles.fab} onPress={() => setDraw(d => !d)}>
        <Ionicons name={draw ? 'eye' : 'eye-off'} size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    backgroundColor: '#2196F3',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  }
});
