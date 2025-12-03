import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const formatETA = (etaMinutes) => {
  if (etaMinutes < 1) return "Maintenant";
  if (etaMinutes === 1) return "1 min";
  if (etaMinutes < 60) return `${etaMinutes} min`;
  
  const hours = Math.floor(etaMinutes / 60);
  const minutes = etaMinutes % 60;
  return minutes > 0 ? `${hours}h${minutes.toString().padStart(2, '0')}` : `${hours}h`;
};

const getOccupancyColor = (percentage) => {
  if (percentage < 30) return '#4CAF50';
  if (percentage < 70) return '#FF9800';
  return '#F44336';
};

const getOccupancyIcon = (percentage) => {
  if (percentage < 30) return 'people-outline';
  if (percentage < 70) return 'people';
  return 'people';
};

const BusCard = ({ bus, prediction, onPress, style }) => {
  const occupancy = bus.current_occupancy?.capacity_percentage || 0;
  const passengerCount = bus.current_occupancy?.passenger_count || 0;

  return (
    <TouchableOpacity 
      style={[styles.container, style]}
      onPress={() => onPress && onPress(bus)}
    >
      <View style={styles.header}>
        <View style={styles.busInfo}>
          <Text style={styles.busNumber}>Bus {bus.number}</Text>
          {bus.route && (
            <Text style={styles.routeName}>{bus.route.name}</Text>
          )}
        </View>
        
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusDot, 
            { backgroundColor: bus.is_in_service ? '#4CAF50' : '#666' }
          ]} />
          <Text style={styles.statusText}>
            {bus.is_in_service ? 'En service' : 'Hors service'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {prediction && (
          <View style={styles.etaContainer}>
            <Ionicons name="time-outline" size={20} color="#2196F3" />
            <Text style={styles.etaText}>
              Arrivée dans {formatETA(prediction.eta_minutes)}
            </Text>
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceText}>
                {Math.round(prediction.confidence * 100)}%
              </Text>
            </View>
          </View>
        )}

        <View style={styles.occupancyContainer}>
          <Ionicons 
            name={getOccupancyIcon(occupancy)} 
            size={18} 
            color={getOccupancyColor(occupancy)} 
          />
          <Text style={[styles.occupancyText, { color: getOccupancyColor(occupancy) }]}>
            {passengerCount}/{bus.capacity} places
          </Text>
          <View style={styles.occupancyBar}>
            <View 
              style={[
                styles.occupancyFill,
                { 
                  width: Math.min(occupancy, 100) + '%',
                  backgroundColor: getOccupancyColor(occupancy)
                }
              ]} 
            />
          </View>
          <Text style={styles.occupancyPercentage}>
            {Math.round(occupancy)}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  busInfo: {
    flex: 1,
  },
  busNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  routeName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  content: {
    gap: 12,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  etaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
    flex: 1,
  },
  confidenceContainer: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  occupancyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  occupancyText: {
    fontSize: 14,
    fontWeight: '500',
    minWidth: 80,
  },
  occupancyBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  occupancyFill: {
    height: '100%',
    borderRadius: 3,
  },
  occupancyPercentage: {
    fontSize: 12,
    color: '#666',
    minWidth: 35,
    textAlign: 'right',
  },
});

export default BusCard;
