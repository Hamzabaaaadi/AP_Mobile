import React from 'react';
import { View, StyleSheet } from 'react-native';
import TrajectoryMap from '../components/TrajectoryMap';

export default function TrajectoryScreen() {
  return (
    <View style={styles.container}>
      <TrajectoryMap />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }
});
