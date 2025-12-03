import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

export default function ProfileScreen({ navigation, driver, onLogout }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profil Chauffeur</Text>
      <Text>{driver ? driver.name : 'Pas connecté'}</Text>
      <Button title="Déconnexion" onPress={onLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
});
