import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

export default function OccupancyScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gestion de l'occupation</Text>
      <Text>Contrôles d'occupation (placeholder).</Text>
      <Button title="Retour" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
});
