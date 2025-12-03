import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Import des services
import { authService } from './src/services/api';
import locationTrackingService from './src/services/locationService';

// Import des écrans
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import OccupancyScreen from './src/screens/OccupancyScreen';
import RouteScreen from './src/screens/RouteScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [driver, setDriver] = useState(null);

  useEffect(() => {
    checkAuthStatus();
    initializeServices();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const isAuthenticated = await authService.isLoggedIn();
      
      if (isAuthenticated) {
        const driverData = await authService.getDriverData();
        if (driverData) {
          setDriver(driverData);
          setIsLoggedIn(true);
        }
      }
    } catch (error) {
      console.error('Erreur vérification auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeServices = async () => {
    try {
      // Initialise le service de géolocalisation
      await locationTrackingService.initialize();
    } catch (error) {
      console.error('Erreur initialisation services:', error);
    }
  };

  const handleLogin = (driverData) => {
    setDriver(driverData);
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    try {
      // Arrête le suivi GPS s'il est actif
      await locationTrackingService.stopTracking();
      
      // Nettoie les données d'authentification
      await authService.logout();
      
      setDriver(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Initialisation...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isLoggedIn ? (
            // Stack d'authentification
            <>
              <Stack.Screen name="Login">
                {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
              </Stack.Screen>
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          ) : (
            // Stack principal de l'application
            <>
              <Stack.Screen name="Dashboard">
                {(props) => (
                  <DashboardScreen 
                    {...props} 
                    driver={driver} 
                    onLogout={handleLogout} 
                  />
                )}
              </Stack.Screen>
              
              <Stack.Screen 
                name="Occupancy" 
                component={OccupancyScreen}
                options={{
                  headerShown: true,
                  title: 'Gestion Occupation',
                  headerStyle: { backgroundColor: '#4CAF50' },
                  headerTintColor: 'white',
                  headerTitleStyle: { fontWeight: 'bold' },
                }}
              />
              
              <Stack.Screen 
                name="Route" 
                component={RouteScreen}
                options={{
                  headerShown: true,
                  title: 'Trajet et Ligne',
                  headerStyle: { backgroundColor: '#FF9800' },
                  headerTintColor: 'white',
                  headerTitleStyle: { fontWeight: 'bold' },
                }}
              />
              
              <Stack.Screen 
                name="Profile">
                {(props) => (
                  <ProfileScreen 
                    {...props} 
                    driver={driver} 
                    onLogout={handleLogout} 
                  />
                )}
              </Stack.Screen>
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
