import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function BusDetailsScreen({ route }) {
  const { busId } = route?.params || {};
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Détails du bus</Text>
      <Text>Bus ID: {busId ?? 'N/A'}</Text>
      <Text>Cet écran est un placeholder minimal.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
});
