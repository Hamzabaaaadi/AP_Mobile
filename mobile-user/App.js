import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Import des écrans
import HomeScreen from './src/screens/HomeScreen';
import StopsScreen from './src/screens/StopsScreen';
import StopDetailsScreen from './src/screens/StopDetailsScreen';
import BusDetailsScreen from './src/screens/BusDetailsScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Navigation principale avec onglets
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Stops') {
            iconName = focused ? 'bus' : 'bus-outline';
          } else if (route.name === 'Favorites') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#e0e0e0',
          height: 60,
          paddingBottom: 5,
          paddingTop: 5,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          tabBarLabel: 'Carte',
          title: 'Carte des bus'
        }} 
      />
      <Tab.Screen 
        name="Stops" 
        component={StopsScreen} 
        options={{ 
          tabBarLabel: 'Arrêts',
          title: 'Arrêts de bus'
        }} 
      />
      <Tab.Screen 
        name="Favorites" 
        component={FavoritesScreen} 
        options={{ 
          tabBarLabel: 'Favoris',
          title: 'Mes favoris'
        }} 
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ 
          tabBarLabel: 'Paramètres',
          title: 'Paramètres'
        }} 
      />
    </Tab.Navigator>
  );
};

// Navigation Stack pour les écrans modals/détails
const RootStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabNavigator} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="StopDetails" 
        component={StopDetailsScreen} 
        options={{ 
          headerShown: false,
          presentation: 'card'
        }} 
      />
      <Stack.Screen 
        name="BusDetails" 
        component={BusDetailsScreen} 
        options={{ 
          headerShown: false,
          presentation: 'modal'
        }} 
      />
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <>
      <StatusBar style="auto" />
      <NavigationContainer>
        <RootStackNavigator />
      </NavigationContainer>
    </>
  );
}
