import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BusMarker = ({ bus, onPress, size = 40 }) => {
  const getStatusColor = () => {
    if (!bus.is_in_service) return '#666';
    
    const occupancy = bus.current_occupancy?.capacity_percentage || 0;
    if (occupancy < 30) return '#4CAF50'; // Vert - peu occupé
    if (occupancy < 70) return '#FF9800'; // Orange - moyennement occupé
    return '#F44336'; // Rouge - très occupé
  };

  const getOccupancyLevel = () => {
    const occupancy = bus.current_occupancy?.capacity_percentage || 0;
    if (occupancy < 30) return '●';
    if (occupancy < 70) return '◐';
    return '●';
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { width: size, height: size }]}
      onPress={() => onPress && onPress(bus)}
    >
      <View style={[styles.busIcon, { backgroundColor: getStatusColor() }]}>
        <Ionicons 
          name="bus" 
          size={size * 0.6} 
          color="white" 
        />
        <Text style={[styles.busNumber, { fontSize: size * 0.25 }]}>
          {bus.number}
        </Text>
      </View>
      
      {bus.is_in_service && (
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.occupancyIndicator}>
            {getOccupancyLevel()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  busIcon: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: '100%',
    height: '100%',
  },
  busNumber: {
    color: 'white',
    fontWeight: 'bold',
    position: 'absolute',
    bottom: 2,
  },
  statusDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  occupancyIndicator: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  }
});

export default BusMarker;
